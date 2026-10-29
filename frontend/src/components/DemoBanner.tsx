import React, { useState } from 'react';
import { AlertTriangle, Play, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';

interface DemoBannerProps {
  onRefresh?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onRefresh }) => {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleTrigger = async (scenario: string, name: string) => {
    try {
      setTriggering(scenario);
      setMsg(null);
      await api.triggerScenario(scenario);
      setMsg(`${name} successfully injected into pipeline.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setTriggering(null);
    }
  };

  const handleReset = async () => {
    try {
      setTriggering('reset');
      setMsg(null);
      await api.resetDemo();
      setMsg('Demo dataset restored to clean baseline state.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setMsg(`Reset failed: ${err.message}`);
    } finally {
      setTriggering(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-surface to-surfaceCard border-b border-surfaceBorder px-4 py-2.5 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-warn/20 text-warn font-semibold text-[11px] flex items-center gap-1 border border-warn/30">
            <AlertTriangle className="w-3 h-3" /> HACKATHON DEMO MODE
          </span>
          <span className="hidden md:inline text-slate-400">
            Simulated telemetry & complaints. Clearly distinguishes data faults from real incidents.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 hidden lg:inline">Inject Scenarios:</span>
          
          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('leak', 'Scenario A (Pipe Leak)')}
            className="px-2.5 py-1 rounded-md bg-crit/20 hover:bg-crit/30 text-crit border border-crit/40 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-[11px]"
            title="Incorporate pressure drop, flow spike & nearby citizen reports"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario A: Pipe Leak
          </button>

          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('sensor_fault', 'Scenario B (Sensor Fault)')}
            className="px-2.5 py-1 rounded-md bg-electric/20 hover:bg-electric/30 text-electric border border-electric/40 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-[11px]"
            title="Inject frozen telemetry to verify system flags probe fault rather than false leak"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario B: Sensor Fault
          </button>

          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('water_quality', 'Scenario C (Water Quality)')}
            className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-[11px]"
            title="Turbidity spike requiring physical sample & certified lab verification"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario C: Quality Spike
          </button>

          <button
            disabled={!!triggering}
            onClick={handleReset}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium transition-colors flex items-center gap-1 disabled:opacity-50 text-[11px]"
            title="Reset demonstration records"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${triggering === 'reset' ? 'animate-spin' : ''}`} /> Reset
          </button>
        </div>
      </div>

      {msg && (
        <div className="max-w-7xl mx-auto mt-2 text-[11px] text-aqua flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-succ" /> {msg}
        </div>
      )}
    </div>
  );
};
