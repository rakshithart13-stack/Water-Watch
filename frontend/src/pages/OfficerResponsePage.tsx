import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, CheckCircle, FileText, Wrench, FlaskConical, MessageSquare, AlertTriangle, ArrowRight, RefreshCw, RefreshCcw } from 'lucide-react';
import { api } from '../api/client';
import { Incident } from '../types';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';

export const OfficerResponsePage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form actions
  const [officerName, setOfficerName] = useState('Arun Verma (Field Engineer)');
  const [actionType, setActionType] = useState<'note' | 'sample' | 'lab' | 'repair' | 'resolve' | 'reopen'>('note');
  const [noteContent, setNoteContent] = useState('');
  const [labRef, setLabRef] = useState('');
  const [labResult, setLabResult] = useState('verified_acceptable');
  const [reopenReason, setReopenReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const data = await api.listIncidents({ sort_by: 'priority', sort_order: 'desc' });
      setIncidents(data);
      if (data.length > 0 && !selectedIncidentId) {
        setSelectedIncidentId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const activeIncident = incidents.find(i => i.id === selectedIncidentId);

  const handleExecuteAction = async () => {
    if (!selectedIncidentId) return;
    try {
      setSubmitting(true);
      setSuccessMsg(null);

      if (actionType === 'note') {
        if (!noteContent.trim()) return;
        await api.addIncidentEvent(selectedIncidentId, {
          actor_name: officerName,
          event_type: 'INSPECTION_NOTE',
          note: noteContent,
        });
        setSuccessMsg('Inspection note added to lifecycle audit trail.');
      } else if (actionType === 'sample') {
        await api.recordSample({
          zone_id: activeIncident?.zone_id || 'zone',
          collected_by: officerName,
          measurement_values: { turbidity: 1.2, ph: 7.2 },
          units: { turbidity: 'NTU', ph: 'pH' },
          result_status: 'pending_lab',
          incident_id: selectedIncidentId,
          notes: noteContent || 'Physical grab sample collected for certified lab analysis.',
        });
        await api.updateIncidentStatus(selectedIncidentId, {
          new_status: 'AWAITING_SAMPLE',
          actor_name: officerName,
          note: 'Grab sample dispatched to laboratory.',
        });
        setSuccessMsg('Sample collection logged. Incident transitioned to AWAITING_SAMPLE.');
      } else if (actionType === 'lab') {
        if (!labRef.trim()) {
          alert('Please enter a Laboratory Reference ID');
          return;
        }
        await api.addIncidentEvent(selectedIncidentId, {
          actor_name: officerName,
          event_type: 'LAB_RESULT_RECORDED',
          note: `Lab analysis completed. Result: ${labResult.toUpperCase()} (Ref: ${labRef}). ${noteContent}`,
        });
        setSuccessMsg('Laboratory analysis result logged.');
      } else if (actionType === 'repair') {
        await api.addIncidentEvent(selectedIncidentId, {
          actor_name: officerName,
          event_type: 'REPAIR_LOGGED',
          note: `Maintenance completed: ${noteContent || 'Replaced pipe gasket / serviced valve cluster.'}`,
        });
        await api.updateIncidentStatus(selectedIncidentId, {
          new_status: 'RESOLVED',
          actor_name: officerName,
          closure_notes: noteContent || 'Repaired and hydro-tested.',
        });
        setSuccessMsg('Repair logged and incident marked as RESOLVED.');
      } else if (actionType === 'resolve') {
        await api.updateIncidentStatus(selectedIncidentId, {
          new_status: 'RESOLVED',
          actor_name: officerName,
          closure_notes: noteContent || 'Resolved via field inspection verification.',
        });
        setSuccessMsg('Incident resolved successfully.');
      } else if (actionType === 'reopen') {
        if (!reopenReason.trim()) {
          alert('Mandatory documented reopen reason required.');
          return;
        }
        await api.updateIncidentStatus(selectedIncidentId, {
          new_status: 'INVESTIGATING',
          actor_name: officerName,
          reopen_reason: reopenReason,
          note: `Reopened: ${reopenReason}`,
        });
        setSuccessMsg('Incident reopened for investigation.');
      }

      setNoteContent('');
      setLabRef('');
      setReopenReason('');
      await loadIncidents();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-aqua" /> Officer Response & Field Incident Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforced state machine lifecycle from detection, physical sampling, and maintenance to closure.
          </p>
        </div>

        <button
          onClick={loadIncidents}
          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-300 text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-aqua" /> Refresh Response Center
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Detail & Action Form (2 Cols) */}
        {activeIncident ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-darkBg text-slate-400 border border-surfaceBorder">
                    #{activeIncident.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={activeIncident.status} />
                  <PriorityBadge score={activeIncident.priority_score} confidence={activeIncident.confidence_category} />
                </div>
                <span className="text-xs text-slate-400">
                  Assigned: <strong className="text-white">{activeIncident.assigned_officer_name || 'Unassigned'}</strong>
                </span>
              </div>

              <h2 className="text-lg font-bold text-white">{activeIncident.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{activeIncident.hypothesis}</p>

              {/* Action Form */}
              <div className="p-4 rounded-xl bg-darkBg/80 border border-surfaceBorder space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-aqua uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" /> Record Field Action & Transition State
                  </span>
                  <span className="text-[10px] text-slate-400">State Machine Enforced</span>
                </div>

                {/* Officer Persona Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Officer Persona:</span>
                  <select
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded bg-surface border border-surfaceBorder text-white focus:outline-none"
                  >
                    <option value="Arun Verma (Field Engineer)">Arun Verma (Field Distribution Engineer)</option>
                    <option value="Priya Sharma (Quality Analyst)">Priya Sharma (Water Quality Analyst)</option>
                    <option value="Rajesh Kumar (Senior Inspector)">Rajesh Kumar (Senior Inspector)</option>
                  </select>
                </div>

                {/* Action Type Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActionType('note')}
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      actionType === 'note' ? 'bg-aqua/20 text-aqua border-aqua/40' : 'bg-surface border-surfaceBorder text-slate-400'
                    }`}
                  >
                    Site Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('sample')}
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      actionType === 'sample' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-surface border-surfaceBorder text-slate-400'
                    }`}
                  >
                    Sample Grab
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('lab')}
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      actionType === 'lab' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-surface border-surfaceBorder text-slate-400'
                    }`}
                  >
                    Lab Results
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('repair')}
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      actionType === 'repair' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-surface border-surfaceBorder text-slate-400'
                    }`}
                  >
                    Repair Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('resolve')}
                    className={`p-2 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      actionType === 'resolve' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-surface border-surfaceBorder text-slate-400'
                    }`}
                  >
                    Resolve Ticket
                  </button>
                </div>

                {/* Specific Fields */}
                {actionType === 'lab' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface rounded-lg">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Laboratory Reference ID</label>
                      <input
                        type="text"
                        value={labRef}
                        onChange={(e) => setLabRef(e.target.value)}
                        placeholder="e.g. LAB-MICRO-2026-904"
                        className="w-full text-xs p-2 rounded bg-darkBg border border-surfaceBorder text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Verified Finding</label>
                      <select
                        value={labResult}
                        onChange={(e) => setLabResult(e.target.value)}
                        className="w-full text-xs p-2 rounded bg-darkBg border border-surfaceBorder text-white"
                      >
                        <option value="verified_acceptable">Verified Potable / Acceptable</option>
                        <option value="verified_anomalous">Verified Anomalous / Contaminant Detected</option>
                        <option value="inconclusive">Inconclusive — Retest Requested</option>
                      </select>
                    </div>
                  </div>
                )}

                {actionType === 'reopen' && (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg">
                    <label className="text-[10px] text-rose-300 uppercase font-bold block mb-1">Documented Reopen Reason</label>
                    <input
                      type="text"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="e.g. Second leak reported 10m downstream after valve pressurization"
                      className="w-full text-xs p-2 rounded bg-darkBg border border-surfaceBorder text-white"
                    />
                  </div>
                )}

                {/* Details TextArea */}
                <div>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                    placeholder="Enter observation notes, physical pipe inspection details, or action summary..."
                    className="w-full text-xs p-2.5 rounded-lg bg-surface border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
                  />
                </div>

                {successMsg && (
                  <div className="p-2.5 rounded-lg bg-succ/15 border border-succ/30 text-succ text-xs flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> {successMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  {(activeIncident.status === 'RESOLVED' || activeIncident.status === 'CLOSED') && (
                    <button
                      type="button"
                      onClick={() => setActionType('reopen')}
                      className="text-xs text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCcw className="w-3 h-3" /> Reopen This Incident
                    </button>
                  )}
                  <button
                    onClick={handleExecuteAction}
                    disabled={submitting}
                    className="ml-auto px-4 py-2 rounded-lg bg-aqua hover:bg-aqua-hover text-darkBg font-bold text-xs transition-colors shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Executing...' : 'Commit Lifecycle Event'}
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Trail Timeline */}
            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-aqua" /> Enforced Event & Investigation History
              </h3>

              <div className="relative pl-4 border-l border-surfaceBorder space-y-4 pt-2">
                {activeIncident.events?.map((ev, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-aqua border-2 border-surface"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{ev.event_type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">by {ev.actor_name}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.note && <p className="text-xs text-slate-300 mt-1 leading-relaxed">{ev.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-16 rounded-xl bg-surface border border-surfaceBorder text-center text-xs text-slate-400">
            Select an incident to view assigned officer response controls.
          </div>
        )}

        {/* Incidents Queue (1 Col) */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col h-[640px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-surfaceBorder flex items-center justify-between">
            <span>Response Queue</span>
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
                    <StatusBadge status={inc.status} />
                    <PriorityBadge score={inc.priority_score} confidence={inc.confidence_category} showLabel={false} />
                  </div>
                  <h4 className={`text-xs font-bold ${isSelected ? 'text-aqua' : 'text-white'} line-clamp-1`}>
                    {inc.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>{inc.zone_name}</span>
                    <span>Officer: <strong className="text-slate-200">{inc.assigned_officer_name || 'None'}</strong></span>
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
