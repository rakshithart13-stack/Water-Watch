from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.database import get_db
from app.models import Incident, IncidentEvidence, IncidentEvent, Notification, Profile, Zone, Complaint
from app.schemas import (
    IncidentOut, IncidentAssignRequest, IncidentStatusUpdateRequest, IncidentEventCreate, IncidentEventOut
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# Allowed State Machine transitions
VALID_TRANSITIONS = {
    "NEW": ["TRIAGED", "ASSIGNED", "CLOSED"],
    "TRIAGED": ["ASSIGNED", "INVESTIGATING", "CLOSED"],
    "ASSIGNED": ["INVESTIGATING", "AWAITING_SAMPLE", "AWAITING_REPAIR", "RESOLVED"],
    "INVESTIGATING": ["AWAITING_SAMPLE", "AWAITING_REPAIR", "RESOLVED", "CLOSED"],
    "AWAITING_SAMPLE": ["INVESTIGATING", "RESOLVED", "CLOSED"],
    "AWAITING_REPAIR": ["INVESTIGATING", "RESOLVED", "CLOSED"],
    "RESOLVED": ["CLOSED", "INVESTIGATING"], # INVESTIGATING if reopened
    "CLOSED": ["INVESTIGATING"]              # INVESTIGATING if reopened with reason
}

def enrich_incident(inc: Incident) -> dict:
    d = {c.name: getattr(inc, c.name) for c in inc.__table__.columns}
    d["zone_name"] = inc.zone.name if inc.zone else "Unknown Zone"
    d["evidence_items"] = inc.evidence_items
    d["events"] = sorted(inc.events, key=lambda e: e.created_at)
    d["complaints"] = inc.complaints
    return d

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    zone_id: Optional[str] = None,
    min_priority: Optional[float] = None,
    sort_by: str = Query("priority", regex="^(priority|created_at|status)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Incident.title.ilike(search_fmt)) | (Incident.hypothesis.ilike(search_fmt)))
    if category:
        query = query.filter(Incident.category == category)
    if status:
        query = query.filter(Incident.status == status)
    if zone_id:
        query = query.filter(Incident.zone_id == zone_id)
    if min_priority is not None:
        query = query.filter(Incident.priority_score >= min_priority)

    if sort_by == "priority":
        query = query.order_by(desc(Incident.priority_score) if sort_order == "desc" else asc(Incident.priority_score))
    elif sort_by == "created_at":
        query = query.order_by(desc(Incident.created_at) if sort_order == "desc" else asc(Incident.created_at))
    else:
        query = query.order_by(asc(Incident.status) if sort_order == "asc" else desc(Incident.status))

    incidents = query.all()
    return [enrich_incident(inc) for inc in incidents]

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return enrich_incident(incident)

@router.post("/{incident_id}/assign", response_model=IncidentOut)
def assign_incident(incident_id: str, payload: IncidentAssignRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    prev_status = incident.status
    incident.assigned_officer_id = payload.officer_id
    incident.assigned_officer_name = payload.officer_name
    incident.status = "ASSIGNED"
    incident.updated_at = datetime.utcnow()

    # Timeline event
    db.add(IncidentEvent(
        incident_id=incident.id,
        actor_name=payload.officer_name,
        event_type="ASSIGNED",
        previous_status=prev_status,
        new_status="ASSIGNED",
        note=payload.note or f"Assigned to officer {payload.officer_name}."
    ))

    # Notification to officer
    db.add(Notification(
        recipient_id=payload.officer_id,
        recipient_role="officer",
        incident_id=incident.id,
        title=f"Incident Assigned: {incident.title}",
        message=f"You have been assigned to incident #{incident.id[:8]} in {incident.zone.name if incident.zone else 'Zone'}.",
        priority="HIGH",
        channel="in_app"
    ))

    db.commit()
    db.refresh(incident)
    return enrich_incident(incident)

@router.post("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(incident_id: str, payload: IncidentStatusUpdateRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    current_status = incident.status
    target_status = payload.new_status.upper()

    # State Machine Validation
    allowed = VALID_TRANSITIONS.get(current_status, [])
    if target_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid lifecycle transition from '{current_status}' to '{target_status}'. Allowed: {allowed}"
        )

    # Reopening check
    if current_status in ["RESOLVED", "CLOSED"] and target_status in ["INVESTIGATING", "ASSIGNED"]:
        if not payload.reopen_reason:
            raise HTTPException(status_code=400, detail="Reopening an incident requires a documented 'reopen_reason'")
        incident.reopen_reason = payload.reopen_reason

    # Closure check
    if target_status in ["RESOLVED", "CLOSED"]:
        incident.closed_at = datetime.utcnow()
        if payload.closure_notes:
            incident.closure_notes = payload.closure_notes

    incident.status = target_status
    incident.updated_at = datetime.utcnow()

    # Add Event
    event_type = "STATUS_CHANGED"
    if target_status == "RESOLVED":
        event_type = "RESOLVED"
    elif target_status == "CLOSED":
        event_type = "CLOSED"
    elif current_status in ["RESOLVED", "CLOSED"]:
        event_type = "REOPENED"

    db.add(IncidentEvent(
        incident_id=incident.id,
        actor_name=payload.actor_name,
        event_type=event_type,
        previous_status=current_status,
        new_status=target_status,
        note=payload.note or payload.closure_notes or payload.reopen_reason or f"Status changed to {target_status}"
    ))

    db.commit()
    db.refresh(incident)
    return enrich_incident(incident)

@router.post("/{incident_id}/events", response_model=IncidentEventOut)
def add_incident_event(incident_id: str, payload: IncidentEventCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    event = IncidentEvent(
        incident_id=incident.id,
        actor_id=payload.actor_id,
        actor_name=payload.actor_name,
        event_type=payload.event_type,
        previous_status=incident.status,
        new_status=incident.status,
        note=payload.note
    )
    db.add(event)
    incident.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event
