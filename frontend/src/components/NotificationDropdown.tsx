import React, { useEffect, useState } from 'react';
import { Bell, Check, ExternalLink, X } from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../api/client';

interface NotificationDropdownProps {
  onSelectIncident?: (incidentId: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onSelectIncident }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await api.listNotifications();
      setNotifications(data);
      const countRes = await api.getUnreadCount();
      setUnreadCount(countRes.unread_count);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-surface hover:bg-surfaceCard border border-surfaceBorder hover:border-aqua/40 transition-all duration-200 text-slate-300 hover:text-white shadow-sm"
        title="Incident Notifications"
      >
        <Bell className="w-5 h-5 text-aqua" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-crit text-white text-[10px] font-bold rounded-full animate-pulse border border-darkBg shadow-sm shadow-crit/50">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface/95 backdrop-blur-2xl border border-surfaceBorder rounded-2xl shadow-2xl shadow-black/80 z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-surfaceBorder flex items-center justify-between bg-darkBg/60 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-aqua animate-pulse"></div>
              <Bell className="w-4 h-4 text-aqua" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-100">Live Alert Stream</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surfaceCard text-aqua border border-aqua/20 font-mono font-medium">
                {unreadCount} new
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-aqua hover:text-aqua-hover transition-colors flex items-center gap-1 font-medium"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button 
                onClick={() => setOpen(false)} 
                className="p-1 rounded-lg hover:bg-surfaceCard text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-surfaceBorder/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">
                No alerts logged in the current operational window.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.incident_id && onSelectIncident) {
                      onSelectIncident(n.incident_id);
                      setOpen(false);
                    }
                  }}
                  className={`p-3.5 text-left transition-colors cursor-pointer hover:bg-surfaceCard/80 flex gap-3 ${
                    !n.is_read ? 'bg-aqua/[0.04] border-l-2 border-aqua' : 'border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs font-semibold ${
                        n.priority === 'CRITICAL' ? 'text-crit' : n.priority === 'HIGH' ? 'text-warn' : 'text-electric'
                      }`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark read"
                          className="p-1 hover:bg-surfaceCard rounded text-slate-400 hover:text-white transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-2">{n.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted">
                      <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.incident_id && (
                        <span className="text-aqua flex items-center gap-1 hover:underline font-medium">
                          Inspect Incident <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
