import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Printer, Download, ArrowLeft, Loader2 } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

const fmt = (n: number) =>
  n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PayslipView = () => {
  const { payslipId } = useParams<{ payslipId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payslip, setPayslip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!payslipId) return;
    apiClient.get(`/hr/payroll/${payslipId}`)
      .then(res => setPayslip(res.data.data))
      .catch(() => toast({
        title: 'Error', description: 'Payslip not found', variant: 'destructive'
      }))
      .finally(() => setLoading(false));
  }, [payslipId]);

  const handleDownload = async () => {
    try {
      const res = await apiClient.get(`/hr/payroll/${payslipId}/pdf`);
      toast({
        title: 'PDF Generated',
        description: res.data.pdfPath ? `Saved: ${res.data.pdfPath}` : 'PDF created'
      });
    } catch {
      toast({ title: 'Error', description: 'PDF generation failed', variant: 'destructive' });
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
    </div>
  );

  if (!payslip) return (
    <div className="p-8 text-red-500">Payslip not found</div>
  );

  const { faculty } = payslip;
  const INSTITUTION = 'Kits Akshar Institute of Technology';

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between no-print">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2"/> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2"/> Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2"/> Download PDF
          </Button>
        </div>
      </div>

      {/* Payslip Document */}
      <div className="bg-white border rounded-xl p-8 text-gray-900 print:border-0" id="payslip-doc">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">{INSTITUTION}</h1>
          <p className="text-sm font-medium mt-1">Pay Slip</p>
          <p className="text-sm text-gray-600">
            For the Month of {MONTHS[payslip.month - 1]} {payslip.year}
          </p>
        </div>

        {/* Employee Details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
          {[
            ['Employee Name', faculty?.name],
            ['Employee ID', faculty?.employeeId],
            ['Department', faculty?.department?.name],
            ['Designation', faculty?.designation || '—'],
            ['Pay Period', `${MONTHS[payslip.month - 1]} ${payslip.year}`],
            ['Status', null],
          ].map(([label, value], i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 w-36 flex-shrink-0">{label as string}:</span>
              {label === 'Status'
                ? <Badge variant={payslip.status === 'PAID' ? 'default' : 'secondary'}>{payslip.status}</Badge>
                : <span className="font-medium">{value as string}</span>
              }
            </div>
          ))}
          {faculty?.employeeProfile?.bankName && (
            <div className="flex gap-2 col-span-2">
              <span className="text-gray-500 w-36">Bank A/C:</span>
              <span className="font-medium">
                {faculty.employeeProfile.accountNumber} ({faculty.employeeProfile.bankName})
              </span>
            </div>
          )}
        </div>

        {/* Earnings & Deductions */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-widest border-b pb-2 mb-3">Earnings</h3>
            {[
              ['Basic Pay', payslip.basicPay],
              ['HRA (House Rent)', payslip.hra],
              ['DA (Dearness)', payslip.da],
              ['Other Allowances', payslip.allowances],
            ].map(([label, amount]) => (
              <div key={label as string} className="flex justify-between text-sm py-1.5">
                <span className="text-gray-600">{label as string}</span>
                <span>₹ {fmt(amount as number)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 border-t mt-1 font-semibold">
              <span>Gross Salary</span>
              <span>₹ {fmt(payslip.grossSalary)}</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-xs uppercase tracking-widest border-b pb-2 mb-3">Deductions</h3>
            {[
              ['Provident Fund', payslip.providentFund],
              ['Professional Tax', payslip.professionalTax],
              ['Other Deductions', payslip.otherDeductions],
            ].map(([label, amount]) => (
              <div key={label as string} className="flex justify-between text-sm py-1.5">
                <span className="text-gray-600">{label as string}</span>
                <span>₹ {fmt(amount as number)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm py-2 border-t mt-1 font-semibold text-red-600">
              <span>Total Deductions</span>
              <span>₹ {fmt(payslip.totalDeductions)}</span>
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center border border-emerald-200">
          <span className="text-lg font-bold text-emerald-900">NET SALARY PAYABLE</span>
          <span className="text-2xl font-bold text-emerald-700">₹ {fmt(payslip.netSalary)}</span>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 pb-2">
          This is a computer-generated payslip and does not require a physical signature.
          Generated on {new Date().toLocaleDateString('en-IN')}.
        </p>
      </div>
    </div>
  );
};
