from datetime import datetime
from typing import List, Optional
import io
import csv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Complaint, Zone, Incident, AuditLog
from app.schemas import ComplaintCreate, ComplaintOut

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

def enrich_complaint(c: Complaint) -> dict:
    d = {col.name: getattr(c, col.name) for col in c.__table__.columns}
    d["zone_name"] = c.zone.name if c.zone else "Unknown Zone"
    return d

@router.post("", response_model=ComplaintOut)
def submit_complaint(payload: ComplaintCreate, db: Session = Depends(get_db)):
    zone = db.query(Zone).filter(Zone.id == payload.zone_id).first()
    if not zone:
        # Check if zone_id was provided as zone name or code
        zone = db.query(Zone).filter((Zone.name == payload.zone_id) | (Zone.code == payload.zone_id)).first()
        if not zone:
            raise HTTPException(status_code=400, detail="Invalid zone specified")

    complaint = Complaint(
        reporter_name=payload.reporter_name or "Anonymous Citizen",
        reporter_contact=payload.reporter_contact,
        is_anonymous=payload.is_anonymous,
        category=payload.category,
        description=payload.description,
        zone_id=zone.id,
        latitude=payload.latitude or zone.center_lat,
        longitude=payload.longitude or zone.center_lng,
        verification_status="pending",
        attachment_url=payload.attachment_url,
        is_simulated=True
    )
    db.add(complaint)

    # Audit log
    db.add(AuditLog(
        actor_name=payload.reporter_name or "Anonymous Citizen",
        actor_role="citizen",
        action="SUBMIT_COMPLAINT",
        target_type="complaint",
        target_id=complaint.id,
        details={"category": payload.category, "zone": zone.name}
    ))

    db.commit()
    db.refresh(complaint)
    return enrich_complaint(complaint)

@router.get("", response_model=List[ComplaintOut])
def list_complaints(
    category: Optional[str] = None,
    verification_status: Optional[str] = None,
    zone_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Complaint)
    if category:
        q = q.filter(Complaint.category == category)
    if verification_status:
        q = q.filter(Complaint.verification_status == verification_status)
    if zone_id:
        q = q.filter(Complaint.zone_id == zone_id)

    complaints = q.order_by(Complaint.created_at.desc()).all()
    return [enrich_complaint(c) for c in complaints]

@router.patch("/{complaint_id}/verify")
def verify_complaint(
    complaint_id: str,
    status: str,
    verified_by: str = "Field Officer",
    db: Session = Depends(get_db)
):
    valid_statuses = ["verified_true", "verified_false", "grouped_duplicate"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.verification_status = status
    db.add(AuditLog(
        actor_name=verified_by,
        actor_role="officer",
        action="VERIFY_COMPLAINT",
        target_type="complaint",
        target_id=complaint.id,
        details={"new_status": status}
    ))

    db.commit()
    return {"status": "success", "complaint_id": complaint_id, "verification_status": status}

@router.post("/import")
async def import_complaints_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(decoded))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    imported_count = 0
    errors = []
    
    for row_idx, row in enumerate(reader):
        category = row.get("category")
        description = row.get("description")
        zone_code = row.get("zone_code")

        if not category or not description:
            errors.append(f"Row {row_idx + 1}: Missing required 'category' or 'description'")
            continue

        zone = db.query(Zone).filter((Zone.code == zone_code) | (Zone.name == zone_code)).first()
        if not zone:
            zone = db.query(Zone).first()

        try:
            lat = float(row.get("latitude")) if row.get("latitude") else zone.center_lat
            lng = float(row.get("longitude")) if row.get("longitude") else zone.center_lng
        except ValueError:
            lat, lng = zone.center_lat, zone.center_lng

        c = Complaint(
            reporter_name=row.get("reporter_name", "Anonymous Citizen"),
            reporter_contact=row.get("reporter_contact", ""),
            category=category,
            description=description,
            zone_id=zone.id,
            latitude=lat,
            longitude=lng,
            verification_status="pending",
            is_simulated=True
        )
        db.add(c)
        imported_count += 1

    db.commit()
    return {
        "status": "success",
        "imported_count": imported_count,
        "errors": errors
    }
