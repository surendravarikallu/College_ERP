import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Save, Settings } from 'lucide-react';

export const SettingsPage = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    institutionName: 'Kits Akshar Institute of Technology',
    academicYear: '2024-2025',
    currentSemester: 'ODD',
    emailNotifications: true,
    smsAlerts: false,
    autoLockMarks: true,
    attendanceThreshold: '75',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/settings')
      .then(res => { if (res.data.data) setConfig(c => ({ ...c, ...res.data.data })); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.put('/admin/settings', config);
      toast({ title: 'Settings Saved', description: 'Configuration updated successfully' });
    } catch {
      toast({ title: 'Save Failed', description: 'Could not save settings', variant: 'destructive' });
    }
    setSaving(false);
  };

  const chk = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setConfig(c => ({ ...c, [k]: e.target.checked }));

  const val = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setConfig(c => ({ ...c, [k]: e.target.value }));

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure global institution parameters</p>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4"/> Institution Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Institution Name', key: 'institutionName' },
              { label: 'Academic Year', key: 'academicYear', placeholder: '2024-2025' },
              { label: 'Attendance Threshold (%)', key: 'attendanceThreshold', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={(config as any)[f.key]}
                  placeholder={f.placeholder}
                  onChange={val(f.key)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium mb-1.5">Current Semester</label>
              <select value={config.currentSemester} onChange={val('currentSemester')}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="ODD">ODD Semester</option>
                <option value="EVEN">EVEN Semester</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">System Behaviour</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Email Notifications', key: 'emailNotifications', desc: 'Send alerts for attendance shortage, fee dues, results' },
              { label: 'SMS Alerts', key: 'smsAlerts', desc: 'SMS notifications for critical alerts' },
              { label: 'Auto-lock Marks Entry', key: 'autoLockMarks', desc: 'Lock exam session marks after deadline automatically' },
            ].map(f => (
              <div key={f.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!(config as any)[f.key]}
                  onChange={chk(f.key)}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={saving}>
          <Save className="w-4 h-4 mr-2"/>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </div>
  );
};
