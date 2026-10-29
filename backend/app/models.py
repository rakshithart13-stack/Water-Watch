from datetime import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String, primary_key=True, default=generate_uuid)
    display_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="citizen") # citizen, officer, quality_analyst, admin
    email = Column(String(150), unique=True, nullable=True)
    assigned_zone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Zone(Base):
    __tablename__ = "zones"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    radius_meters = Column(Float, default=2000.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sensors = relationship("Sensor", back_populates="zone")
    complaints = relationship("Complaint", back_populates="zone")
    incidents = relationship("Incident", back_populates="zone")

class Sensor(Base):
    __tablename__ = "sensors"
    id = Column(String, primary_key=True, default=generate_uuid)
    external_sensor_id = Column(String(50), unique=True, nullable=False)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    name = Column(String(100), nullable=False)
    measurement_type = Column(String(50), nullable=False) # pressure, flow_rate, tank_level, turbidity, ph, conductivity, temperature
    unit = Column(String(20), nullable=False) # psi, m3/h, %, NTU, pH, uS/cm, C
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    min_operational = Column(Float, nullable=False)
    max_operational = Column(Float, nullable=False)
    last_reading_value = Column(Float, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    health_status = Column(String(30), default="healthy") # healthy, warning, frozen, offline
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(String, primary_key=True, default=generate_uuid)
    sensor_id = Column(String, ForeignKey("sensors.id"), nullable=False)
    observed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    quality_status = Column(String(30), default="valid") # valid, suspicious, frozen, out_of_range, missing
    ingestion_source = Column(String(50), default="telemetry_stream")
    is_simulated = Column(Boolean, default=True)

    sensor = relationship("Sensor", back_populates="readings")

class Complaint(Base):
    __tablename__ = "complaints"
    id = Column(String, primary_key=True, default=generate_uuid)
    reporter_name = Column(String(100), default="Anonymous Citizen")
    reporter_contact = Column(String(100), nullable=True)
    is_anonymous = Column(Boolean, default=True)
    category = Column(String(50), nullable=False) # water_leakage, low_pressure, discolored_water, odor_taste, dirty_tank, supply_interruption, other
    description = Column(Text, nullable=False)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    verification_status = Column(String(30), default="pending") # pending, verified_true, verified_false, grouped_duplicate
    correlated_incident_id = Column(String, ForeignKey("incidents.id"), nullable=True)
    attachment_url = Column(String(255), nullable=True)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="complaints")
    incident = relationship("Incident", back_populates="complaints")

class Sample(Base):
    __tablename__ = "samples"
    id = Column(String, primary_key=True, default=generate_uuid)
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    collected_at = Column(DateTime, default=datetime.utcnow)
    collected_by = Column(String(100), nullable=False)
    measurement_values = Column(JSON, nullable=False) # e.g. {"turbidity": 4.8, "ph": 6.8, "chlorine": 0.2}
    units = Column(JSON, nullable=False)
    result_status = Column(String(50), default="pending_lab") # pending_lab, verified_acceptable, verified_anomalous, inconclusive
    laboratory_reference = Column(String(100), nullable=True)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False) # pipe_leak, water_quality, tank_maintenance, sensor_fault, unclassified
    zone_id = Column(String, ForeignKey("zones.id"), nullable=False)
    priority_score = Column(Float, default=50.0) # 0 - 100
    confidence_category = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH
    status = Column(String(30), default="NEW") # NEW, TRIAGED, ASSIGNED, INVESTIGATING, AWAITING_SAMPLE, AWAITING_REPAIR, RESOLVED, CLOSED
    assigned_officer_id = Column(String, ForeignKey("profiles.id"), nullable=True)
    assigned_officer_name = Column(String(100), nullable=True)
    first_observed_at = Column(DateTime, default=datetime.utcnow)
    last_observed_at = Column(DateTime, default=datetime.utcnow)
    hypothesis = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    missing_info = Column(Text, nullable=True)
    contradictory_evidence = Column(Text, nullable=True)
    closure_notes = Column(Text, nullable=True)
    reopen_reason = Column(Text, nullable=True)
    is_simulated = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    zone = relationship("Zone", back_populates="incidents")
    complaints = relationship("Complaint", back_populates="incident")
    evidence_items = relationship("IncidentEvidence", back_populates="incident", cascade="all, delete-orphan")
    events = relationship("IncidentEvent", back_populates="incident", cascade="all, delete-orphan")

class IncidentEvidence(Base):
    __tablename__ = "incident_evidence"
    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    source_type = Column(String(50), nullable=False) # sensor, complaint, sample, inspection
    source_record_id = Column(String, nullable=True)
    evidence_summary = Column(Text, nullable=False)
    evidence_quality = Column(String(20), default="MEDIUM") # HIGH, MEDIUM, LOW, CONFLICTING
    metrics_snapshot = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="evidence_items")

class IncidentEvent(Base):
    __tablename__ = "incident_events"
    id = Column(String, primary_key=True, default=generate_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    actor_id = Column(String, nullable=True)
    actor_name = Column(String(100), default="System")
    event_type = Column(String(50), nullable=False) # CREATED, TRIAGED, ASSIGNED, NOTE_ADDED, SAMPLE_REQUESTED, SAMPLE_RECORDED, REPAIR_LOGGED, RESOLVED, CLOSED, REOPENED
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("Incident", back_populates="events")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=generate_uuid)
    recipient_id = Column(String, nullable=True)
    recipient_role = Column(String(50), default="all_officers")
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=True)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="HIGH") # LOW, MEDIUM, HIGH, CRITICAL
    channel = Column(String(30), default="in_app") # in_app, email_simulated, sms_simulated
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read_at = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    actor_name = Column(String(100), default="System")
    actor_role = Column(String(50), default="system")
    action = Column(String(100), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ThresholdConfig(Base):
    __tablename__ = "threshold_configs"
    id = Column(String, primary_key=True, default=generate_uuid)
    measurement_type = Column(String(50), unique=True, nullable=False)
    unit = Column(String(20), nullable=False)
    min_normal = Column(Float, nullable=False)
    max_normal = Column(Float, nullable=False)
    warning_low = Column(Float, nullable=False)
    warning_high = Column(Float, nullable=False)
    critical_low = Column(Float, nullable=False)
    critical_high = Column(Float, nullable=False)
    standard_reference = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
