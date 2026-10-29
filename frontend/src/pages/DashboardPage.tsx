import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Water Intelligence Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-source telemetry, statistical anomalies, and priority triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-surfaceBorder text-xs text-slate-300">
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
            className="p-2 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-300 hover:text-white transition-colors"
            title="Refresh Intelligence Data"
          >
            <RefreshCw className={`w-4 h-4 text-aqua ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Active Incidents */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Active Incidents</span>
            <ShieldAlert className="w-4 h-4 text-crit" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {summary?.total_active_incidents ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Under investigation</span>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Critical Priority</span>
            <AlertTriangle className="w-4 h-4 text-crit" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-crit font-mono">
              {summary?.critical_incidents ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Score &ge; 75/100</span>
          </div>
        </div>

        {/* High Priority */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>High Priority</span>
            <Activity className="w-4 h-4 text-warn" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-warn font-mono">
              {summary?.high_priority_incidents ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Score 50-74/100</span>
          </div>
        </div>

        {/* Sensor Health Ratio */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Sensors Online</span>
            <Activity className="w-4 h-4 text-succ" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-succ font-mono">
              {summary?.healthy_sensors ?? 0}
              <span className="text-base text-slate-500 font-normal">/{summary?.total_sensors ?? 0}</span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Telemetry healthy</span>
          </div>
        </div>

        {/* Complaints awaiting review */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pending Review</span>
            <Users className="w-4 h-4 text-electric" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-electric font-mono">
              {summary?.complaints_awaiting_review ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Citizen reports</span>
          </div>
        </div>

        {/* Resolved Incidents */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Resolved / Closed</span>
            <CheckCircle2 className="w-4 h-4 text-aqua" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-aqua font-mono">
              {(summary?.resolved_incidents ?? 0) + (summary?.closed_incidents ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Verified solutions</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Real-Time Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geographic Incident Map (2 Cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-aqua" /> Live Geographic Incident Map
            </h2>
            <span className="text-xs text-slate-400">Bangalore Urban Water Distribution Grid</span>
          </div>

          <IncidentMap
            incidents={activeIncidents}
            sensors={sensors}
            zones={zones}
            onSelectIncident={onSelectIncident}
          />
        </div>

        {/* Recent Prioritized Alerts Feed (1 Col) */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-crit" /> Ranked Incidents Queue
            </h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-aqua hover:underline flex items-center gap-0.5"
            >
              All Incidents <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-surfaceBorder/60 mt-2 pr-1">
            {incidents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">No incidents detected.</div>
            ) : (
              incidents.slice(0, 6).map(inc => (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className="py-3 text-left hover:bg-surfaceCard/60 rounded-lg px-2 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <PriorityBadge score={inc.priority_score} confidence={inc.confidence_category} showLabel={false} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-aqua transition-colors line-clamp-1">
                    {inc.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {inc.hypothesis}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span className="text-slate-400">{inc.zone_name}</span>
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
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-aqua" /> 7-Day Incidents & Citizen Reports Correlation
            </h3>
            <span className="text-[11px] text-slate-400">Rolling Operational Trend</span>
          </div>

          <div className="h-60 w-full">
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
                  contentStyle={{ backgroundColor: '#111E30', borderColor: '#20334E', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="incidents" stroke="#21D4E8" strokeWidth={2} fillOpacity={1} fill="url(#incColor)" name="Anomalies / Incidents" />
                <Area type="monotone" dataKey="complaints" stroke="#F5A623" strokeWidth={2} fillOpacity={1} fill="url(#compColor)" name="Citizen Complaints" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution (1 Col) */}
        <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Incidents by Priority Band
            </h3>
            <span className="text-[11px] text-slate-400">Active Distribution</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.incidents_by_severity || []} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis dataKey="severity" type="category" stroke="#94A3B8" fontSize={10} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111E30', borderColor: '#20334E', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
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
