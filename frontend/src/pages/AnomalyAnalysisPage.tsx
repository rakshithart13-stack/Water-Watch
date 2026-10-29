import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Play, ShieldAlert, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { api } from '../api/client';
import { Incident } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';

interface AnomalyAnalysisPageProps {
  onSelectIncident: (id: string) => void;
}

export const AnomalyAnalysisPage: React.FC<AnomalyAnalysisPageProps> = ({ onSelectIncident }) => {
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [explainData, setExplainData] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const loadIncidents = async () => {
    try {
      const data = await api.listIncidents({ sort_by: 'priority', sort_order: 'desc' });
      setIncidents(data);
      if (data.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunPipeline = async () => {
    try {
      setRunning(true);
      const res = await api.runAnomalyPipeline();
      setPipelineResult(res);
      await loadIncidents();
    } catch (err: any) {
      alert(`Pipeline error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    const loadExplain = async () => {
      if (!selectedIncidentId) return;
      try {
        setLoadingExplain(true);
        const data = await api.explainIncident(selectedIncidentId);
        setExplainData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingExplain(false);
      }
    };
    loadExplain();
  }, [selectedIncidentId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-aqua" /> AI Anomaly Detection & Multi-Source Fusion Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explainable mathematical model distinguishing instrumentation faults from true distribution incidents.
          </p>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={running}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-aqua to-electric text-darkBg font-bold text-xs shadow-lg shadow-aqua/20 flex items-center gap-2 hover:opacity-95 transition-all disabled:opacity-50 self-start"
        >
          <Zap className={`w-3.5 h-3.5 fill-darkBg ${running ? 'animate-bounce' : ''}`} />
          {running ? 'Fusing Evidence...' : 'Run Fusion Pipeline Now'}
        </button>
      </div>

      {/* Pipeline Diagnostics Banner if recently run */}
      {pipelineResult && (
        <div className="p-4 rounded-xl bg-aqua/10 border border-aqua/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-aqua flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-succ" /> Multi-Source Fusion Pipeline Executed
            </span>
            <span className="font-mono text-[10px] text-slate-400">Timestamp: {pipelineResult.timestamp}</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            Analyzed {pipelineResult.zones_analyzed} distribution sectors. Robust statistical MAD and operational boundaries evaluated against active telemetry streams.
          </p>
        </div>
      )}

      {/* Main Split Layout: Incident Deep Dive & Incident Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deep Dive Explainability (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {loadingExplain ? (
            <div className="p-16 rounded-xl bg-surface border border-surfaceBorder text-center text-xs text-slate-400 animate-pulse">
              Computing explainability matrices & mathematical weights...
            </div>
          ) : explainData ? (
            <div className="space-y-4">
              {/* Hypothesis & Categorization Card */}
              <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-aqua uppercase">
                      {explainData.category.replace('_', ' ')}
                    </span>
                    <PriorityBadge score={explainData.priority_score} confidence={explainData.confidence_category} />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Observed: {new Date(explainData.first_observed_at).toLocaleString()}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-white leading-snug">{explainData.title}</h2>

                <div className="p-3.5 rounded-lg bg-surfaceCard border border-surfaceBorder text-xs space-y-2">
                  <div className="text-[11px] font-bold text-aqua uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Explainable Hypothesis
                  </div>
                  <p className="text-slate-200 leading-relaxed font-medium">{explainData.hypothesis}</p>
                </div>

                {/* Recommended Investigation */}
                <div className="p-3.5 rounded-lg bg-darkBg border border-aqua/30 text-xs space-y-1">
                  <span className="text-[11px] font-bold text-aqua uppercase">Suggested Next Field Action:</span>
                  <p className="text-slate-200">{explainData.recommended_action}</p>
                </div>

                {/* Evidence Caveats / Missing info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-darkBg/60 border border-surfaceBorder">
                    <span className="text-[10px] font-bold uppercase text-warn block mb-1">Missing Evidence</span>
                    <p className="text-slate-300 text-[11px]">{explainData.missing_info}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-darkBg/60 border border-surfaceBorder">
                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Contradictory Telemetry</span>
                    <p className="text-slate-300 text-[11px]">{explainData.contradictory_evidence}</p>
                  </div>
                </div>
              </div>

              {/* 0 - 100 Operational Priority Breakdown */}
              {explainData.priority_breakdown && (
                <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Transparent 0–100 Priority Scoring Model
                    </h3>
                    <span className="text-lg font-extrabold text-aqua font-mono">
                      {explainData.priority_breakdown.priority_score}/100
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explainData.priority_breakdown.explanation}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-darkBg border border-surfaceBorder text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Severity (35%)</span>
                      <span className="text-base font-bold text-white font-mono mt-1 block">
                        {explainData.priority_breakdown.severity_component}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-darkBg border border-surfaceBorder text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Anomaly Magnitude (25%)</span>
                      <span className="text-base font-bold text-aqua font-mono mt-1 block">
                        {explainData.priority_breakdown.anomaly_component}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-darkBg border border-surfaceBorder text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Corroboration (25%)</span>
                      <span className="text-base font-bold text-warn font-mono mt-1 block">
                        {explainData.priority_breakdown.corroboration_component}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-darkBg border border-surfaceBorder text-center">
                      <span className="text-[10px] text-slate-400 block uppercase">Age / Unresolved (15%)</span>
                      <span className="text-base font-bold text-slate-300 font-mono mt-1 block">
                        {explainData.priority_breakdown.age_component}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Zone Sensors Observed vs Expected Readings */}
              <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center justify-between">
                  <span>Zone Sensors: Observed vs Operational Limits</span>
                  <span className="text-[11px] text-slate-400 font-normal">{explainData.zone_name} Sector</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {explainData.zone_sensors?.map((s: any) => (
                    <div key={s.sensor_id} className="p-3 rounded-lg bg-darkBg/60 border border-surfaceBorder text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[150px]">{s.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          s.health_status === 'healthy' ? 'bg-succ/15 text-succ' : 'bg-warn/15 text-warn'
                        }`}>
                          {s.health_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Current Reading:</span>
                        <span className="font-mono font-bold text-aqua text-sm">{s.last_value ?? 'N/A'} {s.unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-surfaceBorder/40">
                        <span>Operational Buffer:</span>
                        <span className="font-mono">{s.min_operational} - {s.max_operational} {s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-xl bg-surface border border-surfaceBorder text-center text-xs text-slate-400">
              Select an incident from the right queue to inspect explainable AI telemetry.
            </div>
          )}
        </div>

        {/* Incidents Queue for Inspection (1 Col) */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col h-[640px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-surfaceBorder flex items-center justify-between">
            <span>Incidents for Explainability</span>
            <span className="text-aqua font-mono">{incidents.length}</span>
          </h3>

          <div className="flex-1 overflow-y-auto divide-y divide-surfaceBorder/60 mt-2 pr-1 space-y-1">
            {incidents.map(inc => {
              const isSelected = inc.id === selectedIncidentId;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors text-left ${
                    isSelected ? 'bg-aqua/15 border border-aqua/40' : 'hover:bg-surfaceCard/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <PriorityBadge score={inc.priority_score} confidence={inc.confidence_category} showLabel={false} />
                    <span className="text-[10px] font-mono uppercase text-slate-400">{inc.category.replace('_', ' ')}</span>
                  </div>
                  <h4 className={`text-xs font-bold ${isSelected ? 'text-aqua' : 'text-white'} line-clamp-1`}>
                    {inc.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {inc.hypothesis}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                    <span>{inc.zone_name}</span>
                    <span className="text-aqua font-semibold flex items-center gap-0.5">
                      Inspect Breakdown →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
