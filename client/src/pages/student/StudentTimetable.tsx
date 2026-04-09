import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { CalendarDays, Clock } from 'lucide-react';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StudentTimetable = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/academics/timetable');
        setSlots(res.data.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  // Group by day
  const byDay: Record<number, any[]> = {};
  slots.forEach(s => {
    const d = s.dayOfWeek || 0;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(s);
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4"><CalendarDays className="w-4 h-4 text-indigo-400" /> Weekly Schedule</h2>
        {Object.keys(byDay).length === 0 ? (
          <div className="text-center py-12 text-slate-500">No timetable configured yet.</div>
        ) : (
          <div className="space-y-4">
            {dayNames.map((day, i) => (
              byDay[i + 1] && (
                <div key={i}>
                  <h3 className="text-sm font-semibold text-indigo-400 mb-2">{day}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {byDay[i + 1].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)).map((slot: any) => (
                      <div key={slot.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                          <Clock className="w-3 h-3" />
                          {slot.startTime} — {slot.endTime}
                        </div>
                        <p className="text-sm font-medium">{slot.teachingAllocation?.subject?.name || 'Subject'}</p>
                        <p className="text-xs text-slate-500 mt-1">{slot.teachingAllocation?.faculty?.firstName || ''} {slot.teachingAllocation?.faculty?.lastName || ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTimetable;
