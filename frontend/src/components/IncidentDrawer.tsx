import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Cpu, UserCheck, MessageSquare, AlertCircle, FileCheck, ArrowRight, RefreshCcw } from 'lucide-react';
import { Incident } from '../types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { api } from '../api/client';

interface IncidentDrawerProps {
  incidentId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const IncidentDrawer: React.FC<IncidentDrawerProps> = ({ incidentId, onClose, onRefresh }) => {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [explainData, setExplainData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionOfficer, setActionOfficer] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      setError(null);
      const [inc, exp] = await Promise.all([
        api.getIncident(incidentId),
        api.explainIncident(incidentId),
      ]);
      setIncident(inc);
      setExplainData(exp);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [incidentId]);

  if (!incidentId) return null;

  const handleAssign = async () => {
    if (!actionOfficer.trim()) return;
    try {
      setSubmitting(true);
      await api.assignIncident(incidentId, {
        officer_id: 'officer-manual',
        officer_name: actionOfficer,
        note: actionNote || undefined,
      });
      setActionNote('');
      setActionOfficer('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (targetStatus: string) => {
    try {
      setSubmitting(true);
      await api.updateIncidentStatus(incidentId, {
        new_status: targetStatus,
        actor_name: incident?.assigned_officer_name || 'Field Officer',
        note: actionNote || undefined,
        closure_notes: targetStatus === 'RESOLVED' || targetStatus === 'CLOSED' ? actionNote || 'Resolved via inspection verification' : undefined,
        reopen_reason: (incident?.status === 'RESOLVED' || incident?.status === 'CLOSED') ? (reopenReason || 'Reopened due to recurring citizen alerts') : undefined,
      });
      setActionNote('');
      setReopenReason('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Transition failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!actionNote.trim()) return;
    try {
      setSubmitting(true);
      await api.addIncidentEvent(incidentId, {
        actor_name: incident?.assigned_officer_name || 'Field Officer',
        event_type: 'NOTE_ADDED',
        note: actionNote,
      });
      setActionNote('');
      await loadData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-surface border-l border-surfaceBorder h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-surfaceBorder bg-darkBg/60 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                INCIDENT #{incidentId.slice(0, 8)}
              </span>
              {incident && <StatusBadge status={incident.status} />}
              {incident && (
                <PriorityBadge
                  score={incident.priority_score}
                  confidence={incident.confidence_category}
                  showLabel={false}
                />
              )}
            </div>
            <h2 className="text-base font-bold text-white leading-snug">{incident?.title || 'Loading incident...'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zone: <span className="text-aqua font-medium">{incident?.zone_name}</span> • First observed:{' '}
              {incident ? new Date(incident.first_observed_at).toLocaleString() : '...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surfaceCard transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              Loading multi-source intelligence records...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-crit/10 border border-crit/30 text-crit text-xs">{error}</div>
          ) : incident && (
            <>
              {/* AI Explainable Hypothesis Box */}
              <div className="p-4 rounded-xl bg-surfaceCard border border-surfaceBorder space-y-3">
                <div className="flex items-center gap-2 text-aqua text-xs font-bold uppercase tracking-wider">
                  <Cpu className="w-4 h-4" /> AI Hypothesis & Decision Explanation
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {incident.hypothesis}
                </p>

                {incident.recommended_action && (
                  <div className="p-3 rounded-lg bg-darkBg/60 border border-aqua/20 text-xs">
                    <span className="font-semibold text-aqua">Recommended Next Step: </span>
                    <span className="text-slate-300">{incident.recommended_action}</span>
                  </div>
                )}

                {incident.missing_info && incident.missing_info !== 'None detected' && (
                  <div className="text-[11px] text-warn flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Missing Evidence:</strong> {incident.missing_info}</span>
                  </div>
                )}

                {incident.contradictory_evidence && incident.contradictory_evidence !== 'None detected' && (
                  <div className="text-[11px] text-purple-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Contradictory Telemetry:</strong> {incident.contradictory_evidence}</span>
                  </div>
                )}
              </div>

              {/* Priority Model Breakdown */}
              {explainData?.priority_breakdown && (
                <div className="p-4 rounded-xl bg-surfaceCard border border-surfaceBorder space-y-2.5">
                  <h4 className="text-xs font-bold uppercase text-slate-300 flex items-center justify-between">
                    <span>Priority Score Calculation (0 - 100)</span>
                    <span className="text-aqua font-mono">{explainData.priority_breakdown.priority_score}/100</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {explainData.priority_breakdown.explanation}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="p-2 rounded bg-darkBg/60 border border-surfaceBorder text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Severity (35%)</div>
                      <div className="text-xs font-mono font-bold text-white mt-0.5">{explainData.priority_breakdown.severity_component}</div>
                    </div>
                    <div className="p-2 rounded bg-darkBg/60 border border-surfaceBorder text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Anomaly (25%)</div>
                      <div className="text-xs font-mono font-bold text-aqua mt-0.5">{explainData.priority_breakdown.anomaly_component}</div>
                    </div>
                    <div className="p-2 rounded bg-darkBg/60 border border-surfaceBorder text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Corroboration (25%)</div>
                      <div className="text-xs font-mono font-bold text-warn mt-0.5">{explainData.priority_breakdown.corroboration_component}</div>
                    </div>
                    <div className="p-2 rounded bg-darkBg/60 border border-surfaceBorder text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Age (15%)</div>
                      <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">{explainData.priority_breakdown.age_component}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Source Evidence Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-aqua" /> Multi-Source Evidence Fused ({incident.evidence_items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {incident.evidence_items && incident.evidence_items.length > 0 ? (
                    incident.evidence_items.map(ev => (
                      <div key={ev.id} className="p-3 rounded-lg bg-surfaceCard border border-surfaceBorder text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-aqua">
                            {ev.source_type} EVIDENCE
                          </span>
                          <span className={`text-[10px] font-semibold ${
                            ev.evidence_quality === 'HIGH' ? 'text-succ' : 'text-slate-400'
                          }`}>
                            Quality: {ev.evidence_quality}
                          </span>
                        </div>
                        <p className="text-slate-200 leading-relaxed">{ev.evidence_summary}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-darkBg/40 rounded-lg">No evidence records logged yet.</div>
                  )}
                </div>
              </div>

              {/* Corroborating Citizen Complaints */}
              {incident.complaints && incident.complaints.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-warn" /> Correlated Citizen Complaints ({incident.complaints.length})
                  </h4>
                  <div className="space-y-2">
                    {incident.complaints.map(c => (
                      <div key={c.id} className="p-3 rounded-lg bg-surfaceCard border border-surfaceBorder text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white">{c.reporter_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {c.verification_status}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{c.description}</p>
                        <div className="text-[10px] text-slate-500">{new Date(c.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incident Lifecycle Action Panel */}
              <div className="p-4 rounded-xl bg-darkBg/60 border border-surfaceBorder space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-aqua flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> Officer Workflow & Lifecycle Actions
                </h4>

                <div className="space-y-2">
                  <textarea
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Enter inspection findings, lab results, repair actions, or notes..."
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-lg bg-surface border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
                  />

                  {/* Reopen note if closed */}
                  {(incident.status === 'RESOLVED' || incident.status === 'CLOSED') && (
                    <input
                      type="text"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Mandatory reopen reason..."
                      className="w-full text-xs p-2 rounded-lg bg-surface border border-surfaceBorder text-white focus:outline-none focus:border-warn mb-2"
                    />
                  )}

                  {/* Quick status transition buttons based on current state */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {incident.status === 'NEW' && (
                      <button
                        disabled={submitting}
                        onClick={() => handleStatusTransition('TRIAGED')}
                        className="px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-semibold"
                      >
                        Mark Triaged →
                      </button>
                    )}

                    {(incident.status === 'NEW' || incident.status === 'TRIAGED') && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={actionOfficer}
                          onChange={(e) => setActionOfficer(e.target.value)}
                          placeholder="Officer name..."
                          className="text-xs px-2 py-1.5 rounded bg-surface border border-surfaceBorder text-white w-32"
                        />
                        <button
                          disabled={submitting || !actionOfficer}
                          onClick={handleAssign}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs font-semibold disabled:opacity-50"
                        >
                          Assign Incident
                        </button>
                      </div>
                    )}

                    {incident.status === 'ASSIGNED' && (
                      <button
                        disabled={submitting}
                        onClick={() => handleStatusTransition('INVESTIGATING')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 border border-amber-500/40 text-xs font-semibold"
                      >
                        Start Site Investigation →
                      </button>
                    )}

                    {incident.status === 'INVESTIGATING' && (
                      <>
                        <button
                          disabled={submitting}
                          onClick={() => handleStatusTransition('AWAITING_SAMPLE')}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600/30 text-cyan-300 hover:bg-cyan-600/50 border border-cyan-500/40 text-xs font-semibold"
                        >
                          Request Lab Sample
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleStatusTransition('AWAITING_REPAIR')}
                          className="px-3 py-1.5 rounded-lg bg-orange-600/30 text-orange-300 hover:bg-orange-600/50 border border-orange-500/40 text-xs font-semibold"
                        >
                          Dispatch Repair Crew
                        </button>
                        <button
                          disabled={submitting}
                          onClick={() => handleStatusTransition('RESOLVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
                        >
                          Resolve Incident ✓
                        </button>
                      </>
                    )}

                    {(incident.status === 'AWAITING_SAMPLE' || incident.status === 'AWAITING_REPAIR') && (
                      <button
                        disabled={submitting}
                        onClick={() => handleStatusTransition('RESOLVED')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
                      >
                        Verify Resolution ✓
                      </button>
                    )}

                    {incident.status === 'RESOLVED' && (
                      <button
                        disabled={submitting}
                        onClick={() => handleStatusTransition('CLOSED')}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold"
                      >
                        Close Ticket
                      </button>
                    )}

                    {(incident.status === 'RESOLVED' || incident.status === 'CLOSED') && (
                      <button
                        disabled={submitting || !reopenReason}
                        onClick={() => handleStatusTransition('INVESTIGATING')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600/30 text-rose-300 hover:bg-rose-600/50 border border-rose-500/40 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCcw className="w-3 h-3" /> Reopen Incident
                      </button>
                    )}

                    <button
                      disabled={submitting || !actionNote.trim()}
                      onClick={handleAddNote}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium ml-auto"
                    >
                      Post Note Only
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-aqua" /> Lifecycle Audit Trail ({incident.events?.length || 0})
                </h4>
                <div className="relative pl-4 border-l border-surfaceBorder space-y-4">
                  {incident.events?.map((ev, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-aqua border-2 border-surface"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{ev.event_type.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400">by {ev.actor_name}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">
                          {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {ev.note && <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ev.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
