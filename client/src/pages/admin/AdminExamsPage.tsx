import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';

export const AdminExamsPage = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/exams/sessions');
      setSessions(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch exam sessions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const publishResults = async (sessionId: string) => {
    try {
      await apiClient.post('/exams/results/publish', { examSessionId: sessionId });
      toast({ title: 'Success', description: 'Results published successfully' });
      fetchSessions();
    } catch {
      toast({ title: 'Error', description: 'Failed to publish results', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam Administration</h1>
          <p className="mt-1 text-sm text-slate-500">Manage sessions, hall tickets, and results</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 font-semibold">Create Session</button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-base font-semibold">Exam Sessions</h3>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50">
                  {['Name', 'Type', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session: any) => (
                  <tr key={session.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{session.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-400">{session.examType}</td>
                    <td className="px-5 py-3.5 text-sm">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${session.isLocked ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}`}>
                        {session.isLocked ? 'Locked / Published' : 'Draft / Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-3">
                        <button className="text-indigo-400 hover:text-indigo-300 text-sm">Hall Tickets</button>
                        <button 
                          onClick={() => publishResults(session.id)}
                          disabled={session.isLocked}
                          className={`text-sm ${session.isLocked ? 'text-slate-600 cursor-not-allowed' : 'text-emerald-400 hover:text-emerald-300'}`}
                        >
                          Publish Results
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">No exam sessions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
