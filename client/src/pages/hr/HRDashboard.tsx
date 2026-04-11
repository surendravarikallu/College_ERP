import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../api/client';
import { toast } from 'react-hot-toast';

export const HRDashboard = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Note: Only partial mock-up of what would be extensive fetching/rendering
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users?role=FACULTY');
      setEmployees(res.data.users);
    } catch (error) {
      toast.error('Failed to fetch faculty list');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">HR & Payroll Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Manage employees, attendance, leave, and payroll</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="border-b border-gray-200 px-6 mt-4">
            <nav className="-mb-px flex space-x-8">
              {['employees', 'attendance', 'leave', 'payroll'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                    ${activeTab === tab 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'employees' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Faculty Roster</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">Add Faculty</button>
                </div>
                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : (
                  <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                          <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {employees.map((emp: any) => (
                          <tr key={emp.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                              {emp.FacultyProfile?.firstName} {emp.FacultyProfile?.lastName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{emp.email}</td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <Badge variant={emp.isActive ? 'success' : 'error'}>
                                {emp.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <button className="text-blue-600 hover:text-blue-900">Edit</button>
                            </td>
                          </tr>
                        ))}
                        {employees.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-4 text-gray-500">No employees found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'attendance' && (
              <div className="text-center py-12 text-gray-500">
                <p>Faculty Attendance Register</p>
                <p className="text-sm">Select a date to view or mark attendance.</p>
              </div>
            )}

            {activeTab === 'leave' && (
              <div className="text-center py-12 text-gray-500">
                <p>Leave Management</p>
                <p className="text-sm">Pending leave logic module will render here.</p>
              </div>
            )}

            {activeTab === 'payroll' && (
              <div className="text-center py-12 text-gray-500">
                <p>Payroll Generation Module</p>
                <p className="text-sm">Select month/year to generate bulk payslips.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
