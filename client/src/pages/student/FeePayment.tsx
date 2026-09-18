import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Receipt, CreditCard, CheckCircle2, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const FeePayment = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDues = async () => {
    try {
      const res = await apiClient.get('/fees/my');
      setInvoices(res.data.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load fee invoices');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDues();
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = async (invoiceId: string) => {
    try {
      toast.loading('Initiating payment...', { id: 'payment' });
      
      const { data } = await apiClient.post('/fees/payment/initiate', { invoiceId });
      
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: data.institutionName,
        description: 'College Fee Payment',
        order_id: data.orderId,
        handler: async function (response: any) {
          toast.success('Payment completed! Verifying with institution...', { id: 'payment' });
          setTimeout(() => {
            fetchDues();
            toast.success('Payment verified! Tracking update successful.', { id: 'payment' });
          }, 2500);
        },
        prefill: {
          name: data.studentName,
        },
        theme: {
          color: '#004b93',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error('Payment failed or cancelled', { id: 'payment' });
        console.error(response.error);
      });
      rzp.open();
      toast.dismiss('payment');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to initiate payment', { id: 'payment' });
    }
  };

  const handleDownloadReceipt = async (inv: any) => {
    const toastId = toast.loading('Opening receipt...');
    try {
      const res = await apiClient.get(`/fees/receipt/${inv.id}`, { 
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' }
      });
      
      if (res.data.size < 500) {
        throw new Error('Invalid format');
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Receipt-${inv.invoiceNumber || inv.id}.pdf`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);
        toast.success('Download started', { id: toastId });
      } else {
        toast.success('Receipt opened', { id: toastId });
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      toast.error('Could not generate receipt', { id: toastId });
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-300 border-t-[#004b93] rounded-full animate-spin" /></div>;

  const pendingAmount = invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.finalAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-[#004b93] tracking-tight uppercase">Fee Ledger</h2>
          <p className="text-slate-500 text-sm font-medium">Digital fee payment & history gateway.</p>
        </div>
        <div className="bg-[#fffbeb] border-2 border-amber-200 px-6 py-3 rounded-xl min-w-[200px] text-center">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Outstanding</p>
          <p className="text-2xl font-black text-[#b91c1c]">₹{pendingAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#004b93]" />
          <h3 className="font-bold text-slate-700 uppercase text-sm tracking-tighter">Transaction Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#004b93] text-white">
                <th className="text-left px-6 py-3 text-[11px] font-black uppercase tracking-wider">Invoice / Ref</th>
                <th className="text-left px-6 py-3 text-[11px] font-black uppercase tracking-wider">Description</th>
                <th className="text-left px-6 py-3 text-[11px] font-black uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-[11px] font-black uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-[11px] font-black uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    No financial records found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-[#004b93] text-sm uppercase">{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter">Ref No: {inv.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{inv.feeStructure?.name || 'Institutional Fee'}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{inv.feeStructure?.feeType || 'General'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-800">₹{inv.finalAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500 italic">AY {inv.academicYear || inv.academicTerm || '2025-26'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {inv.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-black text-[10px] uppercase bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-600 font-black text-[10px] uppercase bg-rose-50 px-2.5 py-1 rounded border border-rose-100 w-fit">
                          <Clock className="w-3 h-3 animate-pulse" /> Pending
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 'SUCCESS' ? (
                        <button 
                          onClick={() => handleDownloadReceipt(inv)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <Download className="w-3 h-3" /> Receipt
                        </button>
                      ) : (
                        <button 
                          onClick={() => handlePayment(inv.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#004b93] hover:bg-[#003870] text-white rounded text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-300/20"
                        >
                          <CreditCard className="w-3 h-3" /> Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeePayment;
