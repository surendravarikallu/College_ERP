import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Bell, Check, CheckCheck } from 'lucide-react';

export const StudentNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.data || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ATTENDANCE_ALERT': return 'text-amber-400 bg-amber-500/10';
      case 'EXAM_RESULT': return 'text-emerald-400 bg-emerald-500/10';
      case 'FEE_REMINDER': return 'text-red-400 bg-red-500/10';
      case 'MARKS_PUBLISHED': return 'text-blue-400 bg-blue-500/10';
      case 'HALL_TICKET': return 'text-purple-400 bg-purple-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`flex items-start gap-4 p-5 transition-colors ${!n.isRead ? 'bg-slate-800/30' : ''} hover:bg-slate-800/20`}>
              <div className={`p-2 rounded-full mt-0.5 ${getTypeColor(n.type)}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium text-sm ${!n.isRead ? 'text-white' : 'text-slate-400'}`}>{n.title}</h4>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                </div>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.message || n.body}</p>
                <p className="text-xs text-slate-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button onClick={() => markRead(n.id)} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white">
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
