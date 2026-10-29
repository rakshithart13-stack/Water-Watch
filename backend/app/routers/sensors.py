from datetime import datetime
from typing import List, Optional
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Sensor, SensorReading, Zone, AuditLog
from app.schemas import SensorOut, SensorReadingCreate, SensorReadingOut
from app.engine.validation import validate_reading_record

router = APIRouter(prefix="/api/sensors", tags=["sensors"])

def enrich_sensor(s: Sensor) -> dict:
    d = {col.name: getattr(s, col.name) for col in s.__table__.columns}
    d["zone_name"] = s.zone.name if s.zone else "Unknown Zone"
    return d

@router.get("", response_model=List[SensorOut])
def list_sensors(
    zone_id: Optional[str] = None,
    measurement_type: Optional[str] = None,
    health_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Sensor)
    if zone_id:
        q = q.filter(Sensor.zone_id == zone_id)
    if measurement_type:
        q = q.filter(Sensor.measurement_type == measurement_type)
    if health_status:
        q = q.filter(Sensor.health_status == health_status)

    sensors = q.all()
    return [enrich_sensor(s) for s in sensors]

@router.get("/{sensor_id}/readings", response_model=List[SensorReadingOut])
def get_sensor_readings(sensor_id: str, limit: int = 48, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        sensor = db.query(Sensor).filter(Sensor.external_sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    readings = db.query(SensorReading).filter(
        SensorReading.sensor_id == sensor.id
    ).order_by(SensorReading.observed_at.asc()).limit(limit).all()

    return readings

@router.post("/{sensor_id}/readings", response_model=SensorReadingOut)
def record_sensor_reading(sensor_id: str, payload: SensorReadingCreate, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        sensor = db.query(Sensor).filter(Sensor.external_sensor_id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    # Fetch recent readings to test frozen/flatline
    recent = db.query(SensorReading.value).filter(
        SensorReading.sensor_id == sensor.id
    ).order_by(SensorReading.observed_at.desc()).limit(5).all()
    recent_vals = [r[0] for r in reversed(recent)]

    q_status, reason = validate_reading_record(
        measurement_type=sensor.measurement_type,
        value=payload.value,
        unit=payload.unit,
        observed_at=payload.observed_at,
        recent_readings=recent_vals
    )

    reading = SensorReading(
        sensor_id=sensor.id,
        observed_at=payload.observed_at or datetime.utcnow(),
        value=payload.value,
        unit=payload.unit,
        quality_status=q_status,
        ingestion_source=payload.ingestion_source,
        is_simulated=True
    )
    db.add(reading)

    sensor.last_reading_value = payload.value
    sensor.last_seen_at = payload.observed_at or datetime.utcnow()
    if q_status == "frozen":
        sensor.health_status = "frozen"
    elif q_status == "valid" and sensor.health_status == "frozen":
        sensor.health_status = "healthy"

    db.commit()
    db.refresh(reading)
    return reading

@router.post("/import")
async def import_sensors_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    imported_count = 0
    errors = []

    for row_idx, row in enumerate(reader):
        ext_id = row.get("external_sensor_id")
        name = row.get("name")
        m_type = row.get("measurement_type")
        unit = row.get("unit")
        zone_code = row.get("zone_code")

        if not ext_id or not m_type or not unit:
            errors.append(f"Row {row_idx + 1}: Missing required sensor fields")
            continue

        existing = db.query(Sensor).filter(Sensor.external_sensor_id == ext_id).first()
        if existing:
            continue

        zone = db.query(Zone).filter((Zone.code == zone_code) | (Zone.name == zone_code)).first()
        if not zone:
            zone = db.query(Zone).first()

        try:
            min_op = float(row.get("min_operational", 0))
            max_op = float(row.get("max_operational", 100))
            lat = float(row.get("lat", zone.center_lat))
            lng = float(row.get("lng", zone.center_lng))
        except ValueError:
            min_op, max_op, lat, lng = 0, 100, zone.center_lat, zone.center_lng

        sensor = Sensor(
            external_sensor_id=ext_id,
            zone_id=zone.id,
            name=name or f"{m_type.title()} Sensor",
            measurement_type=m_type,
            unit=unit,
            lat=lat,
            lng=lng,
            min_operational=min_op,
            max_operational=max_op,
            health_status="healthy",
            is_active=True
        )
        db.add(sensor)
        imported_count += 1

    db.commit()
    return {"status": "success", "imported_count": imported_count, "errors": errors}
