import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Radio
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { api } from '../api/client';
import { DashboardSummaryData, Incident, Sensor, Zone } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { IncidentMap } from '../components/IncidentMap';

interface DashboardPageProps {
  onSelectIncident: (id: string) => void;
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectIncident, onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    try {
      setRefreshing(true);
      const [sumData, incData, senData, zoneData] = await Promise.all([
        api.getDashboardSummary(),
        api.listIncidents({ sort_by: 'priority', sort_order: 'desc' }),
        api.listSensors(),
        api.listZones(),
      ]);
      setSummary(sumData);
      setIncidents(incData);
      setSensors(senData);
      setZones(zoneData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeIncidents = incidents.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Freshness */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Water Intelligence Command Center
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-succ/15 text-succ border border-succ/30 text-[10px] font-mono font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-succ animate-pulse"></span>
              Live Grid
            </span>
          </div>
          <p className="text-xs text-muted mt-1 font-medium">
            Real-time multi-source telemetry, statistical anomaly detection, and explainable priority triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/90 border border-surfaceBorder/80 text-xs text-slate-300 shadow-sm backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-aqua" />
            <span>
              Telemetry Freshness:{' '}
              <strong className="text-white font-mono">
                {summary?.last_data_sync ? new Date(summary.last_data_sync).toLocaleTimeString() : 'Syncing...'}
              </strong>
            </span>
          </div>

          <button
            onClick={loadAll}
            disabled={refreshing}
            className="p-2 rounded-xl bg-surface/90 hover:bg-surfaceCard border border-surfaceBorder hover:border-aqua/40 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Refresh Intelligence Data"
          >
            <RefreshCw className={`w-4 h-4 text-aqua ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Active Incidents */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-crit/80 flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Active Incidents</span>
            <div className="w-6 h-6 rounded-lg bg-crit/15 border border-crit/30 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-crit" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {summary?.total_active_incidents ?? 0}
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Under investigation</span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-crit flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Critical Priority</span>
            <div className="w-6 h-6 rounded-lg bg-crit/15 border border-crit/30 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-crit" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-crit font-mono tracking-tight">
              {summary?.critical_incidents ?? 0}
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Score &ge; 75/100</span>
          </div>
        </div>

        {/* High Priority */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-warn flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>High Priority</span>
            <div className="w-6 h-6 rounded-lg bg-warn/15 border border-warn/30 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-warn" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-warn font-mono tracking-tight">
              {summary?.high_priority_incidents ?? 0}
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Score 50-74/100</span>
          </div>
        </div>

        {/* Sensor Health Ratio */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-succ flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Sensors Online</span>
            <div className="w-6 h-6 rounded-lg bg-succ/15 border border-succ/30 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-succ" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-succ font-mono tracking-tight">
              {summary?.healthy_sensors ?? 0}
              <span className="text-base text-slate-500 font-normal">/{summary?.total_sensors ?? 0}</span>
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Telemetry healthy</span>
          </div>
        </div>

        {/* Complaints awaiting review */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-electric flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Pending Review</span>
            <div className="w-6 h-6 rounded-lg bg-electric/15 border border-electric/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-electric" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-electric font-mono tracking-tight">
              {summary?.complaints_awaiting_review ?? 0}
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Citizen reports</span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="p-4 rounded-2xl bg-surface/85 border border-surfaceBorder/80 border-t-2 border-t-aqua flex flex-col justify-between shadow-lg shadow-black/20 hover:border-surfaceBorder transition-all duration-200">
          <div className="flex items-center justify-between text-muted text-xs font-semibold">
            <span>Resolved / Closed</span>
            <div className="w-6 h-6 rounded-lg bg-aqua/15 border border-aqua/30 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-aqua" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-aqua font-mono tracking-tight">
              {(summary?.resolved_incidents ?? 0) + (summary?.closed_incidents ?? 0)}
            </span>
            <span className="text-[11px] text-muted block mt-0.5 font-medium">Verified solutions</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Real-Time Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geographic Incident Map (2 Cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-aqua animate-pulse" /> Live Geographic Incident Map
            </h2>
            <span className="text-[11px] text-muted font-mono">Bangalore Urban Water Distribution Grid</span>
          </div>

          <IncidentMap
            incidents={activeIncidents}
            sensors={sensors}
            zones={zones}
            onSelectIncident={onSelectIncident}
          />
        </div>

        {/* Recent Prioritized Alerts Feed (1 Col) */}
        <div className="p-5 rounded-2xl bg-surface/90 border border-surfaceBorder/80 flex flex-col h-[480px] shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3.5 border-b border-surfaceBorder/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-crit" /> Ranked Incidents Queue
            </h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-aqua hover:text-aqua-hover transition-colors flex items-center gap-0.5 font-medium"
            >
              All Incidents <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surfaceBorder/60 mt-2 pr-1 space-y-1">
            {incidents.length === 0 ? (
              <div className="text-center py-20 text-muted text-xs">No incidents currently flagged in queue.</div>
            ) : (
              incidents.slice(0, 6).map(inc => (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className={`py-3 text-left hover:bg-surfaceCard/80 rounded-xl px-3 transition-all duration-150 cursor-pointer group ${
                    inc.priority_score >= 75 ? 'border-l-2 border-crit' : inc.priority_score >= 50 ? 'border-l-2 border-warn' : 'border-l-2 border-electric'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <PriorityBadge score={inc.priority_score} confidence={inc.confidence_category} showLabel={false} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-aqua transition-colors line-clamp-1">
                    {inc.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {inc.hypothesis}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted mt-2">
                    <span className="text-slate-400 font-medium">{inc.zone_name}</span>
                    <span className="font-mono">{new Date(inc.first_observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid: Incident Trends & Category Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface/90 border border-surfaceBorder/80 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-aqua" /> 7-Day Incidents & Citizen Reports Correlation
            </h3>
            <span className="text-[11px] text-muted font-mono">Rolling Operational Trend</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.incident_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21D4E8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#21D4E8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="compColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2D', borderColor: '#1a2744', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                />
                <Area type="monotone" dataKey="incidents" stroke="#21D4E8" strokeWidth={2} fillOpacity={1} fill="url(#incColor)" name="Anomalies / Incidents" />
                <Area type="monotone" dataKey="complaints" stroke="#F5A623" strokeWidth={2} fillOpacity={1} fill="url(#compColor)" name="Citizen Complaints" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution (1 Col) */}
        <div className="p-6 rounded-2xl bg-surface/90 border border-surfaceBorder/80 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Incidents by Priority Band
            </h3>
            <span className="text-[11px] text-muted font-mono">Active Distribution</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.incidents_by_severity || []} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis dataKey="severity" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111C2D', borderColor: '#1a2744', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {summary?.incidents_by_severity?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
