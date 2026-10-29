from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Sensor, SensorReading, Zone, Complaint, Incident, IncidentEvidence, IncidentEvent, Notification, AuditLog
)
from app.data.demo_dataset import seed_demo_data
from app.engine.priority_model import priority_model

router = APIRouter(prefix="/api/demo", tags=["demo"])

@router.post("/reset")
def reset_demo_state(db: Session = Depends(get_db)):
    """
    Resets simulated demonstration records and restores clean initial demonstration state.
    """
    res = seed_demo_data(db, force_reset=True)
    return {"status": "success", "message": "Demonstration environment reset and re-seeded successfully"}

@router.post("/scenario/{scenario_name}")
def trigger_scenario(scenario_name: str, db: Session = Depends(get_db)):
    """
    Triggers one of the 6 deterministic hackathon scenarios:
    - 'leak': Scenario A (Correlated main pipe leak)
    - 'sensor_fault': Scenario B (Frozen sensor telemetry fault)
    - 'water_quality': Scenario C (Elevated turbidity with laboratory verification)
    - 'duplicate_complaints': Scenario D (Repeated citizen complaints deduplication)
    - 'missing_data': Scenario E (Insufficient evidence flagged)
    - 'contradictory': Scenario F (Uncorroborated anomaly lowering confidence)
    """
    now = datetime.utcnow()

    if scenario_name == "leak":
        zone = db.query(Zone).filter(Zone.name == "North Metro").first()
        p_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "pressure").first()
        f_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "flow_rate").first()

        if p_sen:
            p_sen.last_reading_value = 18.5
            db.add(SensorReading(
                sensor_id=p_sen.id, observed_at=now, value=18.5, unit="psi", quality_status="valid", is_simulated=True
            ))
        if f_sen:
            f_sen.last_reading_value = 76.0
            db.add(SensorReading(
                sensor_id=f_sen.id, observed_at=now, value=76.0, unit="m3/h", quality_status="valid", is_simulated=True
            ))

        db.add(Complaint(
            reporter_name="Girish Patil", reporter_contact="+91 99887 66554", is_anonymous=False,
            category="water_leakage", description="Major road flooding and bubbling water near North Metro station.",
            zone_id=zone.id, latitude=zone.center_lat + 0.001, longitude=zone.center_lng + 0.001,
            verification_status="verified_true", is_simulated=True, created_at=now
        ))

        p_calc = priority_model.calculate_priority("pipe_leak", 0.95, 0.90, 0.2, False, "HIGH")

        inc = Incident(
            title="CRITICAL: Verified Pipe Burst — North Metro",
            category="pipe_leak",
            zone_id=zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="HIGH",
            status="NEW",
            first_observed_at=now,
            last_observed_at=now,
            hypothesis="Severe main burst: Pressure plummeted to 18.5 psi with flow surge to 76 m3/h and active street flooding.",
            recommended_action="Emergency isolate section between valves V-N2-01 and V-N2-08.",
            is_simulated=True
        )
        db.add(inc)
        db.flush()

        db.add(IncidentEvidence(
            incident_id=inc.id, source_type="sensor", source_record_id=p_sen.external_sensor_id,
            evidence_summary="PRESSURE dropped to 18.5 psi (Critical minimum breached).", evidence_quality="HIGH"
        ))
        db.add(Notification(
            recipient_role="officer", incident_id=inc.id, title="EMERGENCY LEAK: North Metro",
            message="Pressure down to 18.5 psi. Immediate field deployment advised.", priority="CRITICAL"
        ))

        db.commit()
        return {"status": "success", "scenario": "Scenario A: Main Pipe Leak triggered", "incident_id": inc.id}

    elif scenario_name == "sensor_fault":
        zone = db.query(Zone).filter(Zone.name == "Central District").first()
        cond_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "conductivity").first()
        if cond_sen:
            cond_sen.health_status = "frozen"
            cond_sen.last_reading_value = 320.0
            # Insert 5 identical readings to prove flatline
            for i in range(5):
                db.add(SensorReading(
                    sensor_id=cond_sen.id, observed_at=now - timedelta(minutes=5 * i),
                    value=320.0, unit="uS/cm", quality_status="frozen", is_simulated=True
                ))

        p_calc = priority_model.calculate_priority("sensor_fault", 0.4, 0.0, 0.5, True, "HIGH")

        inc = Incident(
            title="Instrumentation Alert: Conductivity Probe Flatline — Central District",
            category="sensor_fault",
            zone_id=zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="HIGH",
            status="NEW",
            first_observed_at=now - timedelta(minutes=25),
            last_observed_at=now,
            hypothesis="Sensor Probe Flatline: Sensor SEN-ZONE-C1-COND has reported 320.0 uS/cm without variation across 5 reading cycles. Zero citizen complaints. Telemetry/probe issue, NOT an infrastructure leak.",
            recommended_action="Dispatch SCADA instrument technician to recalibrate probe and check analog-to-digital converter.",
            contradictory_evidence="Neighbors sensors (pH, turbidity, pressure) operating completely normally.",
            is_simulated=True
        )
        db.add(inc)
        db.flush()

        db.add(IncidentEvidence(
            incident_id=inc.id, source_type="sensor", source_record_id=cond_sen.external_sensor_id if cond_sen else "SEN-COND",
            evidence_summary="CONDUCTIVITY probe flatlined across 5 consecutive cycles. Probe fouled or frozen.",
            evidence_quality="HIGH"
        ))
        db.add(Notification(
            recipient_role="monitoring_team", incident_id=inc.id,
            title="Sensor Health Fault: Central District Probe",
            message="Conductivity probe has flatlined. Routed to instrumentation maintenance team.",
            priority="LOW"
        ))
        db.commit()
        return {"status": "success", "scenario": "Scenario B: Sensor Flatline Fault triggered", "incident_id": inc.id}

    elif scenario_name == "water_quality":
        zone = db.query(Zone).filter(Zone.name == "West Hills").first()
        ph_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "ph").first()
        turb_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "turbidity").first()

        if turb_sen:
            turb_sen.last_reading_value = 5.2
            db.add(SensorReading(
                sensor_id=turb_sen.id, observed_at=now, value=5.2, unit="NTU", quality_status="valid", is_simulated=True
            ))

        db.add(Complaint(
            reporter_name="Meera Sundaram", reporter_contact="+91 91234 56789", is_anonymous=False,
            category="discolored_water", description="Tap water has a yellowish tint and slight earthy odor.",
            zone_id=zone.id, latitude=zone.center_lat, longitude=zone.center_lng,
            verification_status="pending", is_simulated=True, created_at=now
        ))

        p_calc = priority_model.calculate_priority("water_quality", 0.90, 0.50, 0.1, False, "MEDIUM")

        inc = Incident(
            title="Water Quality Screening: Turbidity Elevated — West Hills",
            category="water_quality",
            zone_id=zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="MEDIUM",
            status="NEW",
            first_observed_at=now,
            last_observed_at=now,
            hypothesis="Suspected Water Quality Anomaly in West Hills: Turbidity reached 5.2 NTU with citizen discoloration complaint. Disclaimer: Screening alert only; does not confirm contamination or establish potability without certified lab testing.",
            recommended_action="Collect sterile 1L grab samples at pump station outlet for certified microbiological and particulate analysis.",
            missing_info="Physical sample grab needed to confirm whether water is compliant with potable standards.",
            is_simulated=True
        )
        db.add(inc)
        db.flush()

        db.add(Notification(
            recipient_role="quality_analyst", incident_id=inc.id,
            title="WATER QUALITY ALERT: West Hills Turbidity 5.2 NTU",
            message="Turbidity screening exceeded 5.0 NTU. Sample collection and lab culture required.",
            priority="HIGH"
        ))
        db.commit()
        return {"status": "success", "scenario": "Scenario C: Water Quality Screening triggered", "incident_id": inc.id}

    elif scenario_name == "duplicate_complaints":
        zone = db.query(Zone).filter(Zone.name == "East Valley").first()
        # Add 4 complaints from same citizen
        for i in range(4):
            db.add(Complaint(
                reporter_name="Vikram Joshi",
                reporter_contact="+91 98800 12345",
                is_anonymous=False,
                category="low_pressure",
                description="Low water pressure on 4th floor, please fix urgently!",
                zone_id=zone.id,
                latitude=zone.center_lat,
                longitude=zone.center_lng,
                verification_status="grouped_duplicate" if i > 0 else "pending",
                is_simulated=True,
                created_at=now - timedelta(minutes=5 * i)
            ))
        db.commit()
        return {
            "status": "success",
            "scenario": "Scenario D: Duplicate Citizen Complaints triggered",
            "message": "Submitted 4 duplicate complaints. System will group and deduplicate them to avoid artificial score inflation."
        }

    elif scenario_name == "missing_data":
        zone = db.query(Zone).filter(Zone.name == "South Industrial").first()
        p_sen = db.query(Sensor).filter(Sensor.zone_id == zone.id, Sensor.measurement_type == "pressure").first()
        if p_sen:
            p_sen.last_reading_value = 34.0
            db.add(SensorReading(
                sensor_id=p_sen.id, observed_at=now, value=34.0, unit="psi", quality_status="valid", is_simulated=True
            ))

        p_calc = priority_model.calculate_priority("pipe_leak", 0.50, 0.0, 0.1, False, "LOW")

        inc = Incident(
            title="Low Confidence Pressure Drop — South Industrial",
            category="pipe_leak",
            zone_id=zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="LOW",
            status="NEW",
            first_observed_at=now,
            last_observed_at=now,
            hypothesis="Unverified Pressure Anomaly: Moderate pressure drop (34 psi) detected with zero supporting citizen complaints and no downstream flow meter active.",
            recommended_action="Verify downstream valve statuses remotely before dispatching field crews.",
            missing_info="Flow rate telemetry offline; zero citizen corroborating reports.",
            is_simulated=True
        )
        db.add(inc)
        db.commit()
        return {"status": "success", "scenario": "Scenario E: Missing Data / Low Confidence triggered", "incident_id": inc.id}

    elif scenario_name == "contradictory":
        zone = db.query(Zone).filter(Zone.name == "Central District").first()
        p_calc = priority_model.calculate_priority("pipe_leak", 0.60, 0.0, 0.1, False, "LOW")

        inc = Incident(
            title="Contradictory Telemetry: Single Spike — Central District",
            category="unclassified",
            zone_id=zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="LOW",
            status="NEW",
            first_observed_at=now,
            last_observed_at=now,
            hypothesis="Isolated Flow Anomaly with Stable Pressure: Flow spiked briefly to 55 m3/h, but trunk main pressure remained completely constant at 52 psi and zero leakage was reported.",
            recommended_action="Log as scheduled commercial filling cycle; no maintenance action needed unless sustained.",
            contradictory_evidence="Flow surge unsupported by pressure drop or citizen complaints. Likely scheduled batch consumption.",
            is_simulated=True
        )
        db.add(inc)
        db.commit()
        return {"status": "success", "scenario": "Scenario F: Contradictory Evidence triggered", "incident_id": inc.id}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown scenario '{scenario_name}'")
