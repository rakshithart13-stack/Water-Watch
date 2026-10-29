import React from 'react';
import { Droplet, Activity, Users, ShieldAlert, CheckCircle, ArrowRight, Layers, FileText, Cpu, Bell, Gauge } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: (page?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col selection:bg-aqua selection:text-darkBg">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-20 border-b border-surfaceBorder/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/25 via-darkBg/60 to-darkBg pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-aqua/10 border border-aqua/30 text-aqua text-xs font-semibold uppercase tracking-wider">
              <Droplet className="w-3.5 h-3.5 fill-current" />
              National Hackathon AI Prototype • Water Watch
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Explainable Water Anomaly Detection & Incident Response
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
              Leaking pipes and dirty tanks waste water and make communities vulnerable.
              <strong> Water Watch AI</strong> fuses real-time pipe telemetry, citizen complaints, and lab samples
              to isolate true infrastructure bursts from sensor faults, explaining every decision to the right response officer.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onEnterApp('dashboard')}
                className="px-6 py-3.5 rounded-xl bg-aqua hover:bg-aqua-hover text-darkBg font-bold text-sm shadow-xl shadow-aqua/25 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                Launch Intelligence Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEnterApp('anomaly_analysis')}
                className="px-6 py-3.5 rounded-xl bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Cpu className="w-4 h-4 text-aqua" /> View AI Anomaly Engine
              </button>
              <button
                onClick={() => onEnterApp('complaints')}
                className="px-6 py-3.5 rounded-xl bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-200 font-semibold text-sm transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-warn" /> Citizen Report Portal
              </button>
            </div>

            <div className="p-3 rounded-lg bg-surface/70 border border-warn/30 max-w-xl mx-auto text-xs text-slate-400 mt-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warn shrink-0"></span>
              <span>
                <strong>Demonstration Notice:</strong> All data, sensor telemetry, and events are deterministic synthetic simulations. Never replaces certified municipal laboratory verification.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Monitored Data Sources */}
      <section className="py-16 bg-darkBg border-b border-surfaceBorder/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">The Three Monitored Data Sources</h2>
            <p className="text-sm text-slate-400 mt-2">
              Unlike ordinary complaint portals, Water Watch triangulates evidence across physical and human telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder hover:border-aqua/40 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-aqua">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">1. Pipe Telemetry Stream</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Continuous monitoring of 7 physical and water-quality markers: Pressure, Flow Rate, Tank Levels, Turbidity, pH, Conductivity, and Temperature.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-surfaceBorder">
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-aqua" /> Unit-aware physical bounds validation</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-aqua" /> Frozen probe & flatline detection</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder hover:border-warn/40 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-warn/15 border border-warn/30 flex items-center justify-center text-warn">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">2. Citizen Complaint Correlator</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Decentralized citizen reporting for leaks, discolored water, and pressure dips with spatial-temporal grouping and deduplication.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-surfaceBorder">
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-warn" /> Haversine spatial proximity grouping</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-warn" /> Duplicate report deduplication</li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder hover:border-electric/40 transition-colors space-y-4">
              <div className="w-12 h-12 rounded-xl bg-electric/15 border border-electric/30 flex items-center justify-center text-electric">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">3. Physical Samples & Lab Records</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Field inspector grab samples and certified laboratory cultures for microbiological, chlorine, and chemical confirmation.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-surfaceBorder">
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-electric" /> WHO & EPA standard reference limits</li>
                <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-electric" /> Mandatory lab verification before closure</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How the Pipeline Works */}
      <section className="py-16 bg-surface/40 border-b border-surfaceBorder/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Multi-Source Evidence Fusion Engine</h2>
            <p className="text-sm text-slate-400 mt-2">
              From raw telemetry to officer closure in an explainable 4-phase architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-2.5">
              <span className="text-xs font-mono font-bold text-aqua">STEP 01</span>
              <h4 className="font-bold text-white text-sm">Data Validation & Baselines</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Applies rolling median and Median Absolute Deviation (MAD) to filter frozen probes, NaN values, and physical outliers.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-2.5">
              <span className="text-xs font-mono font-bold text-electric">STEP 02</span>
              <h4 className="font-bold text-white text-sm">Hybrid Anomaly Detection</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Combines statistical Z-scores, municipal operational thresholds, and Isolation Forest supplementary models.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-2.5">
              <span className="text-xs font-mono font-bold text-warn">STEP 03</span>
              <h4 className="font-bold text-white text-sm">Evidence Fusion & Priority</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Weighs severity, anomaly strength, corroborating citizen complaints, and data reliability penalty into a transparent 0-100 score.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface border border-surfaceBorder space-y-2.5">
              <span className="text-xs font-mono font-bold text-succ">STEP 04</span>
              <h4 className="font-bold text-white text-sm">Closed-Loop Incident Lifecycle</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Routes targeted alert to field team, tracks inspection notes, sample results, repair confirmation, and closure notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-darkBg border-t border-surfaceBorder text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplet className="w-4 h-4 text-aqua" />
            <span className="font-bold text-slate-300">Water Watch AI</span> — Built for National Hackathon
          </div>
          <div>
            Powered by FastAPI, Scikit-learn, React 18, Leaflet, and SQLite/PostgreSQL.
          </div>
        </div>
      </footer>
    </div>
  );
};
