import React, { useState, useEffect } from 'react';
import { Activity, Gauge, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../api/client';
import { Sensor, SensorReading, Zone } from '../types';

export const SensorMonitoringPage: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterHealth, setFilterHealth] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const loadSensors = async () => {
    try {
      setLoading(true);
      const [senData, zoneData] = await Promise.all([
        api.listSensors({
          measurement_type: filterType || undefined,
          health_status: filterHealth || undefined,
        }),
        api.listZones(),
      ]);
      setSensors(senData);
      setZones(zoneData);
      if (senData.length > 0 && !selectedSensorId) {
        setSelectedSensorId(senData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensors();
  }, [filterType, filterHealth]);

  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedSensorId) return;
      try {
        setChartLoading(true);
        const data = await api.getSensorReadings(selectedSensorId, 40);
        setReadings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setChartLoading(false);
      }
    };
    loadChartData();
  }, [selectedSensorId]);

  const activeSensor = sensors.find(s => s.id === selectedSensorId) || sensors[0];

  const chartFormatted = readings.map(r => ({
    time: new Date(r.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: r.value,
    quality: r.quality_status,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-aqua" /> Sensor Telemetry & Health Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verification of physical units, operational buffers, and probe health.
          </p>
        </div>

        <button
          onClick={loadSensors}
          className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-aqua" /> Refresh Sensors
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            filterType === '' ? 'bg-aqua/20 text-aqua border-aqua/40' : 'bg-surface border-surfaceBorder text-slate-400'
          }`}
        >
          All 7 Types
        </button>
        {['pressure', 'flow_rate', 'tank_level', 'turbidity', 'ph', 'conductivity', 'temperature'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border ${
              filterType === t ? 'bg-aqua/20 text-aqua border-aqua/40' : 'bg-surface border-surfaceBorder text-slate-400'
            }`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}

        <select
          value={filterHealth}
          onChange={(e) => setFilterHealth(e.target.value)}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-surface border border-surfaceBorder text-slate-300 focus:outline-none focus:border-aqua"
        >
          <option value="">All Health Statuses</option>
          <option value="healthy">Healthy</option>
          <option value="frozen">Frozen / Flatline</option>
          <option value="warning">Warning Outlier</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* Main Split View: Chart Focus & Sensors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor Detail & Historical Trend Chart (2 Cols) */}
        {activeSensor && (
          <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-surfaceBorder space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surfaceBorder">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-darkBg text-aqua border border-aqua/30">
                    {activeSensor.external_sensor_id}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    activeSensor.health_status === 'healthy' ? 'bg-succ/15 text-succ' : 'bg-warn/15 text-warn'
                  }`}>
                    {activeSensor.health_status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{activeSensor.name}</h3>
                <p className="text-xs text-slate-400">Zone: {activeSensor.zone_name}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Current Telemetry</span>
                <span className="text-2xl font-extrabold text-aqua font-mono">
                  {activeSensor.last_reading_value ?? 'N/A'}{' '}
                  <span className="text-sm font-normal text-slate-400">{activeSensor.unit}</span>
                </span>
              </div>
            </div>

            {/* Threshold Limits Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-darkBg/60 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">MIN OPERATIONAL</span>
                <span className="font-mono text-slate-200 font-semibold">{activeSensor.min_operational} {activeSensor.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">MAX OPERATIONAL</span>
                <span className="font-mono text-slate-200 font-semibold">{activeSensor.max_operational} {activeSensor.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">LAST SEEN</span>
                <span className="font-mono text-slate-200">
                  {activeSensor.last_seen_at ? new Date(activeSensor.last_seen_at).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Time-Series Line Chart */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Historical Time-Series Telemetry (Last 40 Points)</span>
                <span className="text-[10px] text-aqua">Units: {activeSensor.unit}</span>
              </h4>

              <div className="h-64 w-full">
                {chartLoading ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Loading time-series...
                  </div>
                ) : readings.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No readings ingested yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartFormatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis
                        stroke="#64748B"
                        fontSize={10}
                        domain={[
                          (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.8)),
                          (dataMax: number) => Math.ceil(dataMax * 1.2),
                        ]}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111E30', borderColor: '#20334E', borderRadius: '8px', fontSize: '11px' }}
                      />
                      <ReferenceLine y={activeSensor.min_operational} stroke="#F5A623" strokeDasharray="3 3" label={{ value: 'Min Limit', fill: '#F5A623', fontSize: 10 }} />
                      <ReferenceLine y={activeSensor.max_operational} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Max Limit', fill: '#EF4444', fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#21D4E8"
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: '#21D4E8' }}
                        activeDot={{ r: 5, fill: '#4EA8FF' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sensors Selection List (1 Col) */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder flex flex-col h-[520px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 pb-3 border-b border-surfaceBorder">
            Sensors Inventory ({sensors.length})
          </h3>

          <div className="flex-1 overflow-y-auto divide-y divide-surfaceBorder/60 mt-2 pr-1">
            {sensors.map(s => {
              const isSelected = s.id === selectedSensorId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSensorId(s.id)}
                  className={`py-3 px-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-aqua/15 border border-aqua/30' : 'hover:bg-surfaceCard/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[11px] text-slate-400">{s.external_sensor_id}</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      s.health_status === 'healthy' ? 'text-succ' : 'text-warn'
                    }`}>
                      {s.health_status}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold ${isSelected ? 'text-aqua' : 'text-white'} line-clamp-1`}>
                    {s.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-300">
                    <span className="capitalize text-slate-400">{s.measurement_type.replace('_', ' ')}</span>
                    <span className="font-mono font-bold text-white">
                      {s.last_reading_value ?? 'N/A'} {s.unit}
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
