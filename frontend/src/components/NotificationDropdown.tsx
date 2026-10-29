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
        className="relative p-2 rounded-lg bg-surface hover:bg-surfaceCard border border-surfaceBorder transition-colors text-slate-300 hover:text-white"
        title="Incident Notifications"
      >
        <Bell className="w-5 h-5 text-aqua" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-crit text-white text-[10px] font-bold rounded-full animate-pulse border border-darkBg">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-surfaceBorder rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-surfaceBorder flex items-center justify-between bg-darkBg/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-aqua" />
              <span className="font-semibold text-sm text-slate-100">Live Alert Stream</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {unreadCount} new
              </span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-aqua hover:underline flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-surfaceBorder">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No notifications logged yet.
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
                  className={`p-3 text-left transition-colors cursor-pointer hover:bg-surfaceCard/70 flex gap-3 ${
                    !n.is_read ? 'bg-aqua/5' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-xs font-semibold ${
                        n.priority === 'CRITICAL' ? 'text-crit' : n.priority === 'HIGH' ? 'text-warn' : 'text-aqua'
                      }`}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark read"
                          className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-1.5">{n.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.incident_id && (
                        <span className="text-aqua flex items-center gap-0.5 hover:underline">
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
