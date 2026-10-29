import React, { useState, useEffect } from 'react';
import { Search, Filter, ShieldAlert, ArrowUpDown, ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../api/client';
import { Incident, Zone } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

interface IncidentMonitoringPageProps {
  onSelectIncident: (id: string) => void;
}

export const IncidentMonitoringPage: React.FC<IncidentMonitoringPageProps> = ({ onSelectIncident }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadData = async () => {
    try {
      setLoading(true);
      const [incData, zoneData] = await Promise.all([
        api.listIncidents({
          search: search || undefined,
          category: selectedCategory || undefined,
          status: selectedStatus || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        api.listZones(),
      ]);
      setIncidents(incData);
      setZones(zoneData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, selectedStatus, selectedZone, sortBy, sortOrder]);

  const filteredIncidents = selectedZone
    ? incidents.filter(i => i.zone_id === selectedZone)
    : incidents;

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedZone('');
    setSortBy('priority');
    setSortOrder('desc');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-crit" /> Incident Monitoring & Triage
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Prioritized operational queue with full multi-source evidence justification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-aqua" /> Refresh List
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-surface border border-surfaceBorder space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by keywords, zone, or hypothesis..."
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-slate-300 focus:outline-none focus:border-aqua"
            >
              <option value="">All Categories</option>
              <option value="pipe_leak">Pipe Leak</option>
              <option value="water_quality">Water Quality Anomaly</option>
              <option value="tank_maintenance">Tank Maintenance</option>
              <option value="sensor_fault">Sensor / Telemetry Fault</option>
              <option value="unclassified">Unclassified</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-slate-300 focus:outline-none focus:border-aqua"
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="TRIAGED">TRIAGED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="AWAITING_SAMPLE">AWAITING SAMPLE</option>
              <option value="AWAITING_REPAIR">AWAITING REPAIR</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Zone Filter */}
          <div>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-slate-300 focus:outline-none focus:border-aqua"
            >
              <option value="">All Zones</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-surfaceBorder/60 gap-2">
          <div className="flex items-center gap-3">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'priority') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('priority'); setSortOrder('desc'); }
              }}
              className={`font-semibold flex items-center gap-1 ${sortBy === 'priority' ? 'text-aqua' : 'text-slate-400'}`}
            >
              Priority Score {sortBy === 'priority' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'created_at') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                else { setSortBy('created_at'); setSortOrder('desc'); }
              }}
              className={`font-semibold flex items-center gap-1 ${sortBy === 'created_at' ? 'text-aqua' : 'text-slate-400'}`}
            >
              Age {sortBy === 'created_at' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>

          {(search || selectedCategory || selectedStatus || selectedZone) && (
            <button
              onClick={handleClearFilters}
              className="text-crit hover:underline flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Incidents List Table / Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs animate-pulse">
            Loading prioritized incidents...
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-surfaceBorder rounded-2xl space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200">No Incidents Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No incidents match your current search and filter criteria. Try resetting filters or triggering a demo scenario.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-lg bg-surfaceCard hover:bg-slate-700 text-xs text-aqua font-semibold border border-surfaceBorder inline-block"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredIncidents.map(inc => (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc.id)}
              className="p-4 sm:p-5 rounded-xl bg-surface border border-surfaceBorder hover:border-aqua/50 transition-all cursor-pointer group shadow-sm hover:shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-darkBg text-slate-400 border border-surfaceBorder">
                    #{inc.id.slice(0, 8)}
                  </span>
                  <PriorityBadge score={inc.priority_score} confidence={inc.confidence_category} />
                  <StatusBadge status={inc.status} />
                  <span className="text-xs font-semibold text-aqua capitalize">
                    {inc.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Reported: {new Date(inc.first_observed_at).toLocaleString()}
                </div>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-aqua transition-colors">
                {inc.title}
              </h3>

              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {inc.hypothesis}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-surfaceBorder/60 text-xs">
                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span>Zone: <strong className="text-slate-200">{inc.zone_name}</strong></span>
                  <span>Assigned: <strong className="text-slate-200">{inc.assigned_officer_name || 'Unassigned'}</strong></span>
                  <span>Evidence items: <strong className="text-aqua font-mono">{inc.evidence_items?.length || 0}</strong></span>
                </div>

                <span className="text-aqua text-xs font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Deep Dive & Respond <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
