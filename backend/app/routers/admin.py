import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Profile, Zone, Sensor, ThresholdConfig, AuditLog
from app.schemas import ProfileOut, ProfileCreate, ZoneOut, ZoneCreate, ThresholdConfigOut

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Profiles
@router.get("/profiles", response_model=List[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(Profile).all()

@router.post("/profiles", response_model=ProfileOut)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    p = Profile(
        display_name=payload.display_name,
        role=payload.role,
        email=payload.email,
        assigned_zone=payload.assigned_zone
    )
    db.add(p)
    db.add(AuditLog(
        actor_name="Administrator",
        actor_role="admin",
        action="CREATE_PROFILE",
        target_type="profile",
        details={"name": payload.display_name, "role": payload.role}
    ))
    db.commit()
    db.refresh(p)
    return p

# Zones
@router.get("/zones", response_model=List[ZoneOut])
def list_zones(db: Session = Depends(get_db)):
    return db.query(Zone).all()

@router.post("/zones", response_model=ZoneOut)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db)):
    z = Zone(
        name=payload.name,
        code=payload.code,
        description=payload.description,
        center_lat=payload.center_lat,
        center_lng=payload.center_lng,
        radius_meters=payload.radius_meters
    )
    db.add(z)
    db.commit()
    db.refresh(z)
    return z

# Thresholds
@router.get("/thresholds", response_model=List[ThresholdConfigOut])
def list_thresholds(db: Session = Depends(get_db)):
    return db.query(ThresholdConfig).all()

@router.put("/thresholds/{threshold_id}", response_model=ThresholdConfigOut)
def update_threshold(
    threshold_id: str,
    warning_low: float,
    warning_high: float,
    critical_low: float,
    critical_high: float,
    db: Session = Depends(get_db)
):
    tc = db.query(ThresholdConfig).filter(ThresholdConfig.id == threshold_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Threshold configuration not found")

    tc.warning_low = warning_low
    tc.warning_high = warning_high
    tc.critical_low = critical_low
    tc.critical_high = critical_high
    tc.updated_at = datetime.utcnow()

    db.add(AuditLog(
        actor_name="Administrator",
        actor_role="admin",
        action="UPDATE_THRESHOLD_CONFIG",
        target_type="threshold_config",
        target_id=tc.id,
        details={"measurement_type": tc.measurement_type, "critical_bounds": [critical_low, critical_high]}
    ))

    db.commit()
    db.refresh(tc)
    return tc

# Audit logs
@router.get("/audit-logs")
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "actor_name": l.actor_name,
            "actor_role": l.actor_role,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "details": l.details,
            "timestamp": l.created_at
        }
        for l in logs
    ]

# CSV Sample downloads
@router.get("/download-csv/{file_name}")
def download_sample_csv(file_name: str):
    valid_files = [
        "sensor_readings.csv",
        "citizen_complaints.csv",
        "water_quality_samples.csv",
        "sensor_metadata.csv"
    ]
    if file_name not in valid_files:
        raise HTTPException(status_code=400, detail="Invalid sample file requested")

    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_csvs", file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not generated yet")

    return FileResponse(file_path, media_type="text/csv", filename=file_name)
