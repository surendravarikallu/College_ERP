import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Users, DollarSign, Clock, CheckCircle2, XCircle,
  FileText, AlertCircle
} from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FULL_MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export const HRDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());

  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const res = await apiClient.get('/hr/employees');
      setEmployees(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    }
    setEmpLoading(false);
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await apiClient.get('/hr/leave?status=LEAVE_PENDING');
      setLeaves(res.data.data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load leave requests', variant: 'destructive' });
    }
    setLeaveLoading(false);
  }, []);

  const fetchPayslips = useCallback(async () => {
    setPayLoading(true);
    try {
      const res = await apiClient.get(`/hr/payroll/history?year=${payYear}`);
      setPayslips(res.data.data || []);
    } catch {}
    setPayLoading(false);
  }, [payYear]);

  useEffect(() => { fetchEmployees(); fetchLeaves(); }, []);
  useEffect(() => { fetchPayslips(); }, [payYear]);

  const handleGenerateBulk = async () => {
    setGenerating(true);
    try {
      const res = await apiClient.post('/hr/payroll/generate-bulk', {
        month: payMonth, year: payYear
      });
      const d = res.data.data;
      toast({
        title: 'Payroll Generated',
        description: `Generated: ${d.generated || d.success?.length || 0}, Skipped: ${d.skipped || 0}, Failed: ${d.failed || 0}`
      });
      fetchPayslips();
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.error || 'Failed to generate payroll', variant: 'destructive' });
    }
    setGenerating(false);
  };

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await apiClient.post(`/hr/leave/${id}/${action}`, { remarks: '' });
      toast({ title: `Leave ${action === 'approve' ? 'Approved' : 'Rejected'}` });
      fetchLeaves();
    } catch {
      toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
    }
  };

  const handleApprovePayslip = async (id: string) => {
    try {
      await apiClient.post(`/hr/payroll/${id}/approve`);
      toast({ title: 'Payslip Approved' });
      fetchPayslips();
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.error || 'Failed', variant: 'destructive' });
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await apiClient.post(`/hr/payroll/${id}/mark-paid`);
      toast({ title: 'Marked as Paid' });
      fetchPayslips();
    } catch (e: any) {
      toast({ title: 'Error', description: e.response?.data?.error || 'Failed', variant: 'destructive' });
    }
  };

  const monthPayslips = payslips.filter(p => p.month === payMonth);
  const withSalary = employees.filter(e => e.salaryStructure).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR & Payroll</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faculty management, leave approvals, and payroll processing
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Faculty', value: employees.length, icon: <Users className="w-5 h-5"/>, border: 'border-l-indigo-500' },
          { label: 'Salary Configured', value: withSalary, icon: <DollarSign className="w-5 h-5"/>, border: 'border-l-emerald-500' },
          { label: 'Pending Leaves', value: leaves.length, icon: <Clock className="w-5 h-5"/>, border: 'border-l-amber-500' },
          { label: `Payslips ${MONTHS[payMonth-1]}`, value: monthPayslips.length, icon: <FileText className="w-5 h-5"/>, border: 'border-l-blue-500' },
        ].map(s => (
          <Card key={s.label} className={`border-l-4 ${s.border}`}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <div className="text-muted-foreground">{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="employees">Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="leaves">Leaves ({leaves.length})</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* EMPLOYEES */}
        <TabsContent value="employees">
          <Card>
            <CardHeader><CardTitle>Faculty Employee Directory</CardTitle></CardHeader>
            <CardContent>
              {empLoading
                ? <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-muted rounded animate-pulse"/>)}</div>
                : employees.length === 0
                  ? <div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>No faculty found. Add faculty via Users page.</p></div>
                  : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-3">Employee</th>
                        <th className="text-left p-3">Department</th>
                        <th className="text-left p-3">Designation</th>
                        <th className="text-left p-3">Basic Pay</th>
                        <th className="text-left p-3">Leave Balance</th>
                        <th className="text-left p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {employees.map((emp: any) => (
                        <tr key={emp.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium">{emp.name}</div>
                            <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{emp.department?.name || '—'}</td>
                          <td className="p-3 text-muted-foreground">{emp.designation || '—'}</td>
                          <td className="p-3">
                            {emp.salaryStructure
                              ? <span className="text-emerald-600 font-medium">₹{emp.salaryStructure.basicPay?.toLocaleString('en-IN')}</span>
                              : <span className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3"/>Not set</span>}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {emp.leaveBalance
                              ? `CL:${emp.leaveBalance.casualLeaves} SL:${emp.leaveBalance.sickLeaves}`
                              : '—'}
                          </td>
                          <td className="p-3">
                            <Button variant="outline" size="sm"
                              onClick={() => navigate(`/admin/hr/payslip/${emp.id}`)}>
                              Profile
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEAVES */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle>Pending Leave Applications</CardTitle></CardHeader>
            <CardContent>
              {leaveLoading
                ? <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-muted rounded animate-pulse"/>)}</div>
                : leaves.length === 0
                  ? <div className="text-center py-12 text-muted-foreground"><CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30"/><p>No pending leave requests</p></div>
                  : (
                <div className="space-y-3">
                  {leaves.map((leave: any) => (
                    <div key={leave.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{leave.faculty?.name}</span>
                          <Badge variant="outline" className="text-xs">{leave.leaveType}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString('en-IN')} →{' '}
                          {new Date(leave.endDate).toLocaleDateString('en-IN')} ({leave.days} day{leave.days > 1 ? 's' : ''})
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{leave.reason}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-50"
                          onClick={() => handleLeaveAction(leave.id, 'approve')}>
                          <CheckCircle2 className="w-4 h-4 mr-1"/> Approve
                        </Button>
                        <Button size="sm" variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                          onClick={() => handleLeaveAction(leave.id, 'reject')}>
                          <XCircle className="w-4 h-4 mr-1"/> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYROLL */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle>Payroll Management</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={payMonth} onChange={e => setPayMonth(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm bg-background">
                  {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
                <input type="number" value={payYear} min={2020} max={2035}
                  onChange={e => setPayYear(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm w-20 bg-background"/>
                <Button onClick={handleGenerateBulk} disabled={generating} size="sm">
                  {generating ? 'Generating...' : `Generate All — ${MONTHS[payMonth-1]} ${payYear}`}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {payLoading
                ? <div className="space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-12 bg-muted rounded animate-pulse"/>)}</div>
                : monthPayslips.length === 0
                  ? <div className="text-center py-12 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                      <p>No payslips for {FULL_MONTHS[payMonth-1]} {payYear}</p>
                      <p className="text-xs mt-1">Click &quot;Generate All&quot; to create payslips based on attendance</p>
                    </div>
                  : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-3">Faculty</th>
                        <th className="text-left p-3">Period</th>
                        <th className="text-left p-3">Gross</th>
                        <th className="text-left p-3">Deductions</th>
                        <th className="text-left p-3 text-emerald-600">Net Salary</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monthPayslips.map((p: any) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium">{p.faculty?.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{p.faculty?.employeeId}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{MONTHS[p.month-1]} {p.year}</td>
                          <td className="p-3">₹{p.grossSalary?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-red-500">₹{p.totalDeductions?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-emerald-600 font-semibold">
                            ₹{p.netSalary?.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3">
                            <Badge variant={p.status === 'PAID' ? 'default' : p.status === 'GENERATED' ? 'secondary' : 'outline'}>
                              {p.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm"
                                onClick={() => navigate(`/admin/hr/payslip/${p.id}`)}>
                                <FileText className="w-4 h-4"/>
                              </Button>
                              {p.status === 'DRAFT' && (
                                <Button variant="outline" size="sm" className="text-xs"
                                  onClick={() => handleApprovePayslip(p.id)}>Approve</Button>
                              )}
                              {p.status === 'GENERATED' && (
                                <Button variant="outline" size="sm" className="text-xs text-emerald-600"
                                  onClick={() => handleMarkPaid(p.id)}>Mark Paid</Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
