import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const AdminAttendancePage = () => {
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, t] = await Promise.all([
        apiClient.get('/attendance/defaulters?threshold=75').catch(() => ({ data: { data: [] } })),
        apiClient.get('/analytics/attendance-trends').catch(() => ({ data: { data: [] } })),
      ]);
      setDefaulters(d.data.data || []);
      setTrends(t.data.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Department-wise attendance and shortage tracking</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background">
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm w-20 bg-background"/>
        </div>
      </div>

      {/* Department trend cards */}
      {trends.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {trends.map((dept: any, idx: number) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{dept.department}</p>
                <p className={`text-3xl font-bold mt-1 ${
                  dept.percentage >= 80 ? 'text-emerald-600' : dept.percentage >= 60 ? 'text-amber-500' : 'text-red-500'
                }`}>{dept.percentage}%</p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full ${
                    dept.percentage >= 80 ? 'bg-emerald-500' : dept.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${Math.min(dept.percentage, 100)}%` }}/>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Defaulters table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500"/>
            Attendance Defaulters (below 75%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-12 bg-muted rounded animate-pulse"/>)}</div>
            : defaulters.length === 0
              ? <p className="text-center text-muted-foreground py-8">No defaulters — all students above 75% 🎉</p>
              : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">Overall %</th>
                    <th className="text-left p-3">Shortage Subjects</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {defaulters.map((d: any, i: number) => (
                    <tr key={d.student?.id || d.studentId || i} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{d.student?.name || d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.student?.rollNumber || d.rollNumber}</div>
                      </td>
                      <td className="p-3 text-red-600 font-medium">{d.overallPercentage || d.percentage}%</td>
                      <td className="p-3">
                        {(d.shortageSubjects || []).map((s: any, j: number) => (
                          <div key={j} className="text-xs text-red-500">
                            {s.name}: {s.percentage}%
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
