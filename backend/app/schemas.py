from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Profile
class ProfileBase(BaseModel):
    display_name: str
    role: str = "citizen"
    email: Optional[str] = None
    assigned_zone: Optional[str] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileOut(ProfileBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Zone
class ZoneBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    center_lat: float
    center_lng: float
    radius_meters: float = 2000.0

class ZoneCreate(ZoneBase):
    pass

class ZoneOut(ZoneBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Sensor
class SensorBase(BaseModel):
    external_sensor_id: str
    zone_id: str
    name: str
    measurement_type: str
    unit: str
    lat: float
    lng: float
    min_operational: float
    max_operational: float

class SensorCreate(SensorBase):
    pass

class SensorOut(SensorBase):
    id: str
    last_reading_value: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    health_status: str
    is_active: bool
    created_at: datetime
    zone_name: Optional[str] = None
    class Config:
        from_attributes = True

# Sensor Reading
class SensorReadingBase(BaseModel):
    sensor_id: str
    observed_at: datetime
    value: float
    unit: str
    quality_status: str = "valid"
    ingestion_source: str = "telemetry_stream"

class SensorReadingCreate(SensorReadingBase):
    pass

class SensorReadingOut(SensorReadingBase):
    id: str
    is_simulated: bool
    class Config:
        from_attributes = True

# Complaint
class ComplaintBase(BaseModel):
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_contact: Optional[str] = None
    is_anonymous: bool = True
    category: str
    description: str
    zone_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    attachment_url: Optional[str] = None

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintOut(ComplaintBase):
    id: str
    verification_status: str
    correlated_incident_id: Optional[str] = None
    is_simulated: bool
    created_at: datetime
    zone_name: Optional[str] = None
    class Config:
        from_attributes = True

# Sample
class SampleBase(BaseModel):
    zone_id: str
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    collected_by: str
    measurement_values: Dict[str, float]
    units: Dict[str, str]
    result_status: str = "pending_lab"
    laboratory_reference: Optional[str] = None
    incident_id: Optional[str] = None
    notes: Optional[str] = None

class SampleCreate(SampleBase):
    pass

class SampleOut(SampleBase):
    id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Evidence
class IncidentEvidenceOut(BaseModel):
    id: str
    incident_id: str
    source_type: str
    source_record_id: Optional[str] = None
    evidence_summary: str
    evidence_quality: str
    metrics_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime
    class Config:
        from_attributes = True

# Event
class IncidentEventCreate(BaseModel):
    actor_id: Optional[str] = None
    actor_name: str = "System"
    event_type: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    note: Optional[str] = None

class IncidentEventOut(IncidentEventCreate):
    id: str
    incident_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Incident
class IncidentBase(BaseModel):
    title: str
    category: str
    zone_id: str
    priority_score: float = 50.0
    confidence_category: str = "MEDIUM"
    status: str = "NEW"
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    hypothesis: Optional[str] = None
    recommended_action: Optional[str] = None
    missing_info: Optional[str] = None
    contradictory_evidence: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentOut(IncidentBase):
    id: str
    first_observed_at: datetime
    last_observed_at: datetime
    closure_notes: Optional[str] = None
    reopen_reason: Optional[str] = None
    is_simulated: bool
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    zone_name: Optional[str] = None
    evidence_items: List[IncidentEvidenceOut] = []
    events: List[IncidentEventOut] = []
    complaints: List[ComplaintOut] = []
    class Config:
        from_attributes = True

# Assign request
class IncidentAssignRequest(BaseModel):
    officer_id: str
    officer_name: str
    note: Optional[str] = None

# Status transition request
class IncidentStatusUpdateRequest(BaseModel):
    new_status: str
    actor_name: str = "Officer"
    note: Optional[str] = None
    closure_notes: Optional[str] = None
    reopen_reason: Optional[str] = None

# Notification
class NotificationOut(BaseModel):
    id: str
    recipient_id: Optional[str] = None
    recipient_role: str
    incident_id: Optional[str] = None
    title: str
    message: str
    priority: str
    channel: str
    is_read: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    class Config:
        from_attributes = True

# Dashboard Summary
class DashboardSummary(BaseModel):
    total_active_incidents: int
    critical_incidents: int
    high_priority_incidents: int
    new_anomalies_detected: int
    healthy_sensors: int
    total_sensors: int
    complaints_awaiting_review: int
    resolved_incidents: int
    closed_incidents: int
    last_data_sync: datetime
    is_demo_mode: bool
    incident_trends: List[Dict[str, Any]]
    incidents_by_category: List[Dict[str, Any]]
    incidents_by_severity: List[Dict[str, Any]]

# Priority Calculation Details
class PriorityBreakdown(BaseModel):
    priority_score: float
    confidence_category: str
    severity_component: float
    anomaly_component: float
    corroboration_component: float
    age_component: float
    reliability_penalty: float
    explanation: str

# Threshold Config
class ThresholdConfigOut(BaseModel):
    id: str
    measurement_type: str
    unit: str
    min_normal: float
    max_normal: float
    warning_low: float
    warning_high: float
    critical_low: float
    critical_high: float
    standard_reference: str
    description: Optional[str] = None
    class Config:
        from_attributes = True
