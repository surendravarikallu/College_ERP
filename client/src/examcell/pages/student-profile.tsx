import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useStudentDetails } from "../hooks/use-students";
import { Loader2, GraduationCap, Award, BookOpen, AlertCircle, ArrowLeft, FileText, Edit, Save } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { TranscriptDocument } from "../components/pdf/TranscriptDocument";
import { saveBlobAndShareUrl } from "../lib/capacitorUtils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { formatSemester } from "../lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

export default function StudentProfile() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: student, isLoading } = useStudentDetails(id || "");
  const { user } = useAuth();
  const isSuperAdmin = user?.isAdmin;
  const [semesterOption, setSemesterOption] = useState("all");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  // Edit Profile States
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    rollNumber: "",
    batch: "",
    branch: "",
    regulation: "",
    section: "",
    program: "",
    fatherName: "",
    phone: "",
    address: "",
    gender: ""
  });

  // Populate edit form when student data loads
  useEffect(() => {
    if (student) {
      setEditForm({
        name: student.name || "",
        rollNumber: student.rollNumber || "",
        batch: student.batch || "",
        branch: student.branch || "",
        regulation: student.regulation || "",
        section: student.section || "",
        program: student.program || "",
        fatherName: student.fatherName || "",
        phone: student.phone || "",
        address: student.address || "",
        gender: student.gender || ""
      });
    }
  }, [student]);

  const updateStudentMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const token = (localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'));
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      queryClient.invalidateQueries({ queryKey: [`/api/students/${id}`] });
      setIsEditDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error updating profile", description: err.message, variant: "destructive" });
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentMutation.mutate(editForm);
  };

  // Fetch student photo as base64 for PDF
  useEffect(() => {
    if (!student?.id) return;
    fetch(`/api/students/${student.id}/photo`)
      .then(res => {
        if (!res.ok) throw new Error('No photo');
        return res.arrayBuffer();
      })
      .then(buf => {
        const bytes = new Uint8Array(buf);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        const base64 = btoa(binary);
        // Detect image type from first bytes
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const mime = isPng ? 'image/png' : 'image/jpeg';
        setPhotoUrl(`data:${mime};base64,${base64}`);
      })
      .catch(() => setPhotoUrl(undefined));
  }, [student?.id]);

  // Compute selected semesters from option
  const selectedSemesters = useMemo(() => {
    if (semesterOption === 'all') return undefined;
    if (semesterOption === 'year1') return ['I', 'II'];
    if (semesterOption === 'year2') return ['III', 'IV'];
    if (semesterOption === 'year3') return ['V', 'VI'];
    if (semesterOption === 'year4') return ['VII', 'VIII'];
    // Single semester
    return [semesterOption];
  }, [semesterOption]);

  if (isLoading || !student) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p>Loading student profile...</p>
      </div>
    );
  }

  // Format SGPA data for chart
  const sgpaData = student.sgpaPerSemester
    ? Object.entries(student.sgpaPerSemester).map(([sem, sgpa]) => ({ sem: `Sem ${sem}`, sgpa }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/students" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-display font-bold text-slate-900">Student Profile</h1>
      </div>

      {/* Header Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl overflow-hidden glass-panel border-t border-slate-200"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 via-amber-600/20 to-blue-900/20" />

        <div className="relative pt-16 px-8 pb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/20 border-4 border-white z-10 overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity">
                <img
                  src={`/api/students/${student.id}/photo`}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If photo doesn't exist (404), replace with the graduation cap icon
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                {/* Fallback Icon */}
                <GraduationCap className="w-12 h-12 text-slate-800 absolute hidden z-[-1]" style={{ display: 'none' /* handled by error event */ }} />
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center items-center">
              <img
                src={`/api/students/${student.id}/photo`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                alt={student.name}
              />
            </DialogContent>
          </Dialog>

          <div className="flex-1 text-center md:text-left z-10 w-full md:w-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 w-full">
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">{student.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-slate-600">
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">{student.rollNumber}</span>
                  <span className="font-medium text-slate-700">{student.branch}</span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">Batch {student.batch}</span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">{student.regulation} Regulation</span>
                  {student.section && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-slate-700">Section {student.section}</span>
                    </>
                  )}
                  {student.program && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{student.program}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${student.status === 'DETAINED' ? 'bg-red-100 text-red-700' : student.status?.toUpperCase() === 'ALUMNI' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {student.status || "ACTIVE"}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-slate-700">
                    Current Semester: {student.status?.toUpperCase() === 'ALUMNI'
                      ? 'ALUMNI'
                      : (() => {
                        const semStr = student.statusSemester;
                        if (!semStr) return 'N/A';
                        const match = semStr.match(/\((.*?)\)/);
                        if (!match) return semStr;
                        const semIndex = match[1];
                        if (student.program === 'MCA') {
                          const mcaMap: Record<string, string> = { "I": "I sem", "II": "II sem", "III": "III sem", "IV": "IV sem" };
                          return mcaMap[semIndex] || semStr;
                        }
                        const btechMap: Record<string, string> = {
                          "I": "I year I sem", "II": "I year II sem",
                          "III": "II year I sem", "IV": "II year II sem",
                          "V": "III year I sem", "VI": "III year II sem",
                          "VII": "IV year I sem", "VIII": "IV year II sem",
                        };
                        return btechMap[semIndex] || semStr;
                      })()}
                  </span>
                </div>
              </div>

              {isSuperAdmin && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium text-sm whitespace-nowrap mt-4 md:mt-0 w-full justify-center md:w-auto">
                      <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleEditSubmit}>
                      <DialogHeader>
                        <DialogTitle>Edit Student Profile</DialogTitle>
                        <DialogDescription>
                          Make changes to {student.name}'s basic details here. Click save when you're done.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="name" className="text-slate-700 font-medium font-sm">Full Name</Label>
                          <Input id="name" value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="bg-slate-50 focus-visible:ring-primary/20" required />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="rollNumber" className="text-slate-700 font-medium font-sm">Roll Number (HTNo)</Label>
                          <Input id="rollNumber" value={editForm.rollNumber} onChange={(e) => setEditForm(prev => ({ ...prev, rollNumber: e.target.value }))} className="bg-slate-50 uppercase focus-visible:ring-primary/20" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="branch" className="text-slate-700 font-medium font-sm">Branch</Label>
                            <select id="branch" value={editForm.branch} onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                              <option value="CSE">CSE</option>
                              <option value="CSE (AI&ML)">CSE (AI&ML)</option>
                              <option value="CSE (DS)">CSE (DS)</option>
                              <option value="ECE">ECE</option>
                              <option value="EEE">EEE</option>
                              <option value="IT">IT</option>
                              <option value="MECH">MECH</option>
                              <option value="CIVIL">CIVIL</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="regulation" className="text-slate-700 font-medium font-sm">Regulation</Label>
                            <select id="regulation" value={editForm.regulation} onChange={(e) => setEditForm(prev => ({ ...prev, regulation: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                              <option value="R23">R23</option>
                              <option value="R20">R20</option>
                              <option value="R19">R19</option>
                              <option value="R16">R16</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="batch" className="text-slate-700 font-medium font-sm">Batch (e.g. 2023-2027)</Label>
                          <Input id="batch" value={editForm.batch} onChange={(e) => setEditForm(prev => ({ ...prev, batch: e.target.value }))} className="bg-slate-50 focus-visible:ring-primary/20" required placeholder="YYYY-YYYY" pattern="\d{4}-\d{4}" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="section" className="text-slate-700 font-medium font-sm">Section</Label>
                            <select id="section" value={editForm.section} onChange={(e) => setEditForm(prev => ({ ...prev, section: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                              <option value="">None</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="E">E</option>
                              <option value="F">F</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="program" className="text-slate-700 font-medium font-sm">Program</Label>
                            <select id="program" value={editForm.program} onChange={(e) => setEditForm(prev => ({ ...prev, program: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                              <option value="B.Tech">B.Tech</option>
                              <option value="MCA">MCA</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="fatherName" className="text-slate-700 font-medium font-sm">Father's Name</Label>
                            <Input id="fatherName" value={editForm.fatherName} onChange={(e) => setEditForm(prev => ({ ...prev, fatherName: e.target.value }))} className="bg-slate-50 focus-visible:ring-primary/20" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="phone" className="text-slate-700 font-medium font-sm">Phone Number</Label>
                            <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="bg-slate-50 focus-visible:ring-primary/20" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="gender" className="text-slate-700 font-medium font-sm">Gender</Label>
                            <select id="gender" value={editForm.gender} onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="address" className="text-slate-700 font-medium font-sm">Address</Label>
                            <Input id="address" value={editForm.address} onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} className="bg-slate-50 focus-visible:ring-primary/20" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => setIsEditDialogOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm">Cancel</button>
                        <button type="submit" disabled={updateStudentMutation.isPending} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-slate-800 rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                          {updateStudentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 z-10 w-full md:w-auto mt-6 md:mt-0">
            <div className="text-center px-6 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-center flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Overall CGPA</p>
              <p className="text-2xl font-display font-bold text-primary">{student.cgpa?.toFixed(2) || "N/A"}</p>
            </div>
            <div className="text-center px-6 py-3 rounded-2xl bg-destructive/5 border border-destructive/20 shadow-sm flex flex-col justify-center flex-1">
              <p className="text-xs text-destructive uppercase tracking-wider mb-1 font-semibold">Backlogs</p>
              <p className="text-2xl font-display font-bold text-destructive">{student.backlogCount || 0}</p>
            </div>

            {/* Semester Selector + Download */}
            <div className="flex flex-col gap-2 z-10">
              <select
                value={semesterOption}
                onChange={e => setSemesterOption(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Years (Full Transcript)</option>
                <option value="year1">Year I (Sem I & II)</option>
                <option value="year2">Year II (Sem III & IV)</option>
                <option value="year3">Year III (Sem V & VI)</option>
                <option value="year4">Year IV (Sem VII & VIII)</option>
                <option disabled>──────────────</option>
                <option value="I">Semester I only</option>
                <option value="II">Semester II only</option>
                <option value="III">Semester III only</option>
                <option value="IV">Semester IV only</option>
                <option value="V">Semester V only</option>
                <option value="VI">Semester VI only</option>
                <option value="VII">Semester VII only</option>
                <option value="VIII">Semester VIII only</option>
              </select>
              <button
                onClick={async () => {
                  toast({ title: "Generating Transcript..." });
                  try {
                    const blob = await pdf(
                      <TranscriptDocument
                        studentsData={[{ student: student, results: student.results || [], photoUrl: photoUrl }]}
                        selectedSemesters={selectedSemesters}
                      />
                    ).toBlob();
                    await saveBlobAndShareUrl(`${student.rollNumber}_Transcript${semesterOption !== 'all' ? '_' + semesterOption : ''}.pdf`, blob, 'application/pdf');
                  } catch (e) {
                    toast({ title: "Failed to generate PDF", variant: "destructive" });
                  }
                }}
                className="px-6 py-2.5 rounded-xl bg-white text-slate-800 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors border border-slate-900"
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs font-semibold whitespace-nowrap">Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-panel p-6 rounded-2xl"
        >
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            SGPA Progression
          </h3>
          <div className="h-[250px] w-full">
            {sgpaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sgpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSgpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(43, 96%, 56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="sem" stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.6)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="rgba(0,0,0,0.4)" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.6)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                  />
                  <Area type="monotone" dataKey="sgpa" stroke="hsl(43, 96%, 56%)" strokeWidth={3} fillOpacity={1} fill="url(#colorSgpa)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No semester data available yet.
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-6 rounded-2xl flex flex-col"
        >
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Credits Info
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-500 mb-1 font-medium">Total Earned Credits</p>
                <p className="text-3xl font-bold text-slate-900">{student.totalCredits || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
            </div>

            {student.backlogCount > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <div className="p-5 rounded-xl bg-destructive/5 border border-destructive/20 flex justify-between items-center cursor-pointer hover:bg-destructive/10 transition-colors">
                    <div>
                      <p className="text-sm text-destructive mb-1 font-medium hover:underline">Uncleared Subjects (Click to view)</p>
                      <p className="text-3xl font-bold text-destructive">{student.backlogCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Active Backlogs</DialogTitle>
                    <DialogDescription>
                      The following subjects have not yet been cleared by {student.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto pr-2 mt-4 space-y-3">
                    {student.results
                      ?.filter((r: any) => r.isLatest && r.status === 'BACKLOG')
                      .map((result: any, i: number) => (
                        <div key={i} className="flex justify-between items-start p-3 rounded-lg border border-slate-200 bg-slate-50">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{result.subject?.subjectName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{result.subject?.subjectCode}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium px-2 py-1 rounded bg-slate-200 text-slate-700">Sem {result.semester}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>

        {/* Personal Infomation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel p-6 rounded-2xl flex flex-col"
        >
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Personal Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Father's Name</span>
              <span className="text-sm font-medium text-slate-900">{student.fatherName || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Gender</span>
              <span className="text-sm font-medium text-slate-900">{student.gender || "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">Phone</span>
              <span className="text-sm font-medium text-slate-900">{student.phone || "—"}</span>
            </div>
            <div className="flex justify-between items-start py-2">
              <span className="text-sm text-slate-500">Address</span>
              <span className="text-sm font-medium text-slate-900 text-right max-w-[150px]">{student.address || "—"}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Results Table - Pivoted by Subject */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
            Subject-wise Results History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            {/* Headers moved inside the loop per semester */}
            <tbody>
              {student.results && student.results.length > 0 ? (() => {
                // Group results by semester, then by subjectCode
                const semesterMap: Record<string, Record<string, any[]>> = {};
                for (const r of student.results) {
                  const sem = r.semester || "Unknown";
                  const code = r.subject?.subjectCode || r.subjectId;
                  if (!semesterMap[sem]) semesterMap[sem] = {};
                  if (!semesterMap[sem][code]) semesterMap[sem][code] = [];
                  semesterMap[sem][code].push(r);
                }

                const semOrder: Record<string, number> = { "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8 };
                const sortedSemesters = Object.keys(semesterMap).sort((a, b) => (semOrder[a] || 99) - (semOrder[b] || 99));

                return sortedSemesters.map(semester => {
                  const subjectMap = semesterMap[semester];
                  let localSno = 0;
                  const subjectEntries = Object.entries(subjectMap);
                  return (
                    <React.Fragment key={semester}>
                      {/* Semester header row */}
                      <tr className="bg-slate-200/60">
                        <td
                          colSpan={4 + Math.max(1, (() => {
                            let maxAtt = 0;
                            for (const atts of Object.values(subjectMap)) {
                              const realAtts = atts.filter((a: any) => a.grade?.toUpperCase()?.trim() !== 'CHANGE').length;
                              if (realAtts > maxAtt) maxAtt = realAtts;
                            }
                            return Math.max(8, maxAtt - 1);
                          })()) + 2} // SNo, Code, Subj, Reg + Dynamic Supp Cols + Grade, Credits
                          className="p-2 pl-4 text-xs font-bold text-slate-600 uppercase tracking-widest border-y border-slate-200"
                        >
                          {formatSemester(semester, student.program)}
                        </td>
                      </tr>
                      {/* Calculate max attempts for this semester to dynamically render Supp columns */}
                      {(() => {
                        let maxAttempts = 0;
                        for (const attempts of Object.values(subjectMap)) {
                          // Filter revaluation updates which aren't new attempts
                          const realAttemptsCount = attempts.filter(a => a.grade?.toUpperCase()?.trim() !== 'CHANGE').length;
                          if (realAttemptsCount > maxAttempts) maxAttempts = realAttemptsCount;
                        }
                        // At least show Supp1 to Supp8 to maintain traditional layout even if no supply exist
                        const maxSupps = Math.max(8, maxAttempts - 1); // -1 because attempt 1 is Regular
                        const suppColumnsIndex = Array.from({ length: maxSupps }, (_, i) => i + 1);

                        return (
                          <React.Fragment>
                            {/* Repeat headers for this semester */}
                            <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              <th className="p-2 sm:p-3 pl-4 text-left">SNo</th>
                              <th className="p-2 sm:p-3 text-left">Exam Code</th>
                              <th className="p-2 sm:p-3 min-w-[180px] text-left">Subject</th>
                              <th className="p-2 sm:p-3 text-center">Internal</th>
                              <th className="p-2 sm:p-3 text-center">Regular</th>
                              {suppColumnsIndex.map(idx => (
                                <th key={idx} className="p-2 sm:p-3 text-center">Supp{idx}</th>
                              ))}
                              <th className="p-2 sm:p-3 text-center font-bold text-slate-800">Grade</th>
                              <th className="p-2 sm:p-3 pr-4 text-center">Credits</th>
                            </tr>
                            {subjectEntries.map(([code, attempts]) => {
                              localSno++;
                              // Sort all attempts by attemptNo
                              const sorted = [...attempts].sort((a, b) => a.attemptNo - b.attemptNo);

                              // Filter out revaluation-no-change rows (grade === 'CHANGE')
                              // These should NOT occupy a Supp column slot
                              const realAttempts = sorted.filter(
                                a => a.grade?.toUpperCase()?.trim() !== 'CHANGE'
                              );
                              const hasRevaluation = sorted.some(
                                a => a.grade?.toUpperCase()?.trim() === 'CHANGE'
                              );

                              // Slot-based lookup: idx 0 = Regular, idx 1 = Supp1 ... idx 8 = Supp8
                              const attemptForSlot = (idx: number) => {
                                return realAttempts[idx] || null;
                              };

                              // Use last real attempt for final Grade/Credits/Status
                              const latest = realAttempts[realAttempts.length - 1] ?? sorted[sorted.length - 1];
                              const isPass = latest?.status === "PASS";

                              return (
                                <tr
                                  key={code}
                                  className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors"
                                >
                                  <td className="p-3 pl-4 text-slate-500 tabular-nums">{localSno}</td>
                                  <td className="p-3 font-mono text-xs text-slate-700">{code}</td>
                                  <td className="p-3 text-slate-900 font-medium leading-snug">
                                    {latest?.subject?.subjectName || "—"}
                                  </td>
                                  {/* Internal Marks */}
                                  <td className="p-3 text-center text-slate-600 font-medium">
                                    {latest?.internalMarks != null ? latest.internalMarks : "—"}
                                  </td>
                                  {/* Regular = slot 0 */}
                                  <td className="p-3 text-center">
                                    {(() => {
                                      const a = attemptForSlot(0);
                                      if (!a) return <span className="text-slate-200">—</span>;
                                      const g = a.grade;
                                      const baseGrade = g?.replace(' (REV)', '') ?? g;
                                      const isRev = g?.includes('(REV)');
                                      const isFail = baseGrade === 'F';
                                      return (
                                        <div className="flex flex-col items-center">
                                          <span className={isFail ? 'text-destructive font-bold' : 'text-slate-700 font-medium'}>
                                            {baseGrade}{isRev && <sup className="text-red-500 font-bold ml-0.5">(REV)</sup>}
                                          </span>
                                          <span className="text-[10px] text-slate-600 mt-1 whitespace-nowrap">{a.academicYear}</span>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  {/* Dynamically mapped Supp slots */}
                                  {suppColumnsIndex.map((slotIdx) => {
                                    const a = attemptForSlot(slotIdx);
                                    if (!a) return <td key={slotIdx} className="p-3 text-center"><span className="text-slate-200">—</span></td>;
                                    const g = a.grade;
                                    const baseGrade = g?.replace(' (REV)', '') ?? g;
                                    const isRev = g?.includes('(REV)');
                                    const isFail = baseGrade === 'F';
                                    return (
                                      <td key={slotIdx} className="p-3 text-center">
                                        <div className="flex flex-col items-center">
                                          <span className={isFail ? 'text-destructive font-bold' : 'text-slate-600 font-medium'}>
                                            {baseGrade}{isRev && <sup className="text-red-500 font-bold ml-0.5">(REV)</sup>}
                                          </span>
                                          <span className="text-[10px] text-slate-600 mt-1 whitespace-nowrap">{a.academicYear}</span>
                                        </div>
                                      </td>
                                    );
                                  })}
                                  {/* Final Grade — with optional Rev badge if revaluation was filed */}
                                  <td className="p-3 text-center">
                                    <span className={`font-bold text-base ${isPass ? 'text-primary' : 'text-destructive'}`}>
                                      {latest?.grade || "—"}
                                    </span>
                                    {hasRevaluation && (
                                      <span className="ml-1 text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-300 align-middle">Rev</span>
                                    )}
                                  </td>
                                  {/* Credits */}
                                  <td className="p-3 pr-4 text-center text-slate-700 font-medium">
                                    {!latest ? "—" : !isPass ? "0" : (latest.subject?.credits ?? "—")}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })()}
                    </React.Fragment>
                  );
                });
              })() : (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-muted-foreground">
                    No results recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}


