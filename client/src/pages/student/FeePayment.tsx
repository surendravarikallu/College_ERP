import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { Receipt, CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const FeePayment = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/analytics/dashboard/student');
        setData(res.data.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" /></div>;

  const finance = data?.finance || {};
  const invoices = data?.invoices || [];

  const statusIcons: Record<string, React.ReactNode> = {
    PAID: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    DUE: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    PARTIAL: <Clock className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div className="space-y-6">
      {/* Finance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-indigo-500 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Fees</p>
          <p className="text-3xl font-bold mt-2">₹{(finance.totalFees || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-emerald-500 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Paid</p>
          <p className="text-3xl font-bold mt-2 text-emerald-400">₹{(finance.paid || 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-red-500 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Due</p>
          <p className="text-3xl font-bold mt-2 text-red-400">₹{(finance.due || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-base font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-400" /> Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-800/50">
              {['Invoice ID', 'Amount', 'Due Date', 'Status', 'Action'].map(h =>
                <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>)}
            </tr></thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-500">No invoices found.</td></tr>
              ) : invoices.map((inv: any) => (
                <tr key={inv.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                  <td className="px-5 py-3.5 text-sm text-slate-300 font-mono">{inv.id?.substring(0, 8)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold">₹{inv.totalAmount?.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                      ${inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' :
                        inv.status === 'DUE' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {statusIcons[inv.status]} {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {inv.status !== 'PAID' && (
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all">
                        <CreditCard className="w-3 h-3" /> Pay Now
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
