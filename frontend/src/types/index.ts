export interface Zone {
  id: string;
  name: string;
  code: string;
  description?: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  created_at: string;
}

export interface Sensor {
  id: string;
  external_sensor_id: string;
  zone_id: string;
  zone_name?: string;
  name: string;
  measurement_type: string;
  unit: string;
  lat: number;
  lng: number;
  min_operational: number;
  max_operational: number;
  last_reading_value?: number;
  last_seen_at?: string;
  health_status: 'healthy' | 'warning' | 'frozen' | 'offline';
  is_active: boolean;
  created_at: string;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  observed_at: string;
  value: number;
  unit: string;
  quality_status: string;
  is_simulated: boolean;
}

export interface Complaint {
  id: string;
  reporter_name: string;
  reporter_contact?: string;
  is_anonymous: boolean;
  category: string;
  description: string;
  zone_id: string;
  zone_name?: string;
  latitude?: number;
  longitude?: number;
  verification_status: 'pending' | 'verified_true' | 'verified_false' | 'grouped_duplicate';
  correlated_incident_id?: string;
  attachment_url?: string;
  is_simulated: boolean;
  created_at: string;
}

export interface IncidentEvidence {
  id: string;
  incident_id: string;
  source_type: string;
  source_record_id?: string;
  evidence_summary: string;
  evidence_quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'CONFLICTING';
  metrics_snapshot?: any;
  created_at: string;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  actor_id?: string;
  actor_name: string;
  event_type: string;
  previous_status?: string;
  new_status?: string;
  note?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  category: 'pipe_leak' | 'water_quality' | 'tank_maintenance' | 'sensor_fault' | 'unclassified';
  zone_id: string;
  zone_name?: string;
  priority_score: number;
  confidence_category: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'TRIAGED' | 'ASSIGNED' | 'INVESTIGATING' | 'AWAITING_SAMPLE' | 'AWAITING_REPAIR' | 'RESOLVED' | 'CLOSED';
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  first_observed_at: string;
  last_observed_at: string;
  hypothesis?: string;
  recommended_action?: string;
  missing_info?: string;
  contradictory_evidence?: string;
  closure_notes?: string;
  reopen_reason?: string;
  is_simulated: boolean;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  evidence_items?: IncidentEvidence[];
  events?: IncidentEvent[];
  complaints?: Complaint[];
}

export interface NotificationItem {
  id: string;
  recipient_id?: string;
  recipient_role: string;
  incident_id?: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  channel: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface DashboardSummaryData {
  total_active_incidents: number;
  critical_incidents: number;
  high_priority_incidents: number;
  new_anomalies_detected: number;
  healthy_sensors: number;
  total_sensors: number;
  complaints_awaiting_review: number;
  resolved_incidents: number;
  closed_incidents: number;
  last_data_sync: string;
  is_demo_mode: boolean;
  incident_trends: { date: string; incidents: number; complaints: number }[];
  incidents_by_category: { category: string; count: number }[];
  incidents_by_severity: { severity: string; count: number; color: string }[];
}

export interface ThresholdConfig {
  id: string;
  measurement_type: string;
  unit: string;
  min_normal: number;
  max_normal: number;
  warning_low: number;
  warning_high: number;
  critical_low: number;
  critical_high: number;
  standard_reference: string;
  description?: string;
}

export interface AuditLogItem {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: any;
  timestamp: string;
}
