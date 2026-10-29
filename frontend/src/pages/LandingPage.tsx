import React from 'react';
import { Droplet, Activity, Users, CheckCircle, ArrowRight, FileText, Cpu, Gauge, Sparkles, Waves, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: (page?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col selection:bg-aqua selection:text-darkBg relative overflow-hidden">
      {/* Background Decorative Ambient Lighting (Zen Inspired) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[650px] sm:w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(33,212,232,0.15),transparent_70%)] blur-3xl"></div>
        <div className="absolute top-[120px] left-1/4 w-[400px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(101,191,255,0.12),transparent_70%)] blur-3xl"></div>
        <div className="absolute top-[200px] right-1/4 w-[450px] h-[350px] bg-[radial-gradient(ellipse_at_center,rgba(67,217,208,0.08),transparent_70%)] blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 pt-16 sm:pt-24 pb-20 sm:pb-28 border-b border-surfaceBorder/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            {/* Top Tag Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surfaceCard/90 border border-aqua/30 text-aqua text-xs font-semibold uppercase tracking-widest shadow-lg shadow-aqua/5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-aqua animate-pulse"></span>
              <Droplet className="w-3.5 h-3.5 fill-current" />
              <span>National Hackathon AI Prototype • Water Watch</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Explainable Water Anomaly Detection &{' '}
              <span className="bg-gradient-to-r from-aqua via-electric to-accent bg-clip-text text-transparent">
                Incident Response
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal max-w-2xl mx-auto">
              Leaking pipes and dirty tanks waste municipal resources and compromise communities.
              <strong className="text-white"> Water Watch AI</strong> fuses real-time pipe telemetry, citizen complaints, and lab samples
              to isolate true infrastructure bursts from sensor faults, explaining every decision to the right response officer.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                onClick={() => onEnterApp('dashboard')}
                className="px-7 py-4 rounded-2xl bg-gradient-to-r from-aqua to-cyan-400 hover:from-aqua-hover hover:to-cyan-500 text-darkBg font-bold text-sm shadow-xl shadow-aqua/25 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Launch Intelligence Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onEnterApp('anomaly_analysis')}
                className="px-6 py-4 rounded-2xl bg-surface/90 hover:bg-surfaceCard border border-surfaceBorder hover:border-aqua/40 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <Cpu className="w-4 h-4 text-aqua" />
                <span>View AI Anomaly Engine</span>
              </button>
              
              <button
                onClick={() => onEnterApp('complaints')}
                className="px-6 py-4 rounded-2xl bg-surface/90 hover:bg-surfaceCard border border-surfaceBorder hover:border-warn/40 text-slate-200 font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md"
              >
                <Users className="w-4 h-4 text-warn" />
                <span>Citizen Report Portal</span>
              </button>
            </div>

            {/* Demonstration Notice */}
            <div className="p-3.5 rounded-xl bg-surfaceCard/70 border border-warn/30 max-w-xl mx-auto text-xs text-slate-300 flex items-center gap-2.5 backdrop-blur-md shadow-lg shadow-black/40">
              <span className="w-2 h-2 rounded-full bg-warn shrink-0 animate-pulse"></span>
              <span>
                <strong className="text-warn">Demonstration Notice:</strong> All data, sensor telemetry, and events are deterministic synthetic simulations. Never replaces certified municipal laboratory verification.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Monitored Data Sources */}
      <section className="py-20 bg-darkBg/90 relative z-10 border-b border-surfaceBorder/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-aqua">
              <Sparkles className="w-3.5 h-3.5" /> Multi-Source Fusion
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">The Three Monitored Data Sources</h2>
            <p className="text-sm text-muted">
              Unlike ordinary complaint portals, Water Watch triangulates evidence across physical and human telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="p-7 rounded-2xl bg-surface/80 border border-surfaceBorder hover:border-aqua/40 transition-all duration-300 space-y-5 hover:-translate-y-1 shadow-xl hover:shadow-aqua/5 backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-aqua/10 border border-aqua/30 flex items-center justify-center text-aqua shadow-inner">
                <Gauge className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">1. Pipe Telemetry Stream</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Continuous monitoring of 7 physical and water-quality markers: Pressure, Flow Rate, Tank Levels, Turbidity, pH, Conductivity, and Temperature.
              </p>
              <ul className="text-xs text-muted space-y-2 pt-3 border-t border-surfaceBorder/60">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-aqua" /> Unit-aware physical bounds validation</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-aqua" /> Frozen probe & flatline detection</li>
              </ul>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-2xl bg-surface/80 border border-surfaceBorder hover:border-warn/40 transition-all duration-300 space-y-5 hover:-translate-y-1 shadow-xl hover:shadow-warn/5 backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-warn/10 border border-warn/30 flex items-center justify-center text-warn shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">2. Citizen Complaint Correlator</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Decentralized citizen reporting for leaks, discolored water, and pressure dips with spatial-temporal grouping and deduplication.
              </p>
              <ul className="text-xs text-muted space-y-2 pt-3 border-t border-surfaceBorder/60">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-warn" /> Haversine spatial proximity grouping</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-warn" /> Duplicate report deduplication</li>
              </ul>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-2xl bg-surface/80 border border-surfaceBorder hover:border-electric/40 transition-all duration-300 space-y-5 hover:-translate-y-1 shadow-xl hover:shadow-electric/5 backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-electric/10 border border-electric/30 flex items-center justify-center text-electric shadow-inner">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">3. Physical Samples & Lab Records</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Field inspector grab samples and certified laboratory cultures for microbiological, chlorine, and chemical confirmation.
              </p>
              <ul className="text-xs text-muted space-y-2 pt-3 border-t border-surfaceBorder/60">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-electric" /> WHO & EPA standard reference limits</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-electric" /> Mandatory lab verification before closure</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How the Pipeline Works */}
      <section className="py-20 bg-surface/30 relative z-10 border-b border-surfaceBorder/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-electric">
              <Waves className="w-3.5 h-3.5" /> Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Multi-Source Evidence Fusion Engine</h2>
            <p className="text-sm text-muted">
              From raw telemetry to officer closure in an explainable 4-phase architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-surface/80 border border-surfaceBorder space-y-3 hover:border-aqua/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-aqua px-2 py-0.5 rounded bg-aqua/10 border border-aqua/20">STEP 01</span>
                <ShieldCheck className="w-4 h-4 text-aqua" />
              </div>
              <h4 className="font-bold text-white text-base">Data Validation & Baselines</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Applies rolling median and Median Absolute Deviation (MAD) to filter frozen probes, NaN values, and physical outliers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface/80 border border-surfaceBorder space-y-3 hover:border-electric/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-electric px-2 py-0.5 rounded bg-electric/10 border border-electric/20">STEP 02</span>
                <Activity className="w-4 h-4 text-electric" />
              </div>
              <h4 className="font-bold text-white text-base">Hybrid Anomaly Detection</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Combines statistical Z-scores, municipal operational thresholds, and Isolation Forest supplementary models.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface/80 border border-surfaceBorder space-y-3 hover:border-warn/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-warn px-2 py-0.5 rounded bg-warn/10 border border-warn/20">STEP 03</span>
                <Cpu className="w-4 h-4 text-warn" />
              </div>
              <h4 className="font-bold text-white text-base">Evidence Fusion & Priority</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Weighs severity, anomaly strength, corroborating citizen complaints, and data reliability penalty into a transparent 0-100 score.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface/80 border border-surfaceBorder space-y-3 hover:border-succ/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-succ px-2 py-0.5 rounded bg-succ/10 border border-succ/20">STEP 04</span>
                <CheckCircle className="w-4 h-4 text-succ" />
              </div>
              <h4 className="font-bold text-white text-base">Closed-Loop Incident Lifecycle</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Routes targeted alert to field team, tracks inspection notes, sample results, repair confirmation, and closure notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 bg-darkBg border-t border-surfaceBorder/80 text-xs text-muted relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-aqua/20 border border-aqua/40 flex items-center justify-center">
              <Droplet className="w-3.5 h-3.5 text-aqua fill-aqua" />
            </div>
            <span className="font-bold text-slate-200">Water Watch AI</span>
            <span className="text-[11px] text-muted">• National Hackathon Architecture</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-surfaceCard border border-surfaceBorder">FastAPI</span>
            <span className="px-2 py-0.5 rounded bg-surfaceCard border border-surfaceBorder">Scikit-learn</span>
            <span className="px-2 py-0.5 rounded bg-surfaceCard border border-surfaceBorder">React 18</span>
            <span className="px-2 py-0.5 rounded bg-surfaceCard border border-surfaceBorder">Leaflet</span>
            <span className="px-2 py-0.5 rounded bg-surfaceCard border border-surfaceBorder">Supabase PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
