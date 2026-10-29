import React from 'react';
import { Droplet, Activity, ShieldAlert, Cpu, AlertCircle, UserCheck, Settings, Home } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onSelectIncident?: (incidentId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onSelectIncident }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'incidents', label: 'Incidents', icon: ShieldAlert },
    { id: 'anomaly_analysis', label: 'AI Anomaly Engine', icon: Cpu },
    { id: 'sensors', label: 'Sensors', icon: Activity },
    { id: 'complaints', label: 'Citizen Portal', icon: AlertCircle },
    { id: 'officer_center', label: 'Officer Center', icon: UserCheck },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-[100] bg-darkBg/90 backdrop-blur-xl border-b border-surfaceBorder/80 shadow-[0_1px_0_0_rgba(101,191,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-surface to-surfaceCard border border-aqua/30 flex items-center justify-center shadow-lg shadow-aqua/10 group-hover:border-aqua/50 transition-all duration-300">
              <Droplet className="w-5 h-5 text-aqua fill-aqua/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">WATER WATCH</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-aqua/15 text-aqua border border-aqua/30 font-bold tracking-wider">
                  AI CORE
                </span>
              </div>
              <p className="text-[11px] text-muted font-medium">Explainable Multi-Source Water Intelligence</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-aqua/15 text-aqua border border-aqua/30 shadow-sm shadow-aqua/10'
                      : 'text-slate-300 hover:text-white hover:bg-surfaceCard/70 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-aqua' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Notifications & Portal toggle */}
          <div className="flex items-center gap-3">
            <NotificationDropdown onSelectIncident={onSelectIncident} />

            <button
              onClick={() => onNavigate('landing')}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-aqua px-3 py-1.5 rounded-lg border border-surfaceBorder hover:border-aqua/40 bg-surface/80 hover:bg-surfaceCard transition-all shadow-sm"
              title="Return to Presentation Landing"
            >
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Landing</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 gap-1 border-t border-surfaceBorder/60 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-aqua/15 text-aqua border border-aqua/30 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
