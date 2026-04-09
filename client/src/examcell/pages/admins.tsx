import React, { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../hooks/use-auth";
import { Loader2, Plus, Edit2, Trash2, Mail, Lock, ShieldAlert, ArrowLeft, Snowflake, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "../hooks/use-toast";
import { formatSemester } from "../lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { ProgramSelector, BatchSelector, BranchSelector, SectionSelector } from "../components/academics/ReportFilters";

type Admin = {
    id: number;
    username: string;
    isAdmin?: boolean;
    canUpload?: boolean;
    canManageSettings?: boolean;
    canManageAcademics?: boolean;
    canManageInternalMarks?: boolean;
    canViewDashboard?: boolean;
    canViewStudents?: boolean;
    canViewReports?: boolean;
    canFreezeMarks?: boolean;
    loginType?: string;
    allowedIps?: string;
};

// Global Auto-Lock Settings Card Component
function GlobalAutoLockCard() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: settings, isLoading } = useQuery<any>({
        queryKey: ['/api/v1/examcell/global-settings'],
        queryFn: () => authFetch('/api/v1/examcell/global-settings'),
    });

    const toggleMutation = useMutation({
        mutationFn: (autoLockOnSave: boolean) =>
            authFetch('/api/v1/examcell/global-settings', {
                method: 'POST',
                body: JSON.stringify({ autoLockOnSave }),
            }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['/api/v1/examcell/global-settings'] });
            toast({ title: "Updated", description: `Auto-lock on save is now ${data.autoLockOnSave ? 'ENABLED' : 'DISABLED'}.` });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const isEnabled = settings?.autoLockOnSave ?? true;

    return (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-visible">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-500" /> Global Marks Lock Settings
            </h2>
            <p className="text-sm text-slate-500 mb-5">
                Controls whether marks are automatically locked after saving. When enabled, all saved marks (MID & Lab) will be immediately locked and cannot be edited by faculty.
            </p>
            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading settings...</div>
            ) : (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                            {isEnabled ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">Auto-Lock marks after saving</p>
                            <p className="text-xs text-slate-500">
                                {isEnabled
                                    ? 'Marks will be locked immediately when saved by any user.'
                                    : 'Marks will be saved as drafts. Faculty can continue editing until frozen.'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => toggleMutation.mutate(!isEnabled)}
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function Admins() {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'admins' | 'freeze'>(user?.canFreezeMarks && !user?.canManageSettings && !user?.isAdmin ? 'freeze' : 'admins');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

    // Freeze Controls State
    const [freezeProgram, setFreezeProgram] = useState("B.TECH");
    const [freezeBatch, setFreezeBatch] = useState("");
    const [freezeBranch, setFreezeBranch] = useState("");
    const [freezeSemester, setFreezeSemester] = useState("");
    const [freezeSection, setFreezeSection] = useState("");
    const [freezeMidType, setFreezeMidType] = useState("");

    // Form State
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [canUpload, setCanUpload] = useState(false);
    const [canManageSettings, setCanManageSettings] = useState(false);
    const [canManageAcademics, setCanManageAcademics] = useState(false);
    const [canManageInternalMarks, setCanManageInternalMarks] = useState(false);
    const [canViewDashboard, setCanViewDashboard] = useState(true);
    const [canViewStudents, setCanViewStudents] = useState(true);
    const [canViewReports, setCanViewReports] = useState(true);
    const [canFreezeMarks, setCanFreezeMarks] = useState(false);
    const [loginType, setLoginType] = useState("GLOBAL");
    const [allowedIps, setAllowedIps] = useState("");

    // Sync active tab when user loads
    React.useEffect(() => {
        if (user) {
            if (user.canFreezeMarks && !user.canManageSettings && !user.isAdmin) {
                setActiveTab('freeze');
            }
        }
    }, [user]);

    const { data: admins, isLoading } = useQuery<Admin[]>({
        queryKey: ["/api/v1/examcell/admins"],
        queryFn: () => authFetch("/api/v1/examcell/admins"),
    });

    const createMutation = useMutation({
        mutationFn: (data: any) =>
            authFetch("/api/v1/examcell/admins", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/admins"] });
            setIsCreateOpen(false);
            resetForm();
            toast({ title: "Success", description: "Admin created successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) =>
            authFetch(`/api/v1/examcell/admins/${id}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/admins"] });
            setIsEditOpen(false);
            resetForm();
            toast({ title: "Success", description: "Admin updated successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) =>
            authFetch(`/api/v1/examcell/admins/${id}`, {
                method: "DELETE",
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/v1/examcell/admins"] });
            setIsDeleteOpen(false);
            setSelectedAdmin(null);
            toast({ title: "Success", description: "Admin deleted successfully" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    // Freeze Controls Query & Mutation
    const freezeQueryKey = ['/api/v1/examcell/exams', { batch: freezeBatch, branch: freezeBranch, semester: freezeSemester, midType: freezeMidType }];
    const { data: exams, isLoading: isExamsLoading, refetch: refetchExams } = useQuery<any[]>({
        queryKey: freezeQueryKey,
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (freezeBatch) qs.append('batch', freezeBatch);
            if (freezeBranch) qs.append('branch', freezeBranch);
            if (freezeSemester) qs.append('semester', freezeSemester);
            if (freezeMidType) qs.append('midType', freezeMidType);
            return authFetch(`/api/v1/examcell/exams?${qs.toString()}`);
        },
        enabled: false,
    });

    const freezeMutation = useMutation({
        mutationFn: ({ examId, isFrozen }: { examId: number; isFrozen: boolean }) =>
            authFetch(`/api/v1/examcell/exams/${examId}/freeze`, {
                method: 'PATCH',
                body: JSON.stringify({ isFrozen }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: freezeQueryKey });
            refetchExams();
            toast({ title: "Success", description: "Freeze status updated!" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const bulkFreezeMutation = useMutation({
        mutationFn: ({ examIds, isFrozen }: { examIds: number[]; isFrozen: boolean }) =>
            authFetch('/api/v1/examcell/exams/bulk-freeze', {
                method: 'POST',
                body: JSON.stringify({ examIds, isFrozen }),
            }),
        onSuccess: (_, vars) => {
            queryClient.invalidateQueries({ queryKey: freezeQueryKey });
            refetchExams();
            toast({ title: "Success", description: `${vars.isFrozen ? 'Frozen' : 'Unfrozen'} ${vars.examIds.length} subjects!` });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleFreezeAll = (freeze: boolean) => {
        if (!exams || exams.length === 0) return;
        const ids = exams.map((r: any) => r.exam.id);
        if (!window.confirm(`Are you sure you want to ${freeze ? 'freeze' : 'unfreeze'} ${ids.length} subjects?`)) return;
        bulkFreezeMutation.mutate({ examIds: ids, isFrozen: freeze });
    };

    const resetForm = () => {
        setUsername("");
        setPassword("");
        setIsAdmin(false);
        setCanUpload(false);
        setCanManageSettings(false);
        setCanManageAcademics(false);
        setCanManageInternalMarks(false);
        setCanViewDashboard(true);
        setCanViewStudents(true);
        setCanViewReports(true);
        setCanFreezeMarks(false);
        setLoginType("GLOBAL");
        setAllowedIps("");
        setSelectedAdmin(null);
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            username,
            password,
            isAdmin,
            canUpload,
            canManageSettings,
            canManageAcademics,
            canManageInternalMarks,
            canViewDashboard,
            canViewStudents,
            canViewReports,
            canFreezeMarks,
            loginType,
            allowedIps
        });
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmin) return;
        const data: any = { username, isAdmin, canUpload, canManageSettings, canManageAcademics, canManageInternalMarks, canViewDashboard, canViewStudents, canViewReports, canFreezeMarks, loginType, allowedIps };
        if (password) data.password = password; // Only send password if changed
        updateMutation.mutate({ id: selectedAdmin.id, data });
    };

    const openEdit = (admin: Admin) => {
        setSelectedAdmin(admin);
        setUsername(admin.username);
        setPassword(""); // Clear password field for edit
        setIsAdmin(admin.isAdmin || false);
        setCanUpload(admin.canUpload || false);
        setCanManageSettings(admin.canManageSettings || false);
        setCanManageAcademics(admin.canManageAcademics || false);
        setCanManageInternalMarks(admin.canManageInternalMarks || false);
        setCanViewDashboard(admin.canViewDashboard !== false); // default true
        setCanViewStudents(admin.canViewStudents !== false);
        setCanViewReports(admin.canViewReports !== false);
        setCanFreezeMarks(admin.canFreezeMarks || false);
        setLoginType(admin.loginType || "GLOBAL");
        setAllowedIps(admin.allowedIps || "");
        setIsEditOpen(true);
    };

    const openDelete = (admin: Admin) => {
        setSelectedAdmin(admin);
        setIsDeleteOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-start gap-3">
                    <button onClick={() => window.history.back()} className="mt-1 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900 border border-slate-200">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900">Admin Settings</h1>
                        <p className="text-slate-500 mt-1">Manage administrators and freeze controls.</p>
                    </div>
                </div>
                {activeTab === 'admins' && (
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Admin
                    </Button>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {(user?.isAdmin || user?.canManageSettings) && (
                    <button
                        onClick={() => setActiveTab('admins')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'admins' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ShieldAlert className="w-4 h-4 inline mr-2" />Manage Admins
                    </button>
                )}
                {(user?.isAdmin || user?.canFreezeMarks) && (
                    <button
                        onClick={() => setActiveTab('freeze')}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'freeze' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Snowflake className="w-4 h-4 inline mr-2" />Freeze Controls
                    </button>
                )}
            </div>

            {(activeTab === 'admins' && (user?.isAdmin || user?.canManageSettings)) ? (
            <>

            <div className="glass-panel rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p>Loading administrators...</p>
                    </div>
                ) : !admins || admins.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <ShieldAlert className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">No admins found</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
                                    <th className="p-4 pl-6">ID</th>
                                    <th className="p-4">Username / Email</th>
                                    <th className="p-4">Roles & Permissions</th>
                                    <th className="p-4 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {admins.map((admin, i) => (
                                    <motion.tr
                                        key={admin.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-slate-50 transition-colors group"
                                    >
                                        <td className="p-4 pl-6 text-slate-500 font-mono text-sm">#{admin.id}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <ShieldAlert className="w-4 h-4" />
                                                </div>
                                                <span className="text-slate-900 font-medium">{admin.username}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {admin.isAdmin && <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium border border-primary/20">Global Admin</span>}
                                                {admin.canUpload && !admin.isAdmin && <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium border border-slate-200">Upload Data</span>}
                                                {admin.canManageSettings && !admin.isAdmin && <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium border border-slate-200">Manage Settings</span>}
                                                {admin.canManageInternalMarks && !admin.isAdmin && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium border border-blue-200">Internal Marks</span>}
                                                {admin.canViewDashboard && !admin.isAdmin && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium border border-green-200">Dashboard</span>}
                                                {admin.canViewStudents && !admin.isAdmin && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200">Students</span>}
                                                {admin.canViewReports && !admin.isAdmin && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium border border-yellow-200">Reports</span>}
                                                {admin.canFreezeMarks && !admin.isAdmin && <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium border border-cyan-200">Freeze Controls</span>}
                                                {admin.loginType === 'IP_BASED' && <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full font-medium border border-rose-200" title={`Allowed IPs: ${admin.allowedIps}`}>Restricted IP</span>}
                                                {!admin.isAdmin && !admin.canUpload && !admin.canManageSettings && !admin.canManageInternalMarks && !admin.canViewDashboard && !admin.canViewStudents && !admin.canViewReports && !admin.canFreezeMarks && <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-full font-medium border border-slate-100">No Access</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(admin)}>
                                                    <Edit2 className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => openDelete(admin)}>
                                                    <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={(open: boolean) => setIsCreateOpen(open)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Admin Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username or Email</Label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin or admin@kits.edu"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label className="text-slate-700 font-semibold">Login Restriction</Label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={loginType} onChange={(e) => setLoginType(e.target.value)}
                            >
                                <option value="GLOBAL">Globally (Any IP)</option>
                                <option value="IP_BASED">IP Based</option>
                            </select>
                            {loginType === 'IP_BASED' && (
                                <div className="pt-2 space-y-2">
                                    <Label htmlFor="create-allowedIps">Allowed IP Addresses (Comma-Separated)</Label>
                                    <Input id="create-allowedIps" value={allowedIps} onChange={(e) => setAllowedIps(e.target.value)} placeholder="e.g., 192.168.3.153" required />
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 pt-2">
                            <Label className="text-slate-700 font-semibold">Tab Access</Label>
                            <p className="text-xs text-slate-400">Select which tabs this user can access.</p>

                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                                {/* isAdmin */}
                                <div className="flex items-center gap-3 p-3 bg-primary/5">
                                    <Checkbox id="create-is-admin" checked={isAdmin} onCheckedChange={(c: boolean | "indeterminate") => setIsAdmin(c === true)} />
                                    <div>
                                        <Label htmlFor="create-is-admin" className="font-semibold text-primary cursor-pointer">Global Administrator</Label>
                                        <p className="text-xs text-slate-500">Full access to all tabs and settings</p>
                                    </div>
                                </div>
                                {/* canViewDashboard */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-view-dashboard" checked={canViewDashboard} onCheckedChange={(c: boolean | "indeterminate") => setCanViewDashboard(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-view-dashboard" className="font-normal cursor-pointer">Dashboard</Label>
                                        <p className="text-xs text-slate-400">View college analytics & dashboard</p>
                                    </div>
                                </div>
                                {/* canViewStudents */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-view-students" checked={canViewStudents} onCheckedChange={(c: boolean | "indeterminate") => setCanViewStudents(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-view-students" className="font-normal cursor-pointer">Students</Label>
                                        <p className="text-xs text-slate-400">View student profiles & searches</p>
                                    </div>
                                </div>
                                {/* canViewReports */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-view-reports" checked={canViewReports} onCheckedChange={(c: boolean | "indeterminate") => setCanViewReports(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-view-reports" className="font-normal cursor-pointer">Academic Reports</Label>
                                        <p className="text-xs text-slate-400">View cumulative/backlog reports</p>
                                    </div>
                                </div>
                                {/* canUpload */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-upload" checked={canUpload} onCheckedChange={(c: boolean | "indeterminate") => setCanUpload(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-upload" className="font-normal cursor-pointer">Data Upload</Label>
                                        <p className="text-xs text-slate-400">Upload tab</p>
                                    </div>
                                </div>
                                {/* canManageAcademics */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-academics" checked={canManageAcademics} onCheckedChange={(c: boolean | "indeterminate") => setCanManageAcademics(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-academics" className="font-normal cursor-pointer">Promotions &amp; Nominal Roll</Label>
                                        <p className="text-xs text-slate-400">Promotions tab + Nominal Roll tab</p>
                                    </div>
                                </div>
                                {/* canManageInternalMarks */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-marks" checked={canManageInternalMarks} onCheckedChange={(c: boolean | "indeterminate") => setCanManageInternalMarks(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-marks" className="font-normal cursor-pointer">Internal &amp; Lab Marks</Label>
                                        <p className="text-xs text-slate-400">Internal Marks tab + Lab Internal Marks tab</p>
                                    </div>
                                </div>
                                {/* canManageSettings */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-manage" checked={canManageSettings} onCheckedChange={(c: boolean | "indeterminate") => setCanManageSettings(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-manage" className="font-normal cursor-pointer">Settings &amp; Faculty</Label>
                                        <p className="text-xs text-slate-400">Settings tab + Faculty Mapping tab</p>
                                    </div>
                                </div>
                                {/* canFreezeMarks */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="create-can-freeze" checked={canFreezeMarks} onCheckedChange={(c: boolean | "indeterminate") => setCanFreezeMarks(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="create-can-freeze" className="font-normal cursor-pointer">Freeze Controls</Label>
                                        <p className="text-xs text-slate-400">Access to freeze/unfreeze marks</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Admin
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={(open: boolean) => setIsEditOpen(open)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Admin Account</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-username">Username or Email</Label>
                            <Input
                                id="edit-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New Password (optional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label className="text-slate-700 font-semibold">Login Restriction</Label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={loginType} onChange={(e) => setLoginType(e.target.value)}
                            >
                                <option value="GLOBAL">Globally (Any IP)</option>
                                <option value="IP_BASED">IP Based</option>
                            </select>
                            {loginType === 'IP_BASED' && (
                                <div className="pt-2 space-y-2">
                                    <Label htmlFor="edit-allowedIps">Allowed IP Addresses (Comma-Separated)</Label>
                                    <Input id="edit-allowedIps" value={allowedIps} onChange={(e) => setAllowedIps(e.target.value)} placeholder="e.g., 192.168.3.153" required />
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 pt-2">
                            <Label className="text-slate-700 font-semibold">Tab Access</Label>
                            <p className="text-xs text-slate-400">Select which tabs this user can access.</p>

                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
                                {/* isAdmin */}
                                <div className="flex items-center gap-3 p-3 bg-primary/5">
                                    <Checkbox id="edit-is-admin" checked={isAdmin} onCheckedChange={(c: boolean | "indeterminate") => setIsAdmin(c === true)} />
                                    <div>
                                        <Label htmlFor="edit-is-admin" className="font-semibold text-primary cursor-pointer">Global Administrator</Label>
                                        <p className="text-xs text-slate-500">Full access to all tabs and settings</p>
                                    </div>
                                </div>
                                {/* canViewDashboard */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-view-dashboard" checked={canViewDashboard} onCheckedChange={(c: boolean | "indeterminate") => setCanViewDashboard(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-view-dashboard" className="font-normal cursor-pointer">Dashboard</Label>
                                        <p className="text-xs text-slate-400">View college analytics & dashboard</p>
                                    </div>
                                </div>
                                {/* canViewStudents */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-view-students" checked={canViewStudents} onCheckedChange={(c: boolean | "indeterminate") => setCanViewStudents(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-view-students" className="font-normal cursor-pointer">Students</Label>
                                        <p className="text-xs text-slate-400">View student profiles & searches</p>
                                    </div>
                                </div>
                                {/* canViewReports */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-view-reports" checked={canViewReports} onCheckedChange={(c: boolean | "indeterminate") => setCanViewReports(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-view-reports" className="font-normal cursor-pointer">Academic Reports</Label>
                                        <p className="text-xs text-slate-400">View cumulative/backlog reports</p>
                                    </div>
                                </div>
                                {/* canUpload */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-upload" checked={canUpload} onCheckedChange={(c: boolean | "indeterminate") => setCanUpload(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-upload" className="font-normal cursor-pointer">Data Upload</Label>
                                        <p className="text-xs text-slate-400">Upload tab</p>
                                    </div>
                                </div>
                                {/* canManageAcademics */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-academics" checked={canManageAcademics} onCheckedChange={(c: boolean | "indeterminate") => setCanManageAcademics(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-academics" className="font-normal cursor-pointer">Promotions &amp; Nominal Roll</Label>
                                        <p className="text-xs text-slate-400">Promotions tab + Nominal Roll tab</p>
                                    </div>
                                </div>
                                {/* canManageInternalMarks */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-marks" checked={canManageInternalMarks} onCheckedChange={(c: boolean | "indeterminate") => setCanManageInternalMarks(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-marks" className="font-normal cursor-pointer">Internal &amp; Lab Marks</Label>
                                        <p className="text-xs text-slate-400">Internal Marks tab + Lab Internal Marks tab</p>
                                    </div>
                                </div>
                                {/* canManageSettings */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-manage" checked={canManageSettings} onCheckedChange={(c: boolean | "indeterminate") => setCanManageSettings(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-manage" className="font-normal cursor-pointer">Settings &amp; Faculty</Label>
                                        <p className="text-xs text-slate-400">Settings tab + Faculty Mapping tab</p>
                                    </div>
                                </div>
                                {/* canFreezeMarks */}
                                <div className="flex items-center gap-3 p-3 hover:bg-slate-50">
                                    <Checkbox id="edit-can-freeze" checked={canFreezeMarks} onCheckedChange={(c: boolean | "indeterminate") => setCanFreezeMarks(c === true)} disabled={isAdmin} />
                                    <div>
                                        <Label htmlFor="edit-can-freeze" className="font-normal cursor-pointer">Freeze Controls</Label>
                                        <p className="text-xs text-slate-400">Access to freeze/unfreeze marks</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteOpen} onOpenChange={(open: boolean) => setIsDeleteOpen(open)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Delete Admin</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-slate-600">
                            Are you sure you want to delete the admin account for <strong>{selectedAdmin?.username}</strong>?
                            This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(selectedAdmin!.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </>
            ) : (activeTab === 'freeze' && (user?.isAdmin || user?.canFreezeMarks)) ? (
            /* Freeze Controls Tab */
            <div className="space-y-6">
                {/* Global Settings Card */}
                <GlobalAutoLockCard />

                <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-visible">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Snowflake className="w-5 h-5 text-cyan-500" /> Freeze / Unfreeze Marks</h2>
                    <p className="text-sm text-slate-500 mb-6">Freezing marks will prevent any faculty from modifying mid or lab marks for the selected subjects. Select filters and click "Load Subjects" to see available exams.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="w-full"><ProgramSelector value={freezeProgram} onChange={setFreezeProgram} /></div>
                        <div className="w-full"><BatchSelector value={freezeBatch} onChange={setFreezeBatch} program={freezeProgram} /></div>
                        <div className="w-full"><BranchSelector value={freezeBranch} onChange={setFreezeBranch} /></div>
                        <div className="space-y-2 w-full">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Semester</label>
                            <select value={freezeSemester} onChange={(e) => setFreezeSemester(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700">
                                <option value="">All Semesters</option>
                                {(freezeProgram === "MCA" ? ["I","II","III","IV"] : ["I","II","III","IV","V","VI","VII","VIII"]).map(s => <option key={s} value={s}>{formatSemester(s, freezeProgram)}</option>)}
                            </select>
                        </div>
                        <div className="w-full"><SectionSelector value={freezeSection} onChange={setFreezeSection} batch={freezeBatch} branch={freezeBranch} /></div>
                        <div className="space-y-2 w-full">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">MID Type</label>
                            <select value={freezeMidType} onChange={(e) => setFreezeMidType(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700">
                                <option value="">All Types</option>
                                <option value="MID1">MID 1</option>
                                <option value="MID2">MID 2</option>
                                <option value="LAB">LAB</option>
                                <option value="PROJECT">PROJECT</option>
                            </select>
                        </div>
                        <Button onClick={() => refetchExams()} disabled={isExamsLoading} className="gap-2 bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md hover:-translate-y-0.5 transition-all">
                            {isExamsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Snowflake className="w-4 h-4" />}
                            Load Subjects
                        </Button>
                    </div>
                </div>

                {/* Results Table */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-500"></div>
                    {exams && exams.length > 0 && (
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <span className="text-sm font-medium text-slate-600">{exams.length} subject(s) found</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" className="gap-1.5 text-xs" disabled={bulkFreezeMutation.isPending} onClick={() => handleFreezeAll(true)}>
                                    {bulkFreezeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />} Freeze All
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={bulkFreezeMutation.isPending} onClick={() => handleFreezeAll(false)}>
                                    {bulkFreezeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />} Unfreeze All
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                                    <th className="p-4 pl-6">Subject Code</th>
                                    <th className="p-4">Subject Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4">Semester</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {!exams ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Click "Load Subjects" to view exams.</td></tr>
                                ) : exams.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-400">No exams found for the selected filters.</td></tr>
                                ) : (
                                    exams.map((row: any, i: number) => {
                                        const exam = row.exam;
                                        const subj = row.subject;
                                        return (
                                            <motion.tr
                                                key={exam.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="hover:bg-slate-50 transition-colors"
                                            >
                                                <td className="p-4 pl-6 font-mono text-sm text-slate-700">{exam.subjectCode}</td>
                                                <td className="p-4 font-medium text-slate-900">{subj?.subjectName || '—'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${exam.midType === 'LAB' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                                        {exam.midType}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-600">{exam.branch}</td>
                                                <td className="p-4 text-slate-600">{exam.semester}</td>
                                                <td className="p-4 text-slate-600">{exam.batch}</td>
                                                <td className="p-4 text-center">
                                                    {exam.isFrozen ? (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-200">
                                                            <Lock className="w-3 h-3" /> Frozen
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
                                                            <Unlock className="w-3 h-3" /> Open
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant={exam.isFrozen ? 'outline' : 'destructive'}
                                                        disabled={freezeMutation.isPending}
                                                        onClick={() => freezeMutation.mutate({ examId: exam.id, isFrozen: !exam.isFrozen })}
                                                        className="gap-1.5 text-xs"
                                                    >
                                                        {exam.isFrozen ? <><Unlock className="w-3 h-3" /> Unfreeze</> : <><Lock className="w-3 h-3" /> Freeze</>}
                                                    </Button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ) : null}
        </div>
    );
}

