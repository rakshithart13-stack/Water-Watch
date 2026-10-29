from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Sensor, SensorReading, Zone, Complaint, Sample, Incident,
    IncidentEvidence, IncidentEvent, Notification, ThresholdConfig
)
from app.engine.anomaly_detector import detector
from app.engine.complaint_correlator import correlator
from app.engine.evidence_fusion import fusion_engine
from app.engine.priority_model import priority_model

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])

@router.post("/run")
def run_anomaly_pipeline(db: Session = Depends(get_db)):
    """
    Executes the multi-source evidence fusion pipeline across all monitored zones.
    Detects sensor anomalies, correlates complaints, fuses evidence, calculates priority,
    and updates/generates incidents.
    """
    zones = db.query(Zone).all()
    results = []
    now = datetime.utcnow()

    for zone in zones:
        sensors = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.is_active == True).all()
        sensor_anomalies = []
        is_any_sensor_frozen = False

        for sensor in sensors:
            # Read last 30 readings for robust baseline
            readings = db.query(SensorReading.value).filter(
                SensorReading.sensor_id == sensor.id
            ).order_by(SensorReading.observed_at.desc()).limit(30).all()
            history = [r[0] for r in reversed(readings)]
            cur_val = sensor.last_reading_value or (history[-1] if history else 0.0)

            # Check threshold config override
            tc = db.query(ThresholdConfig).filter(ThresholdConfig.measurement_type == sensor.measurement_type).first()
            thresh_dict = None
            if tc:
                thresh_dict = {
                    "min_normal": tc.min_normal,
                    "max_normal": tc.max_normal,
                    "warning_low": tc.warning_low,
                    "warning_high": tc.warning_high,
                    "critical_low": tc.critical_low,
                    "critical_high": tc.critical_high,
                    "standard": tc.standard_reference
                }

            det_res = detector.detect_single_sensor(
                measurement_type=sensor.measurement_type,
                current_value=cur_val,
                history=history,
                configured_threshold=thresh_dict
            )
            det_res["sensor_id"] = sensor.external_sensor_id
            det_res["sensor_name"] = sensor.name

            if sensor.health_status in ["frozen", "offline"]:
                is_any_sensor_frozen = True

            if det_res["is_anomaly"]:
                sensor_anomalies.append(det_res)

        # Correlate recent complaints in zone (last 24 hours)
        recent_complaints = db.query(Complaint).filter(
            Complaint.zone_id == zone.id,
            Complaint.created_at >= now - timedelta(hours=24)
        ).all()
        complaint_dicts = [
            {
                "id": c.id,
                "reporter_name": c.reporter_name,
                "category": c.category,
                "description": c.description,
                "zone_id": c.zone_id,
                "created_at": c.created_at
            }
            for c in recent_complaints
        ]
        corr_res = correlator.correlate_complaints(complaint_dicts, target_zone_id=zone.id)

        # Recent physical samples
        samples = db.query(Sample).filter(
            Sample.zone_id == zone.id,
            Sample.collected_at >= now - timedelta(hours=48)
        ).all()
        sample_dicts = [
            {
                "id": s.id,
                "result_status": s.result_status,
                "measurement_values": s.measurement_values,
                "laboratory_reference": s.laboratory_reference
            }
            for s in samples
        ]

        health_status = "frozen" if is_any_sensor_frozen else "healthy"

        # Multi-Source Evidence Fusion
        fused = fusion_engine.fuse_evidence(
            zone_name=zone.name,
            sensor_anomalies=sensor_anomalies,
            complaint_correlation=corr_res,
            sample_records=sample_dicts,
            sensor_health_status=health_status
        )

        # Calculate Priority Score
        p_calc = priority_model.calculate_priority(
            category=fused["category"],
            anomaly_strength=fused["sensor_anomaly_strength"],
            corroboration_score=fused["corroboration_score"],
            age_hours=1.0,
            is_sensor_fault=fused["has_sensor_fault"],
            confidence_category=fused["confidence_category"]
        )

        zone_summary = {
            "zone_id": zone.id,
            "zone_name": zone.name,
            "zone_code": zone.code,
            "anomalies_detected_count": len(sensor_anomalies),
            "sensor_anomalies": sensor_anomalies,
            "complaint_correlation": corr_res,
            "fusion": fused,
            "priority": p_calc
        }
        results.append(zone_summary)

    return {
        "status": "success",
        "timestamp": now.isoformat(),
        "zones_analyzed": len(zones),
        "evaluation_summary": results
    }

@router.get("/explain/{incident_id}")
def explain_incident(incident_id: str, db: Session = Depends(get_db)):
    """
    Returns deep explainable intelligence breakdown for an incident:
    observed vs expected, baseline stats, sensor time-series, corroborating evidence,
    mathematical priority score breakdown, and recommended next action.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    zone = incident.zone
    evidence_items = incident.evidence_items
    events = incident.events
    complaints = incident.complaints

    # Fetch sensors in this zone
    sensors = db.query(Sensor).filter(Sensor.zone_id == incident.zone_id).all()
    sensor_details = []
    for s in sensors:
        readings = db.query(SensorReading).filter(
            SensorReading.sensor_id == s.id
        ).order_by(SensorReading.observed_at.desc()).limit(20).all()
        vals = [r.value for r in readings]
        sensor_details.append({
            "sensor_id": s.external_sensor_id,
            "name": s.name,
            "measurement_type": s.measurement_type,
            "unit": s.unit,
            "last_value": s.last_reading_value,
            "health_status": s.health_status,
            "min_operational": s.min_operational,
            "max_operational": s.max_operational,
            "recent_series": [{"time": r.observed_at.strftime("%H:%M"), "value": r.value} for r in reversed(readings)]
        })

    # Priority breakdown calculation
    p_breakdown = priority_model.calculate_priority(
        category=incident.category,
        anomaly_strength=0.85 if incident.priority_score >= 70 else 0.5,
        corroboration_score=min(1.0, len(complaints) / 3.0),
        age_hours=(datetime.utcnow() - incident.first_observed_at).total_seconds() / 3600.0,
        is_sensor_fault=(incident.category == "sensor_fault"),
        confidence_category=incident.confidence_category
    )

    return {
        "incident_id": incident.id,
        "title": incident.title,
        "category": incident.category,
        "zone_name": zone.name if zone else "Unknown",
        "priority_score": incident.priority_score,
        "confidence_category": incident.confidence_category,
        "status": incident.status,
        "assigned_officer": incident.assigned_officer_name or "Unassigned",
        "first_observed_at": incident.first_observed_at,
        "last_observed_at": incident.last_observed_at,
        "hypothesis": incident.hypothesis,
        "recommended_action": incident.recommended_action,
        "missing_info": incident.missing_info,
        "contradictory_evidence": incident.contradictory_evidence,
        "evidence_items": [
            {
                "id": e.id,
                "source_type": e.source_type,
                "source_record_id": e.source_record_id,
                "evidence_summary": e.evidence_summary,
                "evidence_quality": e.evidence_quality,
                "metrics_snapshot": e.metrics_snapshot
            }
            for e in evidence_items
        ],
        "events": [
            {
                "actor_name": ev.actor_name,
                "event_type": ev.event_type,
                "previous_status": ev.previous_status,
                "new_status": ev.new_status,
                "note": ev.note,
                "created_at": ev.created_at
            }
            for ev in events
        ],
        "complaints": [
            {
                "id": c.id,
                "reporter_name": c.reporter_name,
                "category": c.category,
                "description": c.description,
                "created_at": c.created_at,
                "verification_status": c.verification_status
            }
            for c in complaints
        ],
        "zone_sensors": sensor_details,
        "priority_breakdown": p_breakdown
    }
