import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { api } from '../../api/client';
import { toast } from 'react-hot-toast';

export const AdminExamsPage = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Note: Only partial mock-up of extensive fetching/rendering
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/exams/sessions');
      setSessions(res.data.data || []);
    } catch {
      toast.error('Failed to fetch exam sessions');
    } finally {
      setLoading(false);
    }
  };

  const publishResults = async (sessionId: string) => {
    try {
      await api.post('/exams/results/publish', { examSessionId: sessionId });
      toast.success('Results published successfully');
      fetchSessions();
    } catch {
      toast.error('Failed to publish results');
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Exam Administration</h1>
            <p className="mt-1 text-sm text-gray-500">Manage sessions, hall tickets, and results</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create Session</button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-medium text-gray-900">Exam Sessions</h3>
          </div>
          
          {loading ? (
             <div className="p-6 text-gray-500">Loading sessions...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessions.map((session: any) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{session.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{session.examType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {session.isLocked ? 'Locked / Published' : 'Draft / Active'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-4">Hall Tickets</button>
                      <button 
                        onClick={() => publishResults(session.id)}
                        disabled={session.isLocked}
                        className={`text-green-600 hover:text-green-900 ${session.isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Publish Results
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No exam sessions found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};
