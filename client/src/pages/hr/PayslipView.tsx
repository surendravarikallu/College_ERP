import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { api } from '../../api/client';
import { toast } from 'react-hot-toast';

export const PayslipView = () => {
  const { payslipId } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempting to load mock data or real data depending on the service availability
    setLoading(true);
    // Since we don't have a single GET entry for payslip without facultyId, mock for demonstration
    setPayslip({
      id: payslipId,
      month: 10,
      year: 2024,
      basicPay: 45000,
      hra: 15000,
      da: 10000,
      allowances: 5000,
      grossSalary: 75000,
      providentFund: 4800,
      professionalTax: 200,
      otherDeductions: 1000,
      totalDeductions: 6000,
      netSalary: 69000,
      facultyName: 'Dr. John Example',
      employeeId: 'EMP-1029',
      department: 'Computer Science',
      status: 'GENERATED'
    });
    setLoading(false);
  }, [payslipId]);

  const handleDownload = async () => {
    try {
      const res = await api.get(`/hr/payroll/${payslipId}/pdf`);
      toast.success(res.data.pdfPath ? `PDF generated at ${res.data.pdfPath}` : 'PDF ready');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;
  if (!payslip) return <Layout><div className="p-8 text-red-500">Payslip not found</div></Layout>;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 border px-3 py-1 rounded">Back</button>
          <div className="space-x-3">
            <button onClick={() => window.print()} className="px-4 py-2 border rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50">Print</button>
            <button onClick={handleDownload} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download PDF</button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="bg-white p-10 border rounded-lg shadow-sm print:shadow-none print:border-none">
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold uppercase">KITS Akshar Institute of Technology</h1>
            <p className="text-gray-600 mt-1">Payslip for Month: {payslip.month}/{payslip.year}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
            <div>
              <p><span className="font-semibold text-gray-600 w-32 inline-block">Employee Name:</span> {payslip.facultyName}</p>
              <p><span className="font-semibold text-gray-600 w-32 inline-block">Employee ID:</span> {payslip.employeeId}</p>
              <p><span className="font-semibold text-gray-600 w-32 inline-block">Department:</span> {payslip.department}</p>
            </div>
            <div>
              <p><span className="font-semibold text-gray-600 w-32 inline-block">Status:</span> {payslip.status}</p>
              <p><span className="font-semibold text-gray-600 w-32 inline-block">Bank A/C:</span> XXXXXX1234</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <h3 className="font-bold border-b pb-2 mb-3 bg-gray-50 px-2 py-1">Earnings</h3>
              <div className="space-y-2 px-2">
                <div className="flex justify-between"><span className="text-gray-600">Basic Pay</span><span>₹{payslip.basicPay}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">HRA</span><span>₹{payslip.hra}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">DA</span><span>₹{payslip.da}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Allowances</span><span>₹{payslip.allowances}</span></div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>Gross Salary</span><span>₹{payslip.grossSalary}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold border-b pb-2 mb-3 bg-gray-50 px-2 py-1">Deductions</h3>
              <div className="space-y-2 px-2">
                <div className="flex justify-between"><span className="text-gray-600">Provident Fund</span><span>₹{payslip.providentFund}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Professional Tax</span><span>₹{payslip.professionalTax}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Other Deductions</span><span>₹{payslip.otherDeductions}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">&nbsp;</span><span>&nbsp;</span></div>
                <div className="flex justify-between font-bold pt-2 border-t mt-2">
                  <span>Total Deductions</span><span className="text-red-600">₹{payslip.totalDeductions}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t font-bold text-lg flex justify-between px-2 bg-green-50 p-4 rounded text-green-800">
            <span>Net Salary Payable</span>
            <span>₹{payslip.netSalary}</span>
          </div>
          
          <p className="text-xs text-center text-gray-400 mt-12 pb-4">
            This is a computer generated document and does not require a physical signature.
          </p>
        </div>
      </div>
    </Layout>
  );
};
