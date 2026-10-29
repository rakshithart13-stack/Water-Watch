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
    <div className="bg-gradient-to-r from-surface/90 via-surfaceCard/90 to-surface/90 backdrop-blur-md border-b border-surfaceBorder/80 px-4 py-2 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-full bg-warn/15 text-warn font-semibold text-[11px] flex items-center gap-1.5 border border-warn/30 shadow-sm shadow-warn/10">
            <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse"></span>
            <AlertTriangle className="w-3 h-3" /> HACKATHON DEMO MODE
          </span>
          <span className="hidden md:inline text-muted text-[11px]">
            Simulated telemetry & complaints. Distinguishes physical leaks from sensor faults.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted hidden lg:inline font-medium">Inject Scenarios:</span>
          
          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('leak', 'Scenario A (Pipe Leak)')}
            className="px-2.5 py-1 rounded-lg bg-crit/15 hover:bg-crit/25 text-crit border border-crit/30 hover:border-crit/50 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 text-[11px] shadow-sm shadow-crit/10"
            title="Incorporate pressure drop, flow spike & nearby citizen reports"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario A: Pipe Leak
          </button>

          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('sensor_fault', 'Scenario B (Sensor Fault)')}
            className="px-2.5 py-1 rounded-lg bg-electric/15 hover:bg-electric/25 text-electric border border-electric/30 hover:border-electric/50 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 text-[11px] shadow-sm shadow-electric/10"
            title="Inject frozen telemetry to verify system flags probe fault rather than false leak"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario B: Sensor Fault
          </button>

          <button
            disabled={!!triggering}
            onClick={() => handleTrigger('water_quality', 'Scenario C (Water Quality)')}
            className="px-2.5 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent border border-accent/30 hover:border-accent/50 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 text-[11px] shadow-sm shadow-accent/10"
            title="Turbidity spike requiring physical sample & certified lab verification"
          >
            <Play className="w-2.5 h-2.5 fill-current" /> Scenario C: Quality Spike
          </button>

          <button
            disabled={!!triggering}
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg bg-surfaceCard hover:bg-surfaceBorder text-slate-300 border border-surfaceBorder hover:border-slate-500 font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 text-[11px]"
            title="Reset demonstration records"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${triggering === 'reset' ? 'animate-spin' : ''}`} /> Reset
          </button>
        </div>
      </div>

      {msg && (
        <div className="max-w-7xl mx-auto mt-2 text-[11px] text-aqua flex items-center gap-1.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-succ" /> {msg}
        </div>
      )}
    </div>
  );
};
