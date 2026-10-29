import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Incident, Sensor, Zone } from '../types';

interface IncidentMapProps {
  incidents: Incident[];
  sensors?: Sensor[];
  zones?: Zone[];
  onSelectIncident?: (incidentId: string) => void;
}

// Custom DivIcons for Leaflet
const createIncidentIcon = (priority: number) => {
  const color = priority >= 75 ? '#EF4444' : priority >= 50 ? '#F5A623' : '#4EA8FF';
  const pulseClass = priority >= 75 ? 'animate-ping' : '';

  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px;">
        <div class="${pulseClass}" style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; opacity: 0.4;"></div>
        <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; border: 2px solid #08111F; box-shadow: 0 0 10px ${color};"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createSensorIcon = (health: string) => {
  const color = health === 'healthy' ? '#22C55E' : health === 'frozen' ? '#21D4E8' : '#EF4444';
  return L.divIcon({
    className: 'custom-sensor-marker',
    html: `
      <div style="width: 12px; height: 12px; border-radius: 3px; background-color: ${color}; border: 1.5px solid #08111F;" title="Sensor: ${health}"></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  sensors = [],
  zones = [],
  onSelectIncident
}) => {
  const centerLat = 12.9716;
  const centerLng = 77.5946;

  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-surfaceBorder shadow-xl bg-surface">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="dark-tiles"
        />

        {/* Zones */}
        {zones.map(z => (
          <Circle
            key={z.id}
            center={[z.center_lat, z.center_lng]}
            radius={z.radius_meters || 1800}
            pathOptions={{
              color: '#21D4E8',
              fillColor: '#21D4E8',
              fillOpacity: 0.06,
              weight: 1,
              dashArray: '4, 4'
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-aqua mb-0.5">{z.name}</p>
                <p className="text-slate-300">{z.description || 'Monitored distribution sector'}</p>
                <p className="text-[10px] text-slate-400 mt-1">Code: {z.code}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Sensors */}
        {sensors.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={createSensorIcon(s.health_status)}
          >
            <Popup>
              <div className="text-xs">
                <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                  {s.external_sensor_id}
                </span>
                <p className="font-semibold text-slate-100 mt-1">{s.name}</p>
                <p className="text-slate-300 text-[11px]">
                  Reading: <span className="font-mono font-bold text-aqua">{s.last_reading_value ?? 'N/A'} {s.unit}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Health: <span className="capitalize">{s.health_status}</span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Incidents */}
        {incidents.map(inc => {
          // Find zone coordinates for the incident
          const zone = zones.find(z => z.id === inc.zone_id);
          const lat = zone ? zone.center_lat : centerLat;
          const lng = zone ? zone.center_lng : centerLng;

          return (
            <Marker
              key={inc.id}
              position={[lat, lng]}
              icon={createIncidentIcon(inc.priority_score)}
            >
              <Popup>
                <div className="text-xs max-w-xs">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-crit/20 text-crit">
                      {Math.round(inc.priority_score)}/100 PRIORITY
                    </span>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {inc.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 mb-1">{inc.title}</h4>
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed line-clamp-2">
                    {inc.hypothesis}
                  </p>
                  {onSelectIncident && (
                    <button
                      onClick={() => onSelectIncident(inc.id)}
                      className="w-full py-1 px-2 rounded bg-aqua hover:bg-aqua-hover text-darkBg font-semibold text-[11px] transition-colors"
                    >
                      Deep Dive Analysis →
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 bg-darkBg/80 backdrop-blur-md border border-surfaceBorder rounded-lg px-3 py-2 text-[11px] text-slate-300 z-[1000] flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-crit"></span>
          <span>Critical Alert (&ge;75)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warn"></span>
          <span>High Priority (50-74)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-succ"></span>
          <span>Sensor Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-aqua"></span>
          <span>Sensor Flatline</span>
        </div>
      </div>
    </div>
  );
};
