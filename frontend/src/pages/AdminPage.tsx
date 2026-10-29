import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, FileSpreadsheet, RefreshCw, Download, Upload, CheckCircle, Database } from 'lucide-react';
import { api } from '../api/client';
import { ThresholdConfig, AuditLogItem, Zone } from '../types';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'thresholds' | 'audit' | 'data' | 'profiles'>('thresholds');
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit threshold modal/inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warnLow, setWarnLow] = useState<number>(0);
  const [warnHigh, setWarnHigh] = useState<number>(0);
  const [critLow, setCritLow] = useState<number>(0);
  const [critHigh, setCritHigh] = useState<number>(0);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tData, aData, zData] = await Promise.all([
        api.listThresholds(),
        api.listAuditLogs(),
        api.listZones(),
      ]);
      setThresholds(tData);
      setAuditLogs(aData);
      setZones(zData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEdit = (t: ThresholdConfig) => {
    setEditingId(t.id);
    setWarnLow(t.warning_low);
    setWarnHigh(t.warning_high);
    setCritLow(t.critical_low);
    setCritHigh(t.critical_high);
  };

  const handleSaveThreshold = async (id: string) => {
    try {
      await api.updateThreshold(id, {
        warning_low: warnLow,
        warning_high: warnHigh,
        critical_low: critLow,
        critical_high: critHigh,
      });
      setUpdateMsg('Operational threshold updated & logged in audit history.');
      setEditingId(null);
      await loadData();
      setTimeout(() => setUpdateMsg(null), 4000);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-aqua" /> System Administration & Operational Standards
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure reference thresholds, review immutable audit logs, and manage demonstration datasets.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-300 text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-aqua" /> Refresh Admin State
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surfaceBorder pb-2">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'thresholds' ? 'bg-aqua/20 text-aqua border border-aqua/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Threshold Configurations
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'audit' ? 'bg-aqua/20 text-aqua border border-aqua/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Immutable Audit Log
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'data' ? 'bg-aqua/20 text-aqua border border-aqua/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Data Import & Export
        </button>
      </div>

      {updateMsg && (
        <div className="p-3 rounded-lg bg-succ/15 border border-succ/30 text-succ text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {updateMsg}
        </div>
      )}

      {/* Tab 1: Threshold Configurations */}
      {activeTab === 'thresholds' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-surfaceBorder">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Configured Municipal Operational Thresholds & Safety Limits
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every measurement type has distinct physical units and standards. Warning boundaries trigger algorithmic flags, while Critical boundaries prompt high-priority triage alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {thresholds.map(t => {
              const isEditing = editingId === t.id;
              return (
                <div key={t.id} className="p-4 rounded-xl bg-surface border border-surfaceBorder space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surfaceBorder/60">
                    <div>
                      <h4 className="text-sm font-bold text-white capitalize">{t.measurement_type.replace('_', ' ')}</h4>
                      <span className="text-[11px] text-aqua font-mono">Unit: {t.unit}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-darkBg text-slate-400 font-mono">
                      {t.standard_reference}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-warn block">Warning Low</label>
                          <input
                            type="number"
                            step="any"
                            value={warnLow}
                            onChange={(e) => setWarnLow(parseFloat(e.target.value))}
                            className="w-full p-1.5 rounded bg-darkBg border border-surfaceBorder text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-warn block">Warning High</label>
                          <input
                            type="number"
                            step="any"
                            value={warnHigh}
                            onChange={(e) => setWarnHigh(parseFloat(e.target.value))}
                            className="w-full p-1.5 rounded bg-darkBg border border-surfaceBorder text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-crit block">Critical Low</label>
                          <input
                            type="number"
                            step="any"
                            value={critLow}
                            onChange={(e) => setCritLow(parseFloat(e.target.value))}
                            className="w-full p-1.5 rounded bg-darkBg border border-surfaceBorder text-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-crit block">Critical High</label>
                          <input
                            type="number"
                            step="any"
                            value={critHigh}
                            onChange={(e) => setCritHigh(parseFloat(e.target.value))}
                            className="w-full p-1.5 rounded bg-darkBg border border-surfaceBorder text-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleSaveThreshold(t.id)}
                          className="px-3 py-1 rounded bg-aqua hover:bg-aqua-hover text-darkBg font-bold text-xs"
                        >
                          Save Limits
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded bg-surfaceCard hover:bg-slate-700 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-darkBg/60">
                          <span className="text-[10px] text-slate-500 uppercase block">Optimal Buffer</span>
                          <span className="font-mono text-slate-200">{t.min_normal} – {t.max_normal} {t.unit}</span>
                        </div>
                        <div className="p-2 rounded bg-darkBg/60">
                          <span className="text-[10px] text-warn uppercase block">Warning Limits</span>
                          <span className="font-mono text-warn">{t.warning_low} / {t.warning_high} {t.unit}</span>
                        </div>
                        <div className="p-2 rounded bg-darkBg/60 col-span-2">
                          <span className="text-[10px] text-crit uppercase block">Critical Breach Threshold</span>
                          <span className="font-mono text-crit font-bold">&lt; {t.critical_low} or &gt; {t.critical_high} {t.unit}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => startEdit(t)}
                        className="text-xs text-aqua hover:underline pt-1 inline-block"
                      >
                        Edit Threshold Limits →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-2 border-b border-surfaceBorder">
            Immutable Audit Trail ({auditLogs.length} Events)
          </h3>

          <div className="divide-y divide-surfaceBorder/60 max-h-[550px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="py-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.action}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-darkBg text-aqua">
                      {log.target_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Actor: <strong className="text-white">{log.actor_name}</strong> ({log.actor_role})
                </div>
                {log.details && (
                  <pre className="text-[10px] font-mono p-2 rounded bg-darkBg/60 text-slate-400 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Data Import & Export */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download Sample CSVs */}
          <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-aqua" /> Download Standard Demonstration Datasets (CSV)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standardized schemas for testing ingestion, missing value recovery, frozen probes, and high-volume burst simulations.
            </p>

            <div className="space-y-2 pt-2">
              {[
                { name: 'sensor_readings.csv', desc: 'Time-series sensor readings with quality status flags' },
                { name: 'citizen_complaints.csv', desc: 'Simulated citizen reports with category & coordinate telemetry' },
                { name: 'water_quality_samples.csv', desc: 'Field grab samples and certified laboratory culture reports' },
                { name: 'sensor_metadata.csv', desc: 'Sensor deployment metadata with operational ranges and units' },
              ].map(f => (
                <div key={f.name} className="p-3 rounded-lg bg-darkBg border border-surfaceBorder flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-white">{f.name}</span>
                    <p className="text-[11px] text-slate-400">{f.desc}</p>
                  </div>
                  <a
                    href={`/api/admin/download-csv/${f.name}`}
                    download
                    className="px-2.5 py-1.5 rounded-md bg-aqua/15 text-aqua hover:bg-aqua/25 text-xs font-semibold flex items-center gap-1 border border-aqua/30"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Demonstration Mode & Reset */}
          <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-warn" /> Demonstration Environment Controls
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Reset demonstration records to default state or review configured zones. Protected from deleting non-simulated records.
            </p>

            <div className="p-4 rounded-lg bg-darkBg/60 border border-surfaceBorder space-y-3">
              <h4 className="text-xs font-bold text-slate-200">Active Supply Zones ({zones.length})</h4>
              <div className="space-y-1.5 text-xs">
                {zones.map(z => (
                  <div key={z.id} className="flex items-center justify-between text-slate-300 text-[11px]">
                    <span className="font-semibold text-white">{z.name}</span>
                    <span className="font-mono text-aqua">{z.code}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={async () => {
                  if (confirm('Reset demonstration dataset to clean baseline?')) {
                    await api.resetDemo();
                    alert('Demo environment reset successfully.');
                    await loadData();
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-crit/20 hover:bg-crit/30 text-crit border border-crit/40 font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Simulated Records to Default Seed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
