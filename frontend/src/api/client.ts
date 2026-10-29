import {
  DashboardSummaryData,
  Incident,
  Sensor,
  SensorReading,
  Complaint,
  NotificationItem,
  Zone,
  ThresholdConfig,
  AuditLogItem
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorDetail = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) errorDetail = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboardSummary: () => fetchJson<DashboardSummaryData>('/dashboard/summary'),

  // Incidents
  listIncidents: (params?: { category?: string; status?: string; search?: string; sort_by?: string; sort_order?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    const qs = q.toString();
    return fetchJson<Incident[]>(`/incidents${qs ? `?${qs}` : ''}`);
  },
  getIncident: (id: string) => fetchJson<Incident>(`/incidents/${id}`),
  assignIncident: (id: string, payload: { officer_id: string; officer_name: string; note?: string }) =>
    fetchJson<Incident>(`/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateIncidentStatus: (id: string, payload: { new_status: string; actor_name: string; note?: string; closure_notes?: string; reopen_reason?: string }) =>
    fetchJson<Incident>(`/incidents/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  addIncidentEvent: (id: string, payload: { actor_name: string; event_type: string; note?: string }) =>
    fetchJson<any>(`/incidents/${id}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Complaints
  listComplaints: (params?: { category?: string; verification_status?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.verification_status) q.append('verification_status', params.verification_status);
    const qs = q.toString();
    return fetchJson<Complaint[]>(`/complaints${qs ? `?${qs}` : ''}`);
  },
  submitComplaint: (payload: { reporter_name?: string; reporter_contact?: string; is_anonymous: boolean; category: string; description: string; zone_id: string; latitude?: number; longitude?: number }) =>
    fetchJson<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyComplaint: (id: string, status: string, verified_by: string = 'Field Officer') =>
    fetchJson<{ status: string; complaint_id: string; verification_status: string }>(`/complaints/${id}/verify?status=${status}&verified_by=${encodeURIComponent(verified_by)}`, {
      method: 'PATCH',
    }),

  // Sensors
  listSensors: (params?: { measurement_type?: string; health_status?: string }) => {
    const q = new URLSearchParams();
    if (params?.measurement_type) q.append('measurement_type', params.measurement_type);
    if (params?.health_status) q.append('health_status', params.health_status);
    const qs = q.toString();
    return fetchJson<Sensor[]>(`/sensors${qs ? `?${qs}` : ''}`);
  },
  getSensorReadings: (sensorId: string, limit: number = 30) =>
    fetchJson<SensorReading[]>(`/sensors/${sensorId}/readings?limit=${limit}`),

  // AI Anomaly Engine
  runAnomalyPipeline: () => fetchJson<{ status: string; evaluation_summary: any[] }>('/anomalies/run', { method: 'POST' }),
  explainIncident: (id: string) => fetchJson<any>(`/anomalies/explain/${id}`),

  // Samples
  listSamples: () => fetchJson<any[]>('/samples'),
  recordSample: (payload: any) =>
    fetchJson<any>('/samples', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLabResult: (id: string, payload: { result_status: string; lab_ref: string; notes?: string }) =>
    fetchJson<any>(`/samples/${id}/result?result_status=${payload.result_status}&lab_ref=${encodeURIComponent(payload.lab_ref)}&notes=${encodeURIComponent(payload.notes || '')}`, {
      method: 'PATCH',
    }),

  // Notifications
  listNotifications: () => fetchJson<NotificationItem[]>('/notifications'),
  getUnreadCount: () => fetchJson<{ unread_count: number }>('/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    fetchJson<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fetchJson<{ status: string }>('/notifications/mark-all-read', { method: 'POST' }),

  // Demo
  triggerScenario: (name: string) =>
    fetchJson<{ status: string; scenario: string; incident_id?: string }>(`/demo/scenario/${name}`, { method: 'POST' }),
  resetDemo: () => fetchJson<{ status: string; message: string }>('/demo/reset', { method: 'POST' }),

  // Admin
  listZones: () => fetchJson<Zone[]>('/admin/zones'),
  listProfiles: () => fetchJson<any[]>('/admin/profiles'),
  listThresholds: () => fetchJson<ThresholdConfig[]>('/admin/thresholds'),
  updateThreshold: (id: string, payload: { warning_low: number; warning_high: number; critical_low: number; critical_high: number }) =>
    fetchJson<ThresholdConfig>(`/admin/thresholds/${id}?warning_low=${payload.warning_low}&warning_high=${payload.warning_high}&critical_low=${payload.critical_low}&critical_high=${payload.critical_high}`, {
      method: 'PUT',
    }),
  listAuditLogs: () => fetchJson<AuditLogItem[]>('/admin/audit-logs'),
};
