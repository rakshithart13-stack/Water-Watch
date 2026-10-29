from datetime import datetime
from typing import List, Optional
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Sample, Incident, IncidentEvent, Zone, AuditLog
from app.schemas import SampleCreate, SampleOut

router = APIRouter(prefix="/api/samples", tags=["samples"])

@router.post("", response_model=SampleOut)
def record_sample(payload: SampleCreate, db: Session = Depends(get_db)):
    sample = Sample(
        zone_id=payload.zone_id,
        collected_at=payload.collected_at or datetime.utcnow(),
        collected_by=payload.collected_by,
        measurement_values=payload.measurement_values,
        units=payload.units,
        result_status=payload.result_status or "pending_lab",
        laboratory_reference=payload.laboratory_reference,
        incident_id=payload.incident_id,
        notes=payload.notes
    )
    db.add(sample)

    if payload.incident_id:
        incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
        if incident:
            db.add(IncidentEvent(
                incident_id=incident.id,
                actor_name=payload.collected_by,
                event_type="SAMPLE_COLLECTED",
                previous_status=incident.status,
                new_status=incident.status,
                note=f"Physical grab sample collected by {payload.collected_by}. Lab Ref: {payload.laboratory_reference or 'Pending'}."
            ))

    db.commit()
    db.refresh(sample)
    return sample

@router.get("", response_model=List[SampleOut])
def list_samples(incident_id: Optional[str] = None, zone_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Sample)
    if incident_id:
        q = q.filter(Sample.incident_id == incident_id)
    if zone_id:
        q = q.filter(Sample.zone_id == zone_id)
    return q.order_by(Sample.collected_at.desc()).all()

@router.patch("/{sample_id}/result", response_model=SampleOut)
def update_lab_result(
    sample_id: str,
    result_status: str,
    lab_ref: str,
    notes: Optional[str] = None,
    verified_by: str = "Lab Microbiologist",
    db: Session = Depends(get_db)
):
    valid_statuses = ["verified_acceptable", "verified_anomalous", "inconclusive"]
    if result_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"result_status must be one of: {valid_statuses}")

    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    sample.result_status = result_status
    sample.laboratory_reference = lab_ref
    if notes:
        sample.notes = (sample.notes or "") + f"\n[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] Lab Note: {notes}"

    if sample.incident_id:
        incident = db.query(Incident).filter(Incident.id == sample.incident_id).first()
        if incident:
            db.add(IncidentEvent(
                incident_id=incident.id,
                actor_name=verified_by,
                event_type="LAB_RESULT_RECORDED",
                previous_status=incident.status,
                new_status=incident.status,
                note=f"Certified Lab Result entered: {result_status.upper()} (Ref: {lab_ref}). {notes or ''}"
            ))

    db.commit()
    db.refresh(sample)
    return sample
