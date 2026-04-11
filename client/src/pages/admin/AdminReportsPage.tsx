import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { Download, FileText, BarChart2, Users } from 'lucide-react';

export const AdminReportsPage = () => {
  const handleExport = (type: string) => {
    // Integration point for downloading reports (CSV/PDF)
    // api.get(`/reports/export?type=${type}`)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and export institutional data reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col items-center text-center">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">Student Demographics</h3>
          <p className="text-sm text-gray-500 mt-2 mb-4">Export detailed student data including department, batch, and contact details.</p>
          <button onClick={() => handleExport('students')} className="mt-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded flex items-center justify-center gap-2 w-full">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col items-center text-center">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">Academic Performance</h3>
          <p className="text-sm text-gray-500 mt-2 mb-4">Download exam session results, grades, and pass percentages.</p>
          <button onClick={() => handleExport('performance')} className="mt-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded flex items-center justify-center gap-2 w-full">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col items-center text-center">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-full mb-4">
            <BarChart2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold">Financial Summary</h3>
          <p className="text-sm text-gray-500 mt-2 mb-4">Consolidated report of fee collections, dues, and payroll expenses.</p>
          <button onClick={() => handleExport('finance')} className="mt-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded flex items-center justify-center gap-2 w-full">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};
