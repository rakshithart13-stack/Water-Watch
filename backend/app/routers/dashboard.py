from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Incident, Sensor, Complaint, SensorReading
from app.schemas import DashboardSummary
from app.config import settings

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    active_statuses = ["NEW", "TRIAGED", "ASSIGNED", "INVESTIGATING", "AWAITING_SAMPLE", "AWAITING_REPAIR"]
    
    total_active = db.query(Incident).filter(Incident.status.in_(active_statuses)).count()
    critical_incidents = db.query(Incident).filter(
        Incident.status.in_(active_statuses),
        Incident.priority_score >= 75.0
    ).count()
    high_incidents = db.query(Incident).filter(
        Incident.status.in_(active_statuses),
        Incident.priority_score >= 50.0,
        Incident.priority_score < 75.0
    ).count()

    total_sensors = db.query(Sensor).count()
    healthy_sensors = db.query(Sensor).filter(Sensor.health_status == "healthy").count()

    # New anomalies in last 24h
    cutoff_24h = datetime.utcnow() - timedelta(hours=24)
    new_anomalies = db.query(Incident).filter(Incident.created_at >= cutoff_24h).count()

    complaints_pending = db.query(Complaint).filter(Complaint.verification_status == "pending").count()
    resolved_count = db.query(Incident).filter(Incident.status == "RESOLVED").count()
    closed_count = db.query(Incident).filter(Incident.status == "CLOSED").count()

    # Incidents by Category
    cat_counts = db.query(Incident.category, func.count(Incident.id)).group_by(Incident.category).all()
    incidents_by_category = [{"category": c or "unclassified", "count": count} for c, count in cat_counts]

    # Incidents by Severity / Priority Bands
    crit_count = db.query(Incident).filter(Incident.priority_score >= 75.0).count()
    high_band_count = db.query(Incident).filter(Incident.priority_score >= 50.0, Incident.priority_score < 75.0).count()
    med_count = db.query(Incident).filter(Incident.priority_score >= 25.0, Incident.priority_score < 50.0).count()
    low_count = db.query(Incident).filter(Incident.priority_score < 25.0).count()
    
    incidents_by_severity = [
        {"severity": "Critical (75-100)", "count": crit_count, "color": "#EF4444"},
        {"severity": "High (50-74)", "count": high_band_count, "color": "#F5A623"},
        {"severity": "Medium (25-49)", "count": med_count, "color": "#4EA8FF"},
        {"severity": "Low (0-24)", "count": low_count, "color": "#22C55E"}
    ]

    # Incident trends over last 7 days
    trends = []
    for d in range(6, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=d)
        day_end = day_start + timedelta(days=1)
        cnt = db.query(Incident).filter(Incident.created_at >= day_start, Incident.created_at < day_end).count()
        complaint_cnt = db.query(Complaint).filter(Complaint.created_at >= day_start, Complaint.created_at < day_end).count()
        trends.append({
            "date": day_start.strftime("%b %d"),
            "incidents": cnt,
            "complaints": complaint_cnt
        })

    last_reading = db.query(SensorReading.observed_at).order_by(SensorReading.observed_at.desc()).first()
    last_sync = last_reading[0] if last_reading else datetime.utcnow()

    return {
        "total_active_incidents": total_active,
        "critical_incidents": critical_incidents,
        "high_priority_incidents": high_incidents,
        "new_anomalies_detected": new_anomalies,
        "healthy_sensors": healthy_sensors,
        "total_sensors": total_sensors,
        "complaints_awaiting_review": complaints_pending,
        "resolved_incidents": resolved_count,
        "closed_incidents": closed_count,
        "last_data_sync": last_sync,
        "is_demo_mode": settings.IS_DEMO_MODE,
        "incident_trends": trends,
        "incidents_by_category": incidents_by_category,
        "incidents_by_severity": incidents_by_severity
    }
