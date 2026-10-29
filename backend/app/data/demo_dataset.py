import os
import csv
import json
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.models import (
    Profile, Zone, Sensor, SensorReading, Complaint, Sample,
    Incident, IncidentEvidence, IncidentEvent, Notification, AuditLog, ThresholdConfig
)
from app.engine.baseline import DEFAULT_OPERATIONAL_THRESHOLDS
from app.engine.priority_model import priority_model

DEMO_ZONES = [
    {"name": "Central District", "code": "ZONE-C1", "description": "High-density commercial and residential core", "center_lat": 12.9716, "center_lng": 77.5946},
    {"name": "North Metro", "code": "ZONE-N2", "description": "Urban distribution corridor and high-rise apartments", "center_lat": 13.0358, "center_lng": 77.5970},
    {"name": "East Valley", "code": "ZONE-E3", "description": "Suburban residential district and educational hub", "center_lat": 12.9784, "center_lng": 77.6408},
    {"name": "West Hills", "code": "ZONE-W4", "description": "Elevated residential sector with booster pump stations", "center_lat": 12.9601, "center_lng": 77.5385},
    {"name": "South Industrial", "code": "ZONE-S5", "description": "Industrial manufacturing hub with heavy water volume usage", "center_lat": 12.9141, "center_lng": 77.6109}
]

DEMO_PROFILES = [
    {"display_name": "Rajesh Kumar", "role": "officer", "email": "rajesh.k@waterwatch.gov", "assigned_zone": "Central District"},
    {"display_name": "Priya Sharma", "role": "quality_analyst", "email": "priya.s@waterwatch.gov", "assigned_zone": "East Valley"},
    {"display_name": "Arun Verma", "role": "officer", "email": "arun.v@waterwatch.gov", "assigned_zone": "North Metro"},
    {"display_name": "Dr. Sunita Patel", "role": "admin", "email": "sunita.p@waterwatch.gov", "assigned_zone": "All Zones"}
]

def seed_threshold_configs(db: Session):
    for m_type, cfg in DEFAULT_OPERATIONAL_THRESHOLDS.items():
        existing = db.query(ThresholdConfig).filter(ThresholdConfig.measurement_type == m_type).first()
        if not existing:
            db.add(ThresholdConfig(
                measurement_type=m_type,
                unit=cfg["unit"],
                min_normal=cfg["min_normal"],
                max_normal=cfg["max_normal"],
                warning_low=cfg["warning_low"],
                warning_high=cfg["warning_high"],
                critical_low=cfg["critical_low"],
                critical_high=cfg["critical_high"],
                standard_reference=cfg["standard"],
                description=f"Standard baseline for {m_type} monitoring."
            ))
    db.commit()

def seed_demo_data(db: Session, force_reset: bool = False):
    """
    Clears simulated records (if force_reset=True) and populates realistic demo environment.
    """
    if force_reset:
        db.query(IncidentEvent).delete()
        db.query(IncidentEvidence).delete()
        db.query(Notification).delete()
        db.query(Sample).delete()
        db.query(Complaint).delete()
        db.query(Incident).delete()
        db.query(SensorReading).delete()
        db.query(Sensor).delete()
        db.query(Zone).delete()
        db.query(Profile).delete()
        db.commit()

    # 1. Seed Thresholds
    seed_threshold_configs(db)

    # 2. Check if already seeded
    if db.query(Zone).first():
        return {"status": "already_seeded", "message": "Demo data already initialized"}

    # 3. Seed Profiles
    profiles = []
    for p_data in DEMO_PROFILES:
        p = Profile(**p_data)
        db.add(p)
        profiles.append(p)
    db.commit()

    # 4. Seed Zones
    zones = []
    for z_data in DEMO_ZONES:
        z = Zone(**z_data)
        db.add(z)
        zones.append(z)
    db.commit()

    # 5. Seed Sensors across Zones (all 7 measurement types)
    sensors_by_zone = {}
    now = datetime.utcnow()
    m_types = [
        ("pressure", "psi", 40.0, 70.0, 52.0),
        ("flow_rate", "m3/h", 10.0, 45.0, 26.0),
        ("tank_level", "%", 45.0, 90.0, 72.0),
        ("turbidity", "NTU", 0.1, 1.0, 0.45),
        ("ph", "pH", 6.8, 8.2, 7.35),
        ("conductivity", "uS/cm", 180.0, 450.0, 280.0),
        ("temperature", "C", 14.0, 22.0, 18.5)
    ]

    all_sensors = []
    for idx, z in enumerate(zones):
        sensors_by_zone[z.id] = []
        for s_idx, (m_type, unit, min_op, max_op, base_val) in enumerate(m_types):
            sensor_code = f"SEN-{z.code}-{m_type[:4].upper()}"
            sensor = Sensor(
                external_sensor_id=sensor_code,
                zone_id=z.id,
                name=f"{z.name} {m_type.replace('_', ' ').title()} Sensor",
                measurement_type=m_type,
                unit=unit,
                lat=z.center_lat + (s_idx * 0.003 - 0.009),
                lng=z.center_lng + (s_idx * 0.003 - 0.009),
                min_operational=min_op,
                max_operational=max_op,
                last_reading_value=base_val,
                last_seen_at=now,
                health_status="healthy",
                is_active=True
            )
            db.add(sensor)
            all_sensors.append(sensor)
            sensors_by_zone[z.id].append(sensor)
    db.commit()

    # 6. Seed Baseline Historical Readings (24 hours back per sensor)
    for s in all_sensors:
        base = s.last_reading_value or 50.0
        for h in range(24, 0, -1):
            t = now - timedelta(hours=h)
            noise = (random.random() - 0.5) * (base * 0.05)
            val = round(base + noise, 2)
            reading = SensorReading(
                sensor_id=s.id,
                observed_at=t,
                value=val,
                unit=s.unit,
                quality_status="valid",
                ingestion_source="simulated_telemetry",
                is_simulated=True
            )
            db.add(reading)
    db.commit()

    # 7. Seed Initial Scenario A (Suspected Leak in North Metro)
    north_zone = db.query(Zone).filter(Zone.name == "North Metro").first()
    officer_arun = db.query(Profile).filter(Profile.display_name == "Arun Verma").first()
    
    # Pressure drop reading on North Metro pressure sensor
    north_pressure_sen = db.query(Sensor).filter(
        Sensor.zone_id == north_zone.id,
        Sensor.measurement_type == "pressure"
    ).first()
    north_flow_sen = db.query(Sensor).filter(
        Sensor.zone_id == north_zone.id,
        Sensor.measurement_type == "flow_rate"
    ).first()

    if north_pressure_sen and north_flow_sen:
        north_pressure_sen.last_reading_value = 21.4
        north_flow_sen.last_reading_value = 68.2

        db.add(SensorReading(
            sensor_id=north_pressure_sen.id,
            observed_at=now - timedelta(minutes=25),
            value=21.4,
            unit="psi",
            quality_status="valid",
            ingestion_source="simulated_telemetry",
            is_simulated=True
        ))
        db.add(SensorReading(
            sensor_id=north_flow_sen.id,
            observed_at=now - timedelta(minutes=24),
            value=68.2,
            unit="m3/h",
            quality_status="valid",
            ingestion_source="simulated_telemetry",
            is_simulated=True
        ))

        # Corroborating citizen complaints
        c1 = Complaint(
            reporter_name="Ananya Rao",
            reporter_contact="+91 98450 11223",
            is_anonymous=False,
            category="low_pressure",
            description="Severe water pressure drop in block C apartment complex since 7 AM.",
            zone_id=north_zone.id,
            latitude=north_zone.center_lat + 0.002,
            longitude=north_zone.center_lng - 0.001,
            verification_status="verified_true",
            is_simulated=True,
            created_at=now - timedelta(minutes=45)
        )
        c2 = Complaint(
            reporter_name="Karthik N.",
            reporter_contact="+91 97400 33445",
            is_anonymous=False,
            category="water_leakage",
            description="Water gushing through pavement joint near 5th cross main road junction.",
            zone_id=north_zone.id,
            latitude=north_zone.center_lat + 0.003,
            longitude=north_zone.center_lng + 0.001,
            verification_status="verified_true",
            is_simulated=True,
            created_at=now - timedelta(minutes=30)
        )
        db.add(c1)
        db.add(c2)
        db.flush()

        # Calculate Priority Score via engine
        p_calc = priority_model.calculate_priority(
            category="pipe_leak",
            anomaly_strength=0.92,
            corroboration_score=0.85,
            age_hours=0.75,
            is_sensor_fault=False,
            confidence_category="HIGH"
        )

        incident_leak = Incident(
            title="Suspected Main Distribution Leak — North Metro",
            category="pipe_leak",
            zone_id=north_zone.id,
            priority_score=p_calc["priority_score"],
            confidence_category="HIGH",
            status="ASSIGNED",
            assigned_officer_id=officer_arun.id if officer_arun else None,
            assigned_officer_name=officer_arun.display_name if officer_arun else "Arun Verma",
            first_observed_at=now - timedelta(minutes=50),
            last_observed_at=now - timedelta(minutes=20),
            hypothesis="High-Probability Pipe Burst / Distribution Leak in North Metro: Pressure drop (21.4 psi vs 52 psi baseline) correlated with flow surge (68.2 m3/h) and citizen street flooding reports.",
            recommended_action="Deploy field acoustic listening crew and isolate valve cluster V-N2-04.",
            missing_info="Acoustic pinpointing in progress; excavation permit pending.",
            contradictory_evidence="None detected",
            is_simulated=True
        )
        db.add(incident_leak)
        db.flush()

        c1.correlated_incident_id = incident_leak.id
        c2.correlated_incident_id = incident_leak.id

        # Evidence records
        db.add(IncidentEvidence(
            incident_id=incident_leak.id,
            source_type="sensor",
            source_record_id=north_pressure_sen.external_sensor_id,
            evidence_summary="PRESSURE observed at 21.4 psi vs baseline median 52.0 psi (Z-score: -4.8, Severity: CRITICAL).",
            evidence_quality="HIGH",
            metrics_snapshot={"current_value": 21.4, "baseline_median": 52.0, "z_score": -4.8}
        ))
        db.add(IncidentEvidence(
            incident_id=incident_leak.id,
            source_type="sensor",
            source_record_id=north_flow_sen.external_sensor_id,
            evidence_summary="FLOW RATE surged to 68.2 m3/h vs normal 26.0 m3/h (Deviation: +42.2 m3/h, Severity: WARNING).",
            evidence_quality="HIGH",
            metrics_snapshot={"current_value": 68.2, "baseline_median": 26.0, "deviation": 42.2}
        ))
        db.add(IncidentEvidence(
            incident_id=incident_leak.id,
            source_type="complaint",
            source_record_id="citizen_reports",
            evidence_summary="2 independent verified citizen complaints confirming pavement water surge and apartment pressure loss.",
            evidence_quality="HIGH",
            metrics_snapshot={"independent_reports": 2}
        ))

        # Events
        db.add(IncidentEvent(
            incident_id=incident_leak.id,
            actor_name="AI Anomaly Engine",
            event_type="CREATED",
            previous_status=None,
            new_status="NEW",
            note="Multi-source anomaly detected: simultaneous pressure drop & flow surge.",
            created_at=now - timedelta(minutes=48)
        ))
        db.add(IncidentEvent(
            incident_id=incident_leak.id,
            actor_name="System Dispatch",
            event_type="ASSIGNED",
            previous_status="NEW",
            new_status="ASSIGNED",
            note=f"Assigned to {officer_arun.display_name if officer_arun else 'Field Team'}.",
            created_at=now - timedelta(minutes=35)
        ))

        # Notification
        db.add(Notification(
            recipient_id=officer_arun.id if officer_arun else None,
            recipient_role="officer",
            incident_id=incident_leak.id,
            title="CRITICAL ALERT: Main Pipe Leak in North Metro",
            message="Pressure breached critical minimum at 21.4 psi with pavement leak reported near 5th cross.",
            priority="CRITICAL",
            channel="in_app",
            is_read=False,
            created_at=now - timedelta(minutes=35)
        ))

    # 8. Seed Scenario C (Suspected Water Quality Screening in East Valley)
    east_zone = db.query(Zone).filter(Zone.name == "East Valley").first()
    analyst_priya = db.query(Profile).filter(Profile.display_name == "Priya Sharma").first()
    east_turb_sen = db.query(Sensor).filter(
        Sensor.zone_id == east_zone.id,
        Sensor.measurement_type == "turbidity"
    ).first()

    if east_turb_sen:
        east_turb_sen.last_reading_value = 4.85
        db.add(SensorReading(
            sensor_id=east_turb_sen.id,
            observed_at=now - timedelta(minutes=15),
            value=4.85,
            unit="NTU",
            quality_status="valid",
            ingestion_source="simulated_telemetry",
            is_simulated=True
        ))

        p_calc_wq = priority_model.calculate_priority(
            category="water_quality",
            anomaly_strength=0.88,
            corroboration_score=0.40,
            age_hours=0.3,
            is_sensor_fault=False,
            confidence_category="MEDIUM"
        )

        incident_wq = Incident(
            title="Elevated Turbidity Screening Alert — East Valley",
            category="water_quality",
            zone_id=east_zone.id,
            priority_score=p_calc_wq["priority_score"],
            confidence_category="MEDIUM",
            status="INVESTIGATING",
            assigned_officer_id=analyst_priya.id if analyst_priya else None,
            assigned_officer_name=analyst_priya.display_name if analyst_priya else "Priya Sharma",
            first_observed_at=now - timedelta(minutes=40),
            last_observed_at=now - timedelta(minutes=15),
            hypothesis="Suspected Water Quality Anomaly in East Valley: Turbidity screening sensor spiked to 4.85 NTU (WHO guidance target < 1.0 NTU). Screening only; does not establish verified contamination without certified lab testing.",
            recommended_action="Collect physical grab samples for certified nephelometric laboratory turbidity and total coliform cultures.",
            missing_info="Physical grab sample test pending laboratory incubation.",
            contradictory_evidence="pH and conductivity sensors in the same zone remain within normal limits.",
            is_simulated=True
        )
        db.add(incident_wq)
        db.flush()

        db.add(IncidentEvidence(
            incident_id=incident_wq.id,
            source_type="sensor",
            source_record_id=east_turb_sen.external_sensor_id,
            evidence_summary="TURBIDITY spiked to 4.85 NTU vs baseline 0.45 NTU (Deviation: +4.4 NTU, WHO Target < 1.0 NTU).",
            evidence_quality="HIGH",
            metrics_snapshot={"current_value": 4.85, "baseline_median": 0.45}
        ))

        # Sample record
        db.add(Sample(
            zone_id=east_zone.id,
            collected_at=now - timedelta(minutes=10),
            collected_by="Priya Sharma (Field QC)",
            measurement_values={"turbidity": 4.8, "ph": 7.4, "residual_chlorine": 0.12},
            units={"turbidity": "NTU", "ph": "pH", "residual_chlorine": "mg/L"},
            result_status="pending_lab",
            laboratory_reference="LAB-EV-2026-041",
            incident_id=incident_wq.id,
            notes="Physical 500ml sterile grab sample taken from sector manifold; dispatched to regional lab."
        ))

        db.add(IncidentEvent(
            incident_id=incident_wq.id,
            actor_name="AI Anomaly Engine",
            event_type="CREATED",
            previous_status=None,
            new_status="NEW",
            note="Sensor turbidity spiked above warning boundary.",
            created_at=now - timedelta(minutes=40)
        ))
        db.add(IncidentEvent(
            incident_id=incident_wq.id,
            actor_name="Priya Sharma",
            event_type="SAMPLE_REQUESTED",
            previous_status="NEW",
            new_status="INVESTIGATING",
            note="Physical sample collected and submitted under reference LAB-EV-2026-041.",
            created_at=now - timedelta(minutes=10)
        ))

        db.add(Notification(
            recipient_id=analyst_priya.id if analyst_priya else None,
            recipient_role="quality_analyst",
            incident_id=incident_wq.id,
            title="WATER QUALITY SCREENING: East Valley Turbidity Spike",
            message="Turbidity sensor recorded 4.85 NTU. Awaiting certified laboratory bacteriological verification.",
            priority="HIGH",
            channel="in_app",
            is_read=False,
            created_at=now - timedelta(minutes=30)
        ))

    # Audit log
    db.add(AuditLog(
        actor_name="System Seeder",
        actor_role="system",
        action="SEED_DEMO_DATASET",
        target_type="database",
        target_id="all",
        details={"zones_count": len(zones), "sensors_count": len(all_sensors), "incidents_created": 2}
    ))

    db.commit()
    generate_sample_csv_files(db)
    return {"status": "success", "message": "Demo dataset successfully initialized"}

def generate_sample_csv_files(db: Session):
    """Generates downloadable sample CSV files for demonstration import/export."""
    base_dir = os.path.join(os.path.dirname(__file__), "sample_csvs")
    os.makedirs(base_dir, exist_ok=True)

    # 1. sensor_metadata.csv
    sensors = db.query(Sensor).all()
    with open(os.path.join(base_dir, "sensor_metadata.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["external_sensor_id", "name", "measurement_type", "unit", "zone_code", "min_operational", "max_operational", "lat", "lng"])
        for s in sensors:
            zone_code = s.zone.code if s.zone else "ZONE-C1"
            writer.writerow([s.external_sensor_id, s.name, s.measurement_type, s.unit, zone_code, s.min_operational, s.max_operational, s.lat, s.lng])

    # 2. citizen_complaints.csv
    complaints = db.query(Complaint).all()
    with open(os.path.join(base_dir, "citizen_complaints.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["reporter_name", "reporter_contact", "category", "description", "zone_code", "latitude", "longitude", "created_at"])
        for c in complaints:
            zone_code = c.zone.code if c.zone else "ZONE-N2"
            writer.writerow([c.reporter_name, c.reporter_contact or "", c.category, c.description, zone_code, c.latitude or "", c.longitude or "", c.created_at.isoformat()])

    # 3. sensor_readings.csv
    readings = db.query(SensorReading).limit(100).all()
    with open(os.path.join(base_dir, "sensor_readings.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sensor_id", "observed_at", "value", "unit", "quality_status"])
        for r in readings:
            writer.writerow([r.sensor.external_sensor_id if r.sensor else r.sensor_id, r.observed_at.isoformat(), r.value, r.unit, r.quality_status])

    # 4. water_quality_samples.csv
    samples = db.query(Sample).all()
    with open(os.path.join(base_dir, "water_quality_samples.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["zone_code", "collected_by", "collected_at", "turbidity_ntu", "ph", "chlorine_mgl", "result_status", "lab_ref"])
        for s in samples:
            zone_code = s.zone_id
            m = s.measurement_values or {}
            writer.writerow([zone_code, s.collected_by, s.collected_at.isoformat(), m.get("turbidity", ""), m.get("ph", ""), m.get("residual_chlorine", ""), s.result_status, s.laboratory_reference or ""])
