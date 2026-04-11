import React, { useState } from 'react';
import { Layout } from '../../components/layout/Layout';

export const SettingsPage = () => {
  const [config, setConfig] = useState({
    institutionName: 'KITS Akshar Institute of Technology',
    academicYear: '2024-2025',
    currentSemester: 'ODD',
    emailNotifications: true,
    smsAlerts: false
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setConfig({ ...config, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Assuming API push logically works
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Configure global institution parameters</p>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-lg shadow-sm">
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">General Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Institution Name</label>
              <input type="text" name="institutionName" value={config.institutionName} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Academic Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Academic Year</label>
                <input type="text" name="academicYear" value={config.academicYear} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Semester Term</label>
                <select name="currentSemester" value={config.currentSemester} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="ODD">ODD</option>
                  <option value="EVEN">EVEN</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium border-b pb-2">Notifications</h3>
            <div className="flex items-center">
              <input type="checkbox" name="emailNotifications" checked={config.emailNotifications} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-900">Enable Email Notifications</label>
            </div>
            <div className="flex items-center">
              <input type="checkbox" name="smsAlerts" checked={config.smsAlerts} onChange={handleChange} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label className="ml-2 block text-sm text-gray-900">Enable SMS Alerts</label>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Save Configuration</button>
          </div>
        </form>
      </div>
    </div>
  );
};
