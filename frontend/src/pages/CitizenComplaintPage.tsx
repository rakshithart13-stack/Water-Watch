import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Send, Users, ShieldAlert, Check, X } from 'lucide-react';
import { api } from '../api/client';
import { Complaint, Zone } from '../types';

export const CitizenComplaintPage: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState('water_leakage');
  const [description, setDescription] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zoneData, compData] = await Promise.all([
        api.listZones(),
        api.listComplaints(),
      ]);
      setZones(zoneData);
      setComplaints(compData);
      if (zoneData.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zoneData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('Please enter a description of the water problem.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      setSubmitSuccess(null);

      const zone = zones.find(z => z.id === selectedZoneId) || zones[0];
      const res = await api.submitComplaint({
        reporter_name: isAnonymous ? 'Anonymous Citizen' : (reporterName || 'Concerned Citizen'),
        reporter_contact: isAnonymous ? undefined : reporterContact,
        is_anonymous: isAnonymous,
        category: category,
        description: description,
        zone_id: zone.id,
        latitude: zone.center_lat,
        longitude: zone.center_lng,
      });

      setSubmitSuccess(`Complaint submitted successfully! Reference Ticket: #${res.id.slice(0, 8)}. Water Watch officers will review and triangulate.`);
      setDescription('');
      setReporterName('');
      setReporterContact('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (complaintId: string, status: string) => {
    try {
      await api.verifyComplaint(complaintId, status);
      await loadData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-warn" /> Citizen Water Quality & Leakage Reporting
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit suspected pipe leaks, pressure interruptions, or dirty tank water. Citizen submissions are validated and correlated before becoming confirmed incidents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Form (1 Col) */}
        <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-aqua" /> File Citizen Water Issue
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Anonymous Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anon"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded bg-darkBg border-surfaceBorder text-aqua focus:ring-0"
              />
              <label htmlFor="anon" className="text-xs text-slate-300 cursor-pointer">
                Submit Anonymously (Identity Protected)
              </label>
            </div>

            {!isAnonymous && (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full text-xs p-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Contact Phone / Email</label>
                  <input
                    type="text"
                    value={reporterContact}
                    onChange={(e) => setReporterContact(e.target.value)}
                    placeholder="+91 98450 XXXXX"
                    className="w-full text-xs p-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
                  />
                </div>
              </>
            )}

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Problem Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
              >
                <option value="water_leakage">Water Leakage / Pipe Burst</option>
                <option value="low_pressure">Severe Low Pressure</option>
                <option value="discolored_water">Discolored / Brownish Water</option>
                <option value="odor_taste">Unusual Odor or Taste</option>
                <option value="dirty_tank">Dirty Tank / Sediment Accumulation</option>
                <option value="supply_interruption">Water Supply Interruption</option>
                <option value="other">Other Anomaly</option>
              </select>
            </div>

            {/* Zone */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Your Sector / Zone</label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Detailed Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what you observed (e.g. street pooling, muddy water from kitchen tap, time started)..."
                className="w-full text-xs p-2.5 rounded-lg bg-darkBg border border-surfaceBorder text-white focus:outline-none focus:border-aqua"
              />
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-crit/15 border border-crit/30 text-crit text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {formError}
              </div>
            )}

            {submitSuccess && (
              <div className="p-2.5 rounded-lg bg-succ/15 border border-succ/30 text-succ text-xs flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> {submitSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-aqua hover:bg-aqua-hover text-darkBg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-aqua/20 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {submitting ? 'Submitting...' : 'Submit Report for Triage'}
            </button>
          </form>
        </div>

        {/* Existing Complaints Queue & Officer Verification (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Recent Citizen Reports ({complaints.length})
              </h2>
              <p className="text-[11px] text-slate-400">Officers review submissions to distinguish genuine corroboration from spam.</p>
            </div>
            <span className="text-[11px] text-aqua font-mono font-semibold">
              {complaints.filter(c => c.verification_status === 'pending').length} Pending Review
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs">Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">No complaints logged yet.</div>
            ) : (
              complaints.map(c => (
                <div key={c.id} className="p-3.5 rounded-lg bg-darkBg/60 border border-surfaceBorder space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{c.reporter_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface text-slate-300">
                        {c.zone_name}
                      </span>
                      <span className="text-[10px] font-semibold text-warn capitalize">
                        {c.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                        c.verification_status === 'verified_true'
                          ? 'bg-succ/15 text-succ'
                          : c.verification_status === 'grouped_duplicate'
                          ? 'bg-purple-500/15 text-purple-400'
                          : c.verification_status === 'verified_false'
                          ? 'bg-crit/15 text-crit'
                          : 'bg-warn/15 text-warn'
                      }`}>
                        {c.verification_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{c.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surfaceBorder/40 text-[11px] text-slate-400">
                    <span>{new Date(c.created_at).toLocaleString()}</span>

                    {/* Officer Verification Actions */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Officer Action:</span>
                      <button
                        onClick={() => handleVerify(c.id, 'verified_true')}
                        className="px-2 py-0.5 rounded bg-succ/10 hover:bg-succ/20 text-succ border border-succ/30 text-[10px] font-semibold flex items-center gap-1"
                        title="Mark as genuine corroborating report"
                      >
                        <Check className="w-2.5 h-2.5" /> Verify True
                      </button>
                      <button
                        onClick={() => handleVerify(c.id, 'grouped_duplicate')}
                        className="px-2 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-semibold"
                        title="Mark as duplicate repeated submission"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleVerify(c.id, 'verified_false')}
                        className="px-2 py-0.5 rounded bg-crit/10 hover:bg-crit/20 text-crit border border-crit/30 text-[10px] font-semibold flex items-center gap-1"
                        title="Reject as false report or hoax"
                      >
                        <X className="w-2.5 h-2.5" /> False
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
