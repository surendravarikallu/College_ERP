import React from 'react';
import { Download, FileText, BarChart2, Users, DollarSign, GraduationCap } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export const AdminReportsPage = () => {
  const { toast } = useToast();

  const handleExport = async (type: string, label: string) => {
    try {
      toast({ title: `Generating ${label}...`, description: 'Please wait' });
      const response = await apiClient.get(`/analytics/export/${type}`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: `${label} downloaded` });
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Could not generate report. Check server logs.',
        variant: 'destructive'
      });
    }
  };

  const reports = [
    {
      type: 'students', label: 'Student List', icon: <Users className="w-8 h-8"/>,
      desc: 'All active students with roll number, department, semester, email and phone',
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    },
    {
      type: 'performance', label: 'Performance Report', icon: <BarChart2 className="w-8 h-8"/>,
      desc: 'Subject-wise grade records with SGPA/CGPA for every student',
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    },
    {
      type: 'finance', label: 'Fee Dues', icon: <DollarSign className="w-8 h-8"/>,
      desc: 'All pending fee invoices with amounts and due dates',
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    },
    {
      type: 'faculty-payroll', label: 'Faculty Payroll', icon: <GraduationCap className="w-8 h-8"/>,
      desc: 'Monthly payslip summary for all faculty members',
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
    },
    {
      type: 'marks-sheet', label: 'Marks Sheet', icon: <FileText className="w-8 h-8"/>,
      desc: 'Exam marks for all students (mid-exams and end-semester)',
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download institutional data reports
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(r => (
          <Card key={r.type} className="flex flex-col">
            <CardHeader>
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-3 ${r.color}`}>
                {r.icon}
              </div>
              <CardTitle className="text-base">{r.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <p className="text-sm text-muted-foreground flex-1 mb-4">{r.desc}</p>
              <Button variant="outline" className="w-full"
                onClick={() => handleExport(r.type, r.label)}>
                <Download className="w-4 h-4 mr-2"/> Export
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
