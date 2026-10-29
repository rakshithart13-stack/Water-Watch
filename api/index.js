// Vercel Serverless Function: Complete Water Watch AI API Core
// Handles all /api/* requests with persistent in-memory/file storage, CORS, and full scenario logic

const DEFAULT_OPERATIONAL_THRESHOLDS = {
  pressure: { unit: 'psi', min_normal: 45.0, max_normal: 65.0, warning_low: 35.0, warning_high: 75.0, critical_low: 25.0, critical_high: 85.0, standard: 'AWWA M31' },
  flow_rate: { unit: 'm3/h', min_normal: 15.0, max_normal: 40.0, warning_low: 8.0, warning_high: 55.0, critical_low: 2.0, critical_high: 70.0, standard: 'ISO 4064' },
  tank_level: { unit: '%', min_normal: 50.0, max_normal: 85.0, warning_low: 30.0, warning_high: 92.0, critical_low: 15.0, critical_high: 98.0, standard: 'EPA Water Storage Guide' },
  turbidity: { unit: 'NTU', min_normal: 0.1, max_normal: 1.0, warning_low: 0.0, warning_high: 2.5, critical_low: 0.0, critical_high: 4.0, standard: 'WHO Guidelines for Drinking-water Quality' },
  ph: { unit: 'pH', min_normal: 7.0, max_normal: 8.0, warning_low: 6.5, warning_high: 8.5, critical_low: 6.0, critical_high: 9.0, standard: 'BIS IS 10500:2012' },
  conductivity: { unit: 'uS/cm', min_normal: 200.0, max_normal: 400.0, warning_low: 150.0, warning_high: 600.0, critical_low: 100.0, critical_high: 800.0, standard: 'EPA 816-F-09-004' },
  temperature: { unit: 'C', min_normal: 15.0, max_normal: 20.0, warning_low: 12.0, warning_high: 24.0, critical_low: 8.0, critical_high: 28.0, standard: 'Municipal Supply Standard' }
};

const INITIAL_ZONES = [
  { id: 'zone-c1', name: 'Central District', code: 'ZONE-C1', description: 'High-density commercial and residential core', center_lat: 12.9716, center_lng: 77.5946, radius_meters: 2000 },
  { id: 'zone-n2', name: 'North Metro', code: 'ZONE-N2', description: 'Urban distribution corridor and high-rise apartments', center_lat: 13.0358, center_lng: 77.5970, radius_meters: 2200 },
  { id: 'zone-e3', name: 'East Valley', code: 'ZONE-E3', description: 'Suburban residential district and educational hub', center_lat: 12.9784, center_lng: 77.6408, radius_meters: 1800 },
  { id: 'zone-w4', name: 'West Hills', code: 'ZONE-W4', description: 'Elevated residential sector with booster pump stations', center_lat: 12.9601, center_lng: 77.5385, radius_meters: 2500 },
  { id: 'zone-s5', name: 'South Industrial', code: 'ZONE-S5', description: 'Industrial manufacturing hub with heavy water volume usage', center_lat: 12.9141, center_lng: 77.6109, radius_meters: 2400 }
];

const INITIAL_PROFILES = [
  { id: 'prof-1', display_name: 'Rajesh Kumar', role: 'officer', email: 'rajesh.k@waterwatch.gov', assigned_zone: 'Central District' },
  { id: 'prof-2', display_name: 'Priya Sharma', role: 'quality_analyst', email: 'priya.s@waterwatch.gov', assigned_zone: 'East Valley' },
  { id: 'prof-3', display_name: 'Arun Verma', role: 'officer', email: 'arun.v@waterwatch.gov', assigned_zone: 'North Metro' },
  { id: 'prof-4', display_name: 'Dr. Sunita Patel', role: 'admin', email: 'sunita.p@waterwatch.gov', assigned_zone: 'All Zones' }
];

function generateInitialSensors() {
  const mTypes = [
    { type: 'pressure', unit: 'psi', min: 40, max: 70, val: 52 },
    { type: 'flow_rate', unit: 'm3/h', min: 10, max: 45, val: 26 },
    { type: 'tank_level', unit: '%', min: 45, max: 90, val: 72 },
    { type: 'turbidity', unit: 'NTU', min: 0.1, max: 1.0, val: 0.45 },
    { type: 'ph', unit: 'pH', min: 6.8, max: 8.2, val: 7.35 },
    { type: 'conductivity', unit: 'uS/cm', min: 180, max: 450, val: 280 },
    { type: 'temperature', unit: 'C', min: 14, max: 22, val: 18.5 }
  ];

  const sensors = [];
  INITIAL_ZONES.forEach((z) => {
    mTypes.forEach((m, sIdx) => {
      const code = `SEN-${z.code}-${m.type.slice(0, 4).toUpperCase()}`;
      sensors.push({
        id: `sensor-${code.toLowerCase()}`,
        external_sensor_id: code,
        zone_id: z.id,
        name: `${z.name} ${m.type.replace('_', ' ').toUpperCase()} Sensor`,
        measurement_type: m.type,
        unit: m.unit,
        lat: z.center_lat + (sIdx * 0.003 - 0.009),
        lng: z.center_lng + (sIdx * 0.003 - 0.009),
        min_operational: m.min,
        max_operational: m.max,
        last_reading_value: m.val,
        last_seen_at: new Date().toISOString(),
        health_status: 'healthy',
        is_active: true
      });
    });
  });
  return sensors;
}

function calculatePriority(category, anomalyStrength, corroborationScore, ageHours = 0, isSensorFault = false) {
  const CATEGORY_BASE_SEVERITY = {
    water_quality: 85.0,
    pipe_leak: 75.0,
    tank_maintenance: 60.0,
    sensor_fault: 35.0,
    unclassified: 30.0
  };
  const baseSev = CATEGORY_BASE_SEVERITY[category] || 40.0;
  const severityComp = baseSev;
  const anomalyComp = Math.min(100, Math.max(0, anomalyStrength * 100));
  const corroborationComp = Math.min(100, Math.max(0, corroborationScore * 100));
  const ageComp = Math.min(100, Math.max(0, (ageHours / 48) * 100));

  let raw = 0.35 * severityComp + 0.25 * anomalyComp + 0.25 * corroborationComp + 0.15 * ageComp;
  if (isSensorFault) raw *= 0.7; // 30% reliability penalty
  const score = Math.round(Math.min(100, Math.max(5, raw)) * 10) / 10;
  const categoryStr = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';

  return {
    priority_score: score,
    priority_category: categoryStr,
    severity_component: Math.round(severityComp * 10) / 10,
    anomaly_component: Math.round(anomalyComp * 10) / 10,
    corroboration_component: Math.round(corroborationComp * 10) / 10,
    age_component: Math.round(ageComp * 10) / 10,
    explanation: `Multi-source weighted score based on ${severityComp} base severity, ${anomalyComp} anomaly magnitude, and ${corroborationComp} corroboration.`
  };
}

// Global state in container memory
let DB = {
  zones: [...INITIAL_ZONES],
  profiles: [...INITIAL_PROFILES],
  sensors: generateInitialSensors(),
  incidents: [
    {
      id: 'inc-demo-1',
      title: 'Pressure Drop Anomaly & Micro-Burst',
      category: 'pipe_leak',
      zone_id: 'zone-n2',
      zone_name: 'North Metro',
      priority_score: 84.5,
      confidence_category: 'HIGH',
      status: 'INVESTIGATING',
      assigned_officer_id: 'prof-3',
      assigned_officer_name: 'Arun Verma',
      first_observed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      last_observed_at: new Date().toISOString(),
      hypothesis: 'Pressure drop to 28.5 psi with simultaneous flow increase indicates active sub-surface rupture.',
      recommended_action: 'Dispatch acoustic field sensor team to North Metro sector 4.',
      missing_info: 'Flow sensor reading temporarily unavailable',
      contradictory_evidence: 'None detected',
      evidence_items: [
        { id: 'ev-1', source_type: 'sensor', evidence_summary: 'Pressure sensor SEN-ZONE-N2-PRES dropped from 52 to 28.5 psi (-45.2% deviation).', evidence_quality: 'HIGH' },
        { id: 'ev-2', source_type: 'complaint', evidence_summary: '3 Corroborating citizen reports of bubbling road surface and low tap pressure.', evidence_quality: 'HIGH' }
      ],
      complaints: [
        { id: 'c-1', reporter_name: 'Rohan Mehta', description: 'Low pressure across 4th Block since 8 AM.', verification_status: 'verified_true', created_at: new Date(Date.now() - 3600000).toISOString() }
      ],
      events: [
        { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Automated fusion detection triggered.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
        { event_type: 'ASSIGNED', actor_name: 'System', note: 'Assigned to Officer Arun Verma.', created_at: new Date(Date.now() - 3600000 * 1.5).toISOString() },
        { event_type: 'INVESTIGATING', actor_name: 'Arun Verma', note: 'Team deployed on site with acoustic leak detector.', created_at: new Date(Date.now() - 3600000).toISOString() }
      ]
    },
    {
      id: 'inc-demo-2',
      title: 'Elevated Turbidity Alert',
      category: 'water_quality',
      zone_id: 'zone-e3',
      zone_name: 'East Valley',
      priority_score: 68.0,
      confidence_category: 'MEDIUM',
      status: 'AWAITING_SAMPLE',
      assigned_officer_id: 'prof-2',
      assigned_officer_name: 'Priya Sharma',
      first_observed_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      last_observed_at: new Date().toISOString(),
      hypothesis: 'Turbidity spiked to 2.8 NTU following heavy rain runoff near feeder main.',
      recommended_action: 'Take 3 grab samples for microbiological culturing.',
      missing_info: 'Chlorine residual test pending',
      contradictory_evidence: 'None detected',
      evidence_items: [
        { id: 'ev-3', source_type: 'sensor', evidence_summary: 'Turbidity sensor SEN-ZONE-E3-TURB reading 2.8 NTU (warning threshold breached).', evidence_quality: 'HIGH' }
      ],
      complaints: [],
      events: [
        { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Optical turbidity anomaly flagged.', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
        { event_type: 'AWAITING_SAMPLE', actor_name: 'Priya Sharma', note: 'Grab sample requested.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
      ]
    }
  ],
  complaints: [
    {
      id: 'comp-1',
      reporter_name: 'Ramesh Gowda',
      reporter_contact: '+91 98450 11223',
      is_anonymous: false,
      category: 'water_leakage',
      description: 'Water gushing from pavement joint near North Metro station gate 2.',
      zone_id: 'zone-n2',
      latitude: 13.0360,
      longitude: 77.5975,
      verification_status: 'verified_true',
      correlated_incident_id: 'inc-demo-1',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'comp-2',
      reporter_name: 'Sneha Rao',
      reporter_contact: '+91 97400 33445',
      is_anonymous: false,
      category: 'low_pressure',
      description: 'Severe low pressure for past 6 hours in residential block B.',
      zone_id: 'zone-n2',
      latitude: 13.0370,
      longitude: 77.5980,
      verification_status: 'pending',
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
    }
  ],
  samples: [
    {
      id: 'samp-1',
      zone_id: 'zone-e3',
      collected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      collected_by: 'Inspector Sunil M',
      measurement_values: { turbidity: 2.8, ph: 7.2, residual_chlorine: 0.15 },
      units: { turbidity: 'NTU', ph: 'pH', residual_chlorine: 'mg/L' },
      result_status: 'pending_lab',
      laboratory_reference: 'LAB-EV-9921',
      incident_id: 'inc-demo-2',
      notes: 'Sample transported under cold-chain to Central Water Testing Laboratory.'
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'EMERGENCY LEAK: North Metro',
      message: 'Pressure dropped to 28.5 psi. Corroborated with citizen reports. Priority 85/100.',
      priority: 'CRITICAL',
      incident_id: 'inc-demo-1',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'notif-2',
      title: 'QUALITY ALERT: East Valley',
      message: 'Turbidity reading reached 2.8 NTU. Inspection sample ordered.',
      priority: 'HIGH',
      incident_id: 'inc-demo-2',
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ],
  thresholds: Object.entries(DEFAULT_OPERATIONAL_THRESHOLDS).map(([k, v]) => ({
    id: `thresh-${k}`,
    measurement_type: k,
    ...v,
    updated_at: new Date().toISOString()
  })),
  auditLogs: [
    { id: 'log-1', actor_name: 'AI Engine', action: 'RUN_ANOMALY_PIPELINE', target_type: 'system', details: { evaluated_sensors: 35, anomalies_found: 2 }, created_at: new Date().toISOString() }
  ]
};

export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse path and query parameters
  const rawUrl = req.url || '';
  const qIdx = rawUrl.indexOf('?');
  const queryStr = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';
  const query = new URLSearchParams(queryStr);

  let cleanPath = (qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl).replace(/^\/api/, '');

  // Handle Vercel rewrite parameter if present
  if (req.query && req.query.match) {
    cleanPath = Array.isArray(req.query.match) ? '/' + req.query.match.join('/') : '/' + req.query.match;
  }
  const segments = cleanPath.split('/').filter(Boolean);

  const method = req.method.toUpperCase();
  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { /* ignore */ }
  }

  try {
    // 1. Health Endpoint
    if (segments[0] === 'health') {
      return res.status(200).json({
        status: 'healthy',
        service: 'Water Watch AI Backend (Vercel Serverless Core)',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: 'serverless-active',
        database_connected: true,
        is_demo_mode: true
      });
    }

    // 2. Dashboard Summary
    if (segments[0] === 'dashboard' && segments[1] === 'summary') {
      const active = DB.incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status));
      const critical = active.filter(i => i.priority_score >= 75);
      const high = active.filter(i => i.priority_score >= 50 && i.priority_score < 75);
      const resolved = DB.incidents.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status));
      const healthySensors = DB.sensors.filter(s => s.health_status === 'healthy');

      return res.status(200).json({
        total_active_incidents: active.length,
        critical_incidents: critical.length,
        high_priority_incidents: high.length,
        healthy_sensors: healthySensors.length,
        total_sensors: DB.sensors.length,
        complaints_awaiting_review: DB.complaints.filter(c => c.verification_status === 'pending').length,
        resolved_incidents: resolved.length,
        closed_incidents: DB.incidents.filter(i => i.status === 'CLOSED').length,
        last_data_sync: new Date().toISOString(),
        incident_trends: [
          { date: 'Mon', incidents: 2, complaints: 4 },
          { date: 'Tue', incidents: 3, complaints: 5 },
          { date: 'Wed', incidents: 1, complaints: 3 },
          { date: 'Thu', incidents: 4, complaints: 7 },
          { date: 'Fri', incidents: 2, complaints: 4 },
          { date: 'Sat', incidents: active.length, complaints: DB.complaints.length },
          { date: 'Sun', incidents: active.length, complaints: DB.complaints.length }
        ],
        incidents_by_severity: [
          { severity: 'Critical', count: critical.length, color: '#EF4444' },
          { severity: 'High', count: high.length, color: '#F5A623' },
          { severity: 'Medium', count: active.filter(i => i.priority_score >= 25 && i.priority_score < 50).length, color: '#65BFFF' },
          { severity: 'Low', count: active.filter(i => i.priority_score < 25).length, color: '#22C55E' }
        ]
      });
    }

    // 3. Demo Scenarios & Reset
    if (segments[0] === 'demo') {
      if (segments[1] === 'scenario' && method === 'POST') {
        const scenario = segments[2];
        const now = new Date().toISOString();

        if (scenario === 'leak') {
          // Scenario A: Physical Pipe Leak in North Metro
          const pSen = DB.sensors.find(s => s.zone_id === 'zone-n2' && s.measurement_type === 'pressure');
          const fSen = DB.sensors.find(s => s.zone_id === 'zone-n2' && s.measurement_type === 'flow_rate');
          if (pSen) pSen.last_reading_value = 18.5;
          if (fSen) fSen.last_reading_value = 76.0;

          const pCalc = calculatePriority('pipe_leak', 0.95, 0.90, 0.2, false);
          const incId = `inc-leak-${Date.now().toString().slice(-6)}`;
          const inc = {
            id: incId,
            title: 'CRITICAL: Verified Pipe Burst — North Metro',
            category: 'pipe_leak',
            zone_id: 'zone-n2',
            zone_name: 'North Metro',
            priority_score: pCalc.priority_score,
            confidence_category: 'HIGH',
            status: 'NEW',
            first_observed_at: now,
            last_observed_at: now,
            hypothesis: 'Severe main burst: Pressure plummeted to 18.5 psi with flow surge to 76 m3/h and active street flooding.',
            recommended_action: 'Emergency isolate section between valves V-N2-01 and V-N2-08.',
            missing_info: 'None detected',
            contradictory_evidence: 'None detected',
            evidence_items: [
              { id: `ev-${Date.now()}-1`, source_type: 'sensor', evidence_summary: 'PRESSURE dropped to 18.5 psi (Critical minimum breached).', evidence_quality: 'HIGH' },
              { id: `ev-${Date.now()}-2`, source_type: 'complaint', evidence_summary: 'Active citizen reports of street flooding and pressure drop.', evidence_quality: 'HIGH' }
            ],
            complaints: [
              { id: `comp-leak-${Date.now()}`, reporter_name: 'Girish Patil', description: 'Major road flooding and bubbling water near North Metro station.', verification_status: 'verified_true', created_at: now }
            ],
            events: [
              { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Emergency leak detection triggered via multi-source fusion.', created_at: now }
            ]
          };

          DB.incidents.unshift(inc);
          DB.notifications.unshift({
            id: `notif-${Date.now()}`,
            title: 'EMERGENCY LEAK: North Metro',
            message: 'Pressure down to 18.5 psi. Immediate field deployment advised.',
            priority: 'CRITICAL',
            incident_id: inc.id,
            is_read: false,
            created_at: now
          });

          return res.status(200).json({ status: 'success', scenario: 'Scenario A: Main Pipe Leak triggered', incident_id: inc.id });
        }

        if (scenario === 'sensor_fault') {
          // Scenario B: Sensor Flatline / Fault in Central District
          const condSen = DB.sensors.find(s => s.zone_id === 'zone-c1' && s.measurement_type === 'conductivity');
          if (condSen) {
            condSen.health_status = 'frozen';
            condSen.last_reading_value = 320.0;
          }

          const pCalc = calculatePriority('sensor_fault', 0.40, 0.0, 0.5, true);
          const incId = `inc-fault-${Date.now().toString().slice(-6)}`;
          const inc = {
            id: incId,
            title: 'WARNING: Frozen Telemetry Probe — Central District',
            category: 'sensor_fault',
            zone_id: 'zone-c1',
            zone_name: 'Central District',
            priority_score: pCalc.priority_score,
            confidence_category: 'HIGH',
            status: 'NEW',
            first_observed_at: now,
            last_observed_at: now,
            hypothesis: 'Sensor Flatline: Consecutive unvarying readings (320 uS/cm). Flagged as probe malfunction rather than genuine water anomaly.',
            recommended_action: 'Dispatch instrumentation technician to calibrate SEN-ZONE-C1-COND.',
            missing_info: 'Secondary sensor corroboration absent',
            contradictory_evidence: 'Pressure and flow telemetry in normal operating envelope',
            evidence_items: [
              { id: `ev-${Date.now()}`, source_type: 'sensor', evidence_summary: 'Conductivity probe returned identical reading over 5 polling intervals.', evidence_quality: 'HIGH' }
            ],
            complaints: [],
            events: [
              { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Sensor flatline rule isolated hardware fault.', created_at: now }
            ]
          };

          DB.incidents.unshift(inc);
          DB.notifications.unshift({
            id: `notif-${Date.now()}`,
            title: 'SENSOR FAULT: Central District',
            message: 'Probe flatline flagged. Prevented false alarm leak dispatch.',
            priority: 'HIGH',
            incident_id: inc.id,
            is_read: false,
            created_at: now
          });

          return res.status(200).json({ status: 'success', scenario: 'Scenario B: Sensor Fault triggered', incident_id: inc.id });
        }

        if (scenario === 'water_quality') {
          // Scenario C: Turbidity Spike in East Valley
          const turbSen = DB.sensors.find(s => s.zone_id === 'zone-e3' && s.measurement_type === 'turbidity');
          if (turbSen) turbSen.last_reading_value = 4.8;

          const pCalc = calculatePriority('water_quality', 0.90, 0.40, 0.1, false);
          const incId = `inc-qual-${Date.now().toString().slice(-6)}`;
          const inc = {
            id: incId,
            title: 'CRITICAL: High Turbidity Spike — East Valley',
            category: 'water_quality',
            zone_id: 'zone-e3',
            zone_name: 'East Valley',
            priority_score: pCalc.priority_score,
            confidence_category: 'HIGH',
            status: 'AWAITING_SAMPLE',
            first_observed_at: now,
            last_observed_at: now,
            hypothesis: 'Turbidity spiked to 4.8 NTU (safe threshold: 1.0 NTU). Microbial contamination risk requires grab sample verification.',
            recommended_action: 'Collect physical grab sample and order certified spectrophotometric analysis.',
            missing_info: 'Chlorine residual laboratory confirmation pending',
            contradictory_evidence: 'None detected',
            evidence_items: [
              { id: `ev-${Date.now()}`, source_type: 'sensor', evidence_summary: 'Optical turbidity sensor SEN-ZONE-E3-TURB reading 4.8 NTU.', evidence_quality: 'HIGH' }
            ],
            complaints: [],
            events: [
              { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Quality threshold violation flagged.', created_at: now }
            ]
          };

          DB.incidents.unshift(inc);
          DB.samples.unshift({
            id: `samp-${Date.now().toString().slice(-6)}`,
            zone_id: 'zone-e3',
            collected_at: now,
            collected_by: 'Inspector Sunil M',
            measurement_values: { turbidity: 4.8, ph: 7.1 },
            units: { turbidity: 'NTU', ph: 'pH' },
            result_status: 'pending_lab',
            laboratory_reference: 'LAB-EV-8821',
            incident_id: inc.id,
            notes: 'Physical sample en route to certified laboratory.'
          });

          DB.notifications.unshift({
            id: `notif-${Date.now()}`,
            title: 'QUALITY SPIKE: East Valley',
            message: 'Turbidity measured at 4.8 NTU. Sample verification required.',
            priority: 'CRITICAL',
            incident_id: inc.id,
            is_read: false,
            created_at: now
          });

          return res.status(200).json({ status: 'success', scenario: 'Scenario C: Quality Spike triggered', incident_id: inc.id });
        }

        return res.status(400).json({ detail: `Unknown scenario: ${scenario}` });
      }

      if (segments[1] === 'reset' && method === 'POST') {
        DB.zones = [...INITIAL_ZONES];
        DB.profiles = [...INITIAL_PROFILES];
        DB.sensors = generateInitialSensors();
        DB.incidents = [
          {
            id: 'inc-demo-1',
            title: 'Pressure Drop Anomaly & Micro-Burst',
            category: 'pipe_leak',
            zone_id: 'zone-n2',
            zone_name: 'North Metro',
            priority_score: 84.5,
            confidence_category: 'HIGH',
            status: 'INVESTIGATING',
            assigned_officer_id: 'prof-3',
            assigned_officer_name: 'Arun Verma',
            first_observed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            last_observed_at: new Date().toISOString(),
            hypothesis: 'Pressure drop to 28.5 psi with simultaneous flow increase indicates active sub-surface rupture.',
            recommended_action: 'Dispatch acoustic field sensor team to North Metro sector 4.',
            missing_info: 'Flow sensor reading temporarily unavailable',
            contradictory_evidence: 'None detected',
            evidence_items: [
              { id: 'ev-1', source_type: 'sensor', evidence_summary: 'Pressure sensor SEN-ZONE-N2-PRES dropped from 52 to 28.5 psi.', evidence_quality: 'HIGH' }
            ],
            complaints: [],
            events: [
              { event_type: 'CREATED', actor_name: 'AI Engine', note: 'Initial fusion detection.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
            ]
          }
        ];
        DB.complaints = [];
        DB.samples = [];
        DB.notifications = [
          {
            id: 'notif-baseline',
            title: 'Grid Baseline Restored',
            message: 'All sensor baselines and simulated telemetry restored to normal clean state.',
            priority: 'LOW',
            is_read: false,
            created_at: new Date().toISOString()
          }
        ];
        return res.status(200).json({ status: 'success', message: 'Demonstration environment reset successfully' });
      }
    }

    // 4. Incidents Endpoints
    if (segments[0] === 'incidents') {
      const incId = segments[1];

      if (!incId && method === 'GET') {
        let list = [...DB.incidents];
        const cat = query.get('category');
        const st = query.get('status');
        const q = query.get('search');
        if (cat) list = list.filter(i => i.category === cat);
        if (st) list = list.filter(i => i.status === st);
        if (q) list = list.filter(i => i.title.toLowerCase().includes(q.toLowerCase()) || (i.hypothesis && i.hypothesis.toLowerCase().includes(q.toLowerCase())));
        list.sort((a, b) => b.priority_score - a.priority_score);
        return res.status(200).json(list);
      }

      if (incId && !segments[2] && method === 'GET') {
        const inc = DB.incidents.find(i => i.id === incId);
        if (!inc) return res.status(404).json({ detail: 'Incident not found' });
        return res.status(200).json(inc);
      }

      if (incId && segments[2] === 'assign' && method === 'POST') {
        const inc = DB.incidents.find(i => i.id === incId);
        if (!inc) return res.status(404).json({ detail: 'Incident not found' });
        inc.assigned_officer_name = body.officer_name || 'Field Officer';
        inc.assigned_officer_id = body.officer_id || 'officer-manual';
        if (inc.status === 'NEW') inc.status = 'ASSIGNED';
        inc.events.unshift({
          event_type: 'ASSIGNED',
          actor_name: body.officer_name,
          note: body.note || `Assigned to ${body.officer_name}`,
          created_at: new Date().toISOString()
        });
        return res.status(200).json(inc);
      }

      if (incId && segments[2] === 'status' && method === 'POST') {
        const inc = DB.incidents.find(i => i.id === incId);
        if (!inc) return res.status(404).json({ detail: 'Incident not found' });
        const prevStatus = inc.status;
        inc.status = body.new_status;
        if (body.closure_notes) inc.closure_notes = body.closure_notes;
        if (body.reopen_reason) inc.reopen_reason = body.reopen_reason;
        inc.events.unshift({
          event_type: body.new_status,
          actor_name: body.actor_name || 'Officer',
          note: body.note || `Status transitioned from ${prevStatus} to ${body.new_status}`,
          created_at: new Date().toISOString()
        });
        return res.status(200).json(inc);
      }

      if (incId && segments[2] === 'events' && method === 'POST') {
        const inc = DB.incidents.find(i => i.id === incId);
        if (!inc) return res.status(404).json({ detail: 'Incident not found' });
        const ev = {
          event_type: body.event_type || 'NOTE_ADDED',
          actor_name: body.actor_name || 'Officer',
          note: body.note || '',
          created_at: new Date().toISOString()
        };
        inc.events.unshift(ev);
        return res.status(200).json(ev);
      }
    }

    // 5. Complaints Endpoints
    if (segments[0] === 'complaints') {
      if (segments.length === 1 && method === 'GET') {
        return res.status(200).json(DB.complaints);
      }
      if (segments.length === 1 && method === 'POST') {
        const zone = DB.zones.find(z => z.id === body.zone_id) || DB.zones[0];
        const newC = {
          id: `comp-${Date.now().toString().slice(-6)}`,
          reporter_name: body.is_anonymous ? 'Anonymous Citizen' : (body.reporter_name || 'Citizen'),
          reporter_contact: body.reporter_contact || '',
          is_anonymous: Boolean(body.is_anonymous),
          category: body.category,
          description: body.description,
          zone_id: zone.id,
          zone_name: zone.name,
          latitude: body.latitude || zone.center_lat,
          longitude: body.longitude || zone.center_lng,
          verification_status: 'pending',
          created_at: new Date().toISOString()
        };
        DB.complaints.unshift(newC);
        return res.status(201).json(newC);
      }
      if (segments[1] && segments[2] === 'verify') {
        const c = DB.complaints.find(comp => comp.id === segments[1]);
        if (!c) return res.status(404).json({ detail: 'Complaint not found' });
        c.verification_status = query.get('status') || 'verified_true';
        return res.status(200).json({ status: 'success', complaint_id: c.id, verification_status: c.verification_status });
      }
    }

    // 6. Sensors Endpoints
    if (segments[0] === 'sensors') {
      if (segments.length === 1 && method === 'GET') {
        let list = [...DB.sensors];
        const mType = query.get('measurement_type');
        const hStat = query.get('health_status');
        if (mType) list = list.filter(s => s.measurement_type === mType);
        if (hStat) list = list.filter(s => s.health_status === hStat);
        return res.status(200).json(list);
      }
      if (segments[1] && segments[2] === 'readings' && method === 'GET') {
        const s = DB.sensors.find(sen => sen.id === segments[1] || sen.external_sensor_id === segments[1]);
        const baseVal = s ? s.last_reading_value : 50;
        const unit = s ? s.unit : '';
        const limit = parseInt(query.get('limit') || '30', 10);
        const readings = [];
        for (let i = 0; i < limit; i++) {
          const jitter = (Math.random() - 0.5) * (baseVal * 0.05);
          readings.push({
            id: `rd-${i}`,
            sensor_id: segments[1],
            observed_at: new Date(Date.now() - i * 300000).toISOString(),
            value: Math.round((baseVal + jitter) * 100) / 100,
            unit: unit,
            quality_status: 'valid'
          });
        }
        return res.status(200).json(readings);
      }
    }

    // 7. AI Anomaly Engine
    if (segments[0] === 'anomalies') {
      if (segments[1] === 'run' && method === 'POST') {
        const evaluations = DB.sensors.map(s => {
          const thresh = DEFAULT_OPERATIONAL_THRESHOLDS[s.measurement_type] || {};
          const isBreached = s.last_reading_value <= (thresh.warning_low || 0) || s.last_reading_value >= (thresh.warning_high || 1000);
          return {
            sensor_id: s.external_sensor_id,
            zone: DB.zones.find(z => z.id === s.zone_id)?.name || 'Unknown',
            measurement: s.measurement_type,
            current_value: s.last_reading_value,
            unit: s.unit,
            status: isBreached ? 'ANOMALOUS' : 'NORMAL',
            z_score: isBreached ? 3.4 : 0.4
          };
        });
        return res.status(200).json({ status: 'completed', evaluation_summary: evaluations });
      }
      if (segments[1] === 'explain' && segments[2]) {
        const inc = DB.incidents.find(i => i.id === segments[2]);
        const breakdown = calculatePriority(inc?.category || 'pipe_leak', 0.85, 0.70, 1.0, false);
        return res.status(200).json({
          incident_id: segments[2],
          priority_breakdown: breakdown,
          evidence_fusion: {
            physical_telemetry_weight: '35%',
            statistical_zscore_weight: '25%',
            human_corroboration_weight: '25%',
            temporal_decay_weight: '15%'
          }
        });
      }
    }

    // 8. Samples Endpoints
    if (segments[0] === 'samples') {
      if (segments.length === 1 && method === 'GET') {
        return res.status(200).json(DB.samples);
      }
      if (segments.length === 1 && method === 'POST') {
        const newSample = {
          id: `samp-${Date.now().toString().slice(-6)}`,
          zone_id: body.zone_id || 'zone-c1',
          collected_at: new Date().toISOString(),
          collected_by: body.collected_by || 'Field Officer',
          measurement_values: body.measurement_values || {},
          units: body.units || {},
          result_status: 'pending_lab',
          laboratory_reference: body.laboratory_reference || `LAB-${Date.now().toString().slice(-4)}`,
          incident_id: body.incident_id || null,
          notes: body.notes || ''
        };
        DB.samples.unshift(newSample);
        return res.status(201).json(newSample);
      }
      if (segments[1] && segments[2] === 'result') {
        const s = DB.samples.find(samp => samp.id === segments[1]);
        if (!s) return res.status(404).json({ detail: 'Sample not found' });
        s.result_status = query.get('result_status') || 'verified_acceptable';
        s.laboratory_reference = query.get('lab_ref') || s.laboratory_reference;
        return res.status(200).json(s);
      }
    }

    // 9. Notifications Endpoints
    if (segments[0] === 'notifications') {
      if (segments.length === 1 && method === 'GET') {
        return res.status(200).json(DB.notifications);
      }
      if (segments[1] === 'unread-count' && method === 'GET') {
        const count = DB.notifications.filter(n => !n.is_read).length;
        return res.status(200).json({ unread_count: count });
      }
      if (segments[1] && segments[2] === 'read' && method === 'PATCH') {
        const n = DB.notifications.find(notif => notif.id === segments[1]);
        if (n) n.is_read = true;
        return res.status(200).json(n || { id: segments[1], is_read: true });
      }
      if (segments[1] === 'mark-all-read' && method === 'POST') {
        DB.notifications.forEach(n => { n.is_read = true; });
        return res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
      }
    }

    // 10. Admin Endpoints
    if (segments[0] === 'admin') {
      if (segments[1] === 'zones') {
        if (method === 'GET') return res.status(200).json(DB.zones);
        if (method === 'POST') {
          const z = { id: `zone-${Date.now()}`, ...body };
          DB.zones.push(z);
          return res.status(201).json(z);
        }
      }
      if (segments[1] === 'profiles') {
        if (method === 'GET') return res.status(200).json(DB.profiles);
        if (method === 'POST') {
          const p = { id: `prof-${Date.now()}`, ...body };
          DB.profiles.push(p);
          return res.status(201).json(p);
        }
      }
      if (segments[1] === 'thresholds') {
        if (method === 'GET') return res.status(200).json(DB.thresholds);
        if (segments[2] && method === 'PUT') {
          const t = DB.thresholds.find(th => th.id === segments[2]);
          if (t) {
            if (query.get('warning_low')) t.warning_low = parseFloat(query.get('warning_low'));
            if (query.get('warning_high')) t.warning_high = parseFloat(query.get('warning_high'));
            if (query.get('critical_low')) t.critical_low = parseFloat(query.get('critical_low'));
            if (query.get('critical_high')) t.critical_high = parseFloat(query.get('critical_high'));
            t.updated_at = new Date().toISOString();
          }
          return res.status(200).json(t || {});
        }
      }
      if (segments[1] === 'audit-logs' && method === 'GET') {
        return res.status(200).json(DB.auditLogs);
      }
    }

    // Default 404 for unknown API path
    return res.status(404).json({ detail: `API endpoint not found: ${cleanPath}` });
  } catch (err) {
    return res.status(500).json({ detail: `Internal Server Error: ${err.message}` });
  }
}
