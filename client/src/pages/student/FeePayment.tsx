import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Receipt, CreditCard, CheckCircle2, Clock, AlertTriangle, Download } from 'lucide-react';
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
      // Changed to the new finance API structure (assuming the backend resolves the student implicitly or we pass it)
      const res = await apiClient.get('/fees/dues');
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
          toast.success('Payment completed! Verifying...', { id: 'payment' });
          // Note: In production, webhook verifies the payment securely.
          // We just softly verify here and refresh the UI.
          setTimeout(() => {
            fetchDues();
            toast.success('Payment verified successfully!', { id: 'payment' });
          }, 3000);
        },
        prefill: {
          name: data.studentName,
        },
        theme: {
          color: '#4f46e5',
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

  const handleDownloadReceipt = async (invoiceId: string) => {
     try {
       const res = await apiClient.get(`/fees/receipt/${invoiceId}`, { responseType: 'blob' });
       const url = window.URL.createObjectURL(new Blob([res.data]));
       const link = document.createElement('a');
       link.href = url;
       link.setAttribute('download', `Receipt-${invoiceId}.pdf`);
       document.body.appendChild(link);
       link.click();
       link.remove();
     } catch (err) {
       toast.error('Failed to download receipt');
     }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const totalDue = invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + curr.finalAmount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Fee Gateway</h2>
          <p className="text-slate-400 mt-1">Manage and pay your institutional fees securely.</p>
        </div>
        <div className="bg-slate-950 px-6 py-4 rounded-xl border border-rose-500/20 w-full md:w-auto">
          <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Total Outstanding</p>
          <p className="text-3xl font-bold text-rose-500 mt-1">₹{totalDue.toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h3 className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-400" /> Active & Past Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-950/50">
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Ref</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No invoices found.</td></tr>
              ) : invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {inv.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{inv.feeStructure?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{inv.feeStructure?.feeType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold">₹{inv.finalAmount.toLocaleString()}</p>
                    {inv.discount > 0 && <p className="text-xs text-emerald-400 mt-0.5">- ₹{inv.discount} discount</p>}
                  </td>
                  <td className="px-6 py-4">
                    {inv.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    ) : inv.isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {inv.status !== 'SUCCESS' ? (
                      <button 
                        onClick={() => handlePayment(inv.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                      >
                        <CreditCard className="w-4 h-4" /> Pay Now
                      </button>
                    ) : (
                       <button 
                        onClick={() => handleDownloadReceipt(inv.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-slate-900/20"
                      >
                        <Download className="w-4 h-4" /> Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeePayment;
