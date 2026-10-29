-- Water Watch AI — Supabase PostgreSQL Schema Migration
-- Includes RLS policies, spatial coordinates, referential integrity and performance indexes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    email VARCHAR(150) UNIQUE,
    assigned_zone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Zones table
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_meters DOUBLE PRECISION DEFAULT 2000.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_sensor_id VARCHAR(50) UNIQUE NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    measurement_type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    min_operational DOUBLE PRECISION NOT NULL,
    max_operational DOUBLE PRECISION NOT NULL,
    last_reading_value DOUBLE PRECISION,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    health_status VARCHAR(30) DEFAULT 'healthy',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE NOT NULL,
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality_status VARCHAR(30) DEFAULT 'valid',
    ingestion_source VARCHAR(50) DEFAULT 'telemetry_stream',
    is_simulated BOOLEAN DEFAULT TRUE
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
    priority_score DOUBLE PRECISION DEFAULT 50.0,
    confidence_category VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(30) DEFAULT 'NEW',
    assigned_officer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_officer_name VARCHAR(100),
    first_observed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    hypothesis TEXT,
    recommended_action TEXT,
    missing_info TEXT,
    contradictory_evidence TEXT,
    closure_notes TEXT,
    reopen_reason TEXT,
    is_simulated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name VARCHAR(100) DEFAULT 'Anonymous Citizen',
    reporter_contact VARCHAR(100),
    is_anonymous BOOLEAN DEFAULT TRUE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    verification_status VARCHAR(30) DEFAULT 'pending',
    correlated_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    attachment_url VARCHAR(255),
    is_simulated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Samples table
CREATE TABLE IF NOT EXISTS samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    collected_by VARCHAR(100) NOT NULL,
    measurement_values JSONB NOT NULL,
    units JSONB NOT NULL,
    result_status VARCHAR(50) DEFAULT 'pending_lab',
    laboratory_reference VARCHAR(100),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Incident evidence table
CREATE TABLE IF NOT EXISTS incident_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    source_record_id VARCHAR(100),
    evidence_summary TEXT NOT NULL,
    evidence_quality VARCHAR(20) DEFAULT 'MEDIUM',
    metrics_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Incident events table
CREATE TABLE IF NOT EXISTS incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(100) DEFAULT 'System',
    event_type VARCHAR(50) NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recipient_role VARCHAR(50) DEFAULT 'all_officers',
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'HIGH',
    channel VARCHAR(30) DEFAULT 'in_app',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_name VARCHAR(100) DEFAULT 'System',
    actor_role VARCHAR(50) DEFAULT 'system',
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Threshold configurations table
CREATE TABLE IF NOT EXISTS threshold_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    measurement_type VARCHAR(50) UNIQUE NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_normal DOUBLE PRECISION NOT NULL,
    max_normal DOUBLE PRECISION NOT NULL,
    warning_low DOUBLE PRECISION NOT NULL,
    warning_high DOUBLE PRECISION NOT NULL,
    critical_low DOUBLE PRECISION NOT NULL,
    critical_high DOUBLE PRECISION NOT NULL,
    standard_reference VARCHAR(100) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_zone ON incidents(zone_id);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_zone_time ON complaints(zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read access for zones and sensors
CREATE POLICY "Public read zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Public read sensors" ON sensors FOR SELECT USING (true);
CREATE POLICY "Public read sensor_readings" ON sensor_readings FOR SELECT USING (true);

-- Citizens can submit complaints
CREATE POLICY "Citizens can insert complaints" ON complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view non-sensitive complaint summaries" ON complaints FOR SELECT USING (true);
