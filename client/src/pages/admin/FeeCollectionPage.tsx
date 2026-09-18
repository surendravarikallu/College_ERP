import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { toast } from 'sonner';
import { Search, IndianRupee, Printer, AlertTriangle, FileText, Download, CheckCircle2, XCircle, ChevronDown, Upload, Activity, User, CreditCard } from 'lucide-react';

const FeeCollectionPage = () => {
    // Search Filters State
    const [filters, setFilters] = useState({
        userType: 'STUDENT',
        feeType: 'COLLEGE FEE',
        feeName: '',
        examStructure: '',
        htNo: '',
        fromDue: '1',
        toDue: '9999999'
    });

    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [dues, setDues] = useState<any[]>([]);
    const [totalDue, setTotalDue] = useState(0);

    // Collection Form State
    const [form, setForm] = useState({
        paymentType: 'Cash',
        receiptDate: new Date().toISOString().split('T')[0],
        refNo: '',
        date: '',
        payExcess: '',
        narration: '',
        grandTotal: '',
        bankName: '-Select-',
        totalInWords: '',
        address: ''
    });

    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

    const formatCurrency = (val: number) => val.toLocaleString('en-IN');

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!filters.htNo.trim()) return;
        setLoading(true);
        try {
            const res = await apiClient.get(`/fees/student/${filters.htNo.trim()}/search`);
            const data = res.data.data;
            setStudent(data.student);
            setTotalDue(data.totalDue || 0);
            setDues(data.student.feeInvoices || []);
            toast.success('Student found');
        } catch (err: any) {
            setStudent(null);
            setDues([]);
            toast.error(err?.response?.data?.error || 'Student not found');
        } finally {
            setLoading(false);
        }
    };

    const handleCollect = async () => {
        if (selectedInvoices.length === 0) {
            return toast.error('Please select at least one invoice.');
        }
        toast.info('Processing collection...');
    };

    const handleDownloadReceipt = async (invoiceId: string, invoiceNumber: string) => {
        const toastId = toast.loading('Opening receipt...');
        try {
            const res = await apiClient.get(`/fees/receipt/${invoiceId}`, { responseType: 'blob' });
            if (res.data.size < 500) throw new Error('Invalid PDF buffer');

            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Receipt-${invoiceNumber}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
            toast.success('Receipt ready', { id: toastId });
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (err) {
            toast.error('Failed to generate receipt', { id: toastId });
        }
    };

    return (
        <div className="bg-white min-h-screen text-slate-800 p-2 space-y-4">
            {/* 1. Module Header */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden">
                <div className="erp-header-blue px-3 py-1.5 text-[14px] flex justify-between items-center font-bold">
                    <div className="flex items-center gap-2 uppercase tracking-tight">
                        <CreditCard className="w-4 h-4" />
                        Regular Fees Collection Portal
                    </div>
                </div>
                {/* 2. Search Matrix Section */}
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3 items-end">
                        <div className="space-y-1">
                            <label className="erp-label block">User Type</label>
                            <select className="erp-input w-full font-bold" value={filters.userType} onChange={e => setFilters({ ...filters, userType: e.target.value })}>
                                <option>STUDENT</option>
                                <option>FACULTY</option>
                                <option>STAFF</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label block">Fee Type</label>
                            <select className="erp-input w-full font-bold" value={filters.feeType} onChange={e => setFilters({ ...filters, feeType: e.target.value })}>
                                <option>COLLEGE FEE</option>
                                <option>HOSTEL FEE</option>
                                <option>TRANSPORT FEE</option>
                                <option>EXAM FEE</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label block">Fee Category</label>
                            <select className="erp-input w-full font-bold" value={filters.feeName} onChange={e => setFilters({ ...filters, feeName: e.target.value })}>
                                <option value="">- All Categories -</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label block underline decoration-blue-300">Hall Ticket / ID Number</label>
                            <div className="relative">
                                <input className="erp-input w-full bg-blue-50 font-mono font-black pr-10 uppercase" value={filters.htNo} onChange={e => setFilters({ ...filters, htNo: e.target.value })} placeholder="Enter ID..." onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label block">From Due (Min)</label>
                            <input className="erp-input w-full" value={filters.fromDue} onChange={e => setFilters({ ...filters, fromDue: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="erp-label block">To Due (Max)</label>
                            <input className="erp-input w-full" value={filters.toDue} onChange={e => setFilters({ ...filters, toDue: e.target.value })} />
                        </div>
                        <div className="md:col-span-2 flex justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded bg-white text-[10px] font-bold uppercase transition-colors hover:bg-slate-50"><Download className="w-3 h-3 text-emerald-600" /> Import Ledger</button>
                                <span className="text-[10px] text-slate-500 italic max-w-[100px] truncate">No file chosen</span>
                                <button className="p-2 bg-rose-500 text-white rounded shadow-sm transition-transform active:scale-95"><Upload className="w-4 h-4" /></button>
                            </div>
                            <button onClick={handleSearch} disabled={loading} className="erp-btn-rect px-12 py-2 bg-[#004b93] hover:bg-[#003870] font-black uppercase tracking-widest text-[12px] shadow-lg shadow-blue-500/30">
                                {loading ? 'Processing...' : 'Fetch Financial Records'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Student Profile Matrix */}
            <div className="border border-slate-300 rounded shadow-sm overflow-hidden bg-white">
                <table className="w-full erp-table-dense">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                            <th className="text-center w-40">Roll / ID Number</th>
                            <th className="text-left w-72">Full Name</th>
                            <th className="text-center w-24">Caste</th>
                            <th className="text-center w-24">Program</th>
                            <th className="text-center w-32">Branch</th>
                            <th className="text-center w-40">Academic Span</th>
                            <th className="text-center w-32">Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="erp-strip-green font-black text-center text-slate-800">
                            <td className="text-blue-700 underline cursor-pointer font-mono">{student?.rollNumber || '-'}</td>
                            <td className="text-left uppercase truncate max-w-[280px]">{student?.name || '-'}</td>
                            <td className="uppercase">{student?.category || '-'}</td>
                            <td>B.TECH</td>
                            <td className="uppercase">{student?.department?.code || '-'}</td>
                            <td className="text-[10px]">{student ? "III Year - II Sem" : "-"}</td>
                            <td className="font-mono">{student?.phoneNumber || '-'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {student && <p className="text-[10px] font-black text-[#004b93] uppercase -mt-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Status: Financial Record Synchronized</p>}

            {/* 4. Financial Summary Overlay */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
                <div className="flex-1 flex items-center justify-around bg-slate-50 border border-slate-200 rounded p-3 text-[12px] font-bold">
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-slate-500 uppercase text-[10px]">Academic Term</p>
                        <p className="text-blue-700">2025 - 2026</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-slate-500 uppercase text-[10px]">Reference</p>
                        <p className="text-blue-700 font-mono">{student?.rollNumber || 'NA'}</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-200">
                        <p className="text-slate-500 uppercase text-[10px]">Admission</p>
                        <p className="text-emerald-700">CONVENOR</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-slate-500 uppercase text-[10px]">Credit/Excess</p>
                        <p className="text-rose-700 font-black underline decoration-2">₹ 0.00</p>
                    </div>
                </div>
                <div className="bg-[#fffbeb] border-2 border-amber-200 rounded px-8 py-2 flex flex-col items-center justify-center min-w-[250px] shadow-sm">
                    <span className="font-black text-slate-600 uppercase text-[10px] tracking-widest">Total Liability (DUE)</span>
                    <span className="text-3xl font-black text-[#004b93] drop-shadow-sm flex items-center gap-1">
                        <IndianRupee className="w-5 h-5 text-slate-400" />
                        {student ? formatCurrency(totalDue || 108235) : '0.00'}
                    </span>
                </div>
            </div>

            {/* 5. Payment Instrument Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border border-slate-200 rounded p-4 bg-white/50">
                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
                    <div className="space-y-1">
                        <label className="erp-label">Payment Mode</label>
                        <select className="erp-input w-full font-black text-blue-800" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })}>
                            <option>Cash</option>
                            <option>Cheque</option>
                            <option>DD</option>
                            <option>Online/UPI</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Generation Date</label>
                        <input type="date" className="erp-input w-full font-bold" value={form.receiptDate} onChange={e => setForm({ ...form, receiptDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Grand Collection</label>
                        <input className="erp-input w-full bg-slate-100 font-black text-[#004b93]" readOnly value={form.grandTotal} placeholder="0.00" />
                    </div>

                    <div className="space-y-1">
                        <label className="erp-label">Transaction Ref</label>
                        <input className="erp-input w-full" value={form.refNo} onChange={e => setForm({ ...form, refNo: e.target.value })} placeholder="TXN-ID / Cheque No" />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Instrument Date</label>
                        <input className="erp-input w-full" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label">Beneficiary Bank</label>
                        <select className="erp-input w-full" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}>
                            <option>- Select Authorized Bank -</option>
                            <option>SBI - Main Branch</option>
                            <option>Union Bank of India</option>
                            <option>ICICI Institution Acct</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 space-y-1">
                        <label className="erp-label">Collection Narrative (Remarks)</label>
                        <textarea className="erp-input w-full h-10 resize-none font-medium text-slate-600" value={form.narration} onChange={e => setForm({ ...form, narration: e.target.value })} placeholder="Enter collection notes..." />
                    </div>
                    <div className="space-y-1">
                        <label className="erp-label block">Total in Words</label>
                        <div className="erp-input w-full bg-slate-50 text-[10px] h-10 italic flex items-center px-3 border-dashed overflow-hidden">
                            Zero Rupees Only
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-2 justify-center border-l-0 lg:border-l border-slate-200 pl-0 lg:ml-4 lg:pl-4">
                    <button onClick={handleCollect} className="erp-btn-rect bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center gap-2 py-3">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-black uppercase tracking-wider">Authorize Payment</span>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button className="erp-btn-rect bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold py-2">FEE CARD</button>
                        <button className="erp-btn-rect bg-slate-600 hover:bg-slate-700 text-[10px] font-bold py-2">HISTORY</button>
                    </div>
                    <button 
                        onClick={() => {
                            const lastPaid = dues.filter(d => d.status === 'SUCCESS').sort((a,b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())[0];
                            if (lastPaid) handleDownloadReceipt(lastPaid.id, lastPaid.invoiceNumber);
                            else toast.error('No recent payments found');
                        }}
                        className="erp-btn-rect bg-[#004b93] hover:bg-[#003870] font-black uppercase text-[10px] mt-2 group flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4 group-hover:animate-bounce" />
                        Reprint Last Receipt
                    </button>
                </div>
            </div>

            {/* 6. Comprehensive Ledger Detail */}
            <div className="border border-slate-300 rounded overflow-hidden shadow-sm">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full border-collapse erp-table-dense">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-300">
                                <th className="p-2 border-r border-slate-300 text-center w-12">Sel</th>
                                <th className="p-2 border-r border-slate-300">Academic Year</th>
                                <th className="p-2 border-r border-slate-300">Fee Head / Description</th>
                                <th className="p-2 border-r border-slate-300">Periodicity</th>
                                <th className="p-2 border-r border-slate-300 text-right">Target</th>
                                <th className="p-2 border-r border-slate-300 text-right">Collected</th>
                                <th className="p-2 border-r border-slate-300 text-right">RTF/MTF</th>
                                <th className="p-2 border-r border-slate-300 text-right">Fine</th>
                                <th className="p-2 border-r border-slate-300 text-right font-bold text-[#b91c1c]">DUE</th>
                                <th className="p-2 border-r border-slate-300 text-center font-bold">Pay Now</th>
                                <th className="p-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {dues.length === 0 ? (
                                <tr><td colSpan={11} className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">No financial ledger entries available. Please verify the ID Number above.</td></tr>
                            ) : dues.map((due: any) => {
                                const isSelected = selectedInvoices.includes(due.id);
                                const toggleSelect = () => {
                                    if (isSelected) setSelectedInvoices(selectedInvoices.filter(id => id !== due.id));
                                    else setSelectedInvoices([...selectedInvoices, due.id]);
                                };

                                return (
                                    <React.Fragment key={due.id}>
                                        <tr className={`hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-50/80 shadow-inner' : ''}`}>
                                            <td className="p-2 text-center border-r border-slate-200">
                                                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-[#004b93]" checked={isSelected} onChange={toggleSelect} />
                                            </td>
                                            <td className="p-2 text-center border-r border-slate-200 font-bold text-slate-500">{due.academicYear}</td>
                                            <td className="p-2 border-r border-slate-200 font-black text-slate-700">{due.feeStructure?.name}</td>
                                            <td className="p-2 text-center border-r border-slate-200 text-[9px] font-bold text-slate-400">ANNUAL - R23</td>
                                            <td className="p-2 text-right border-r border-slate-200 font-mono">{formatCurrency(due.finalAmount)}</td>
                                            <td className="p-2 text-right border-r border-slate-200 text-emerald-700 font-bold">{formatCurrency(due.collectedAmount)}</td>
                                            <td className="p-2 text-right border-r border-slate-200 text-blue-600 font-bold">{formatCurrency(due.reimbursementAmt || 0)}</td>
                                            <td className="p-2 text-right border-r border-slate-200">
                                                <input className="w-16 h-6 border rounded text-right px-1 font-bold text-rose-500" placeholder="0" />
                                            </td>
                                            <td className="p-2 text-right border-r border-slate-200 font-black text-rose-700">{formatCurrency(due.finalAmount - due.collectedAmount)}</td>
                                            <td className="p-2 text-center border-r border-slate-200">
                                                <input className="w-20 h-7 border-2 border-blue-200 rounded text-right px-1 bg-white font-black text-[#004b93] text-[12px]" defaultValue={due.finalAmount - due.collectedAmount} />
                                            </td>
                                            <td className="p-2 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <button className="text-blue-700 hover:text-blue-900 font-black uppercase text-[9px] flex items-center gap-1 mx-auto bg-blue-50 px-2 py-1 rounded">
                                                        <Activity className="w-3 h-3" /> Audit
                                                    </button>
                                                    {due.status === 'SUCCESS' && (
                                                        <button 
                                                            onClick={() => handleDownloadReceipt(due.id, due.invoiceNumber)}
                                                            className="text-emerald-700 hover:text-emerald-900 font-black uppercase text-[9px] flex items-center gap-1 mx-auto bg-emerald-50 px-2 py-1 rounded border border-emerald-100"
                                                        >
                                                            <Printer className="w-3 h-3" /> Receipt
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                                            <td colSpan={4} className="p-1 px-4 text-right italic font-black text-[#004b93] border-r border-slate-200 border-l uppercase text-[9px] tracking-wider">Annual Consolidation Summary ({due.academicYear})</td>
                                            <td className="p-1 text-right font-black text-slate-800 border-r border-slate-200 bg-slate-100/50">{formatCurrency(due.finalAmount)}</td>
                                            <td className="p-1 text-right font-black text-emerald-800 border-r border-slate-200">{formatCurrency(due.collectedAmount)}</td>
                                            <td className="p-1 text-right font-black text-blue-800 border-r border-slate-200">{formatCurrency(due.reimbursementAmt || 0)}</td>
                                            <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-300 text-xs">-</td>
                                            <td className="p-1 text-right font-black text-rose-800 border-r border-slate-200">{formatCurrency(due.finalAmount - due.collectedAmount)}</td>
                                            <td colSpan={2} className="bg-white"></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                <span>* Authorized Financial Ledger v2.4</span>
                <span className="text-rose-500">* All Dues are subject to verification from Audit Cell</span>
            </div>
        </div>
    );
};

export default FeeCollectionPage;
