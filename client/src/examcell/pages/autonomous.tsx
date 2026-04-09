import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Separator } from "../../components/ui/separator";
import {
  Bot, BarChart3, FileText, Users, Lock, Download,
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw,
  UserPlus, ClipboardList, TrendingUp, Award,
} from "lucide-react";
import { motion } from "framer-motion";

const API = "/api/v1/examcell";

export default function AutonomousPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Autonomous Operations</h1>
          <p className="text-sm text-muted-foreground">
            Automated result processing, report generation, and evaluation management
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />Reports
          </TabsTrigger>
          <TabsTrigger value="evaluators" className="gap-2">
            <Users className="w-4 h-4" />Evaluators
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2">
            <RefreshCw className="w-4 h-4" />Automation
          </TabsTrigger>
        </TabsList>

        {/* ─── Analytics Tab ─── */}
        <TabsContent value="analytics"><AnalyticsPanel /></TabsContent>

        {/* ─── Reports Tab ─── */}
        <TabsContent value="reports"><ReportsPanel /></TabsContent>

        {/* ─── Evaluators Tab ─── */}
        <TabsContent value="evaluators"><EvaluatorsPanel /></TabsContent>

        {/* ─── Automation Tab ─── */}
        <TabsContent value="automation"><AutomationPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════ Analytics Dashboard ═══════════
function AnalyticsPanel() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: [`${API}/autonomous/analytics`],
    queryFn: () => authFetch(`${API}/autonomous/analytics`),
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingCard />;

  const ov = analytics?.overview || {};
  const im = analytics?.internalMarks || {};
  const bd = analytics?.branchDistribution || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value={ov.totalStudents} color="blue" />
        <StatCard icon={ClipboardList} label="Total Results" value={ov.totalResults} color="purple" />
        <StatCard icon={TrendingUp} label="Pass Rate" value={`${ov.passRate || 0}%`} color="green" />
        <StatCard icon={Award} label="Faculty" value={ov.totalFaculty} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pass / Fail Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 text-center p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{ov.passCount || 0}</p>
                <p className="text-xs text-green-600 font-medium">Passed</p>
              </div>
              <div className="flex-1 text-center p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{ov.failCount || 0}</p>
                <p className="text-xs text-red-600 font-medium">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Internal Marks Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Lock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{im.frozenExams || 0}</p>
                <p className="text-xs text-blue-600 font-medium">Frozen</p>
              </div>
              <div className="flex-1 text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700">{im.pendingExams || 0}</p>
                <p className="text-xs text-amber-600 font-medium">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {bd.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branch-wise Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {bd.map((item: any) => (
                <div key={item.branch} className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-xs text-muted-foreground">{item.branch}</p>
                  <p className="text-lg font-bold text-slate-900">{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ═══════════ Reports Panel ═══════════
function ReportsPanel() {
  const [reportType, setReportType] = useState("semester-summary");
  const [semester, setSemester] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [reportData, setReportData] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: () => authFetch(`${API}/autonomous/generate-report`, {
      method: "POST",
      body: JSON.stringify({ reportType, semester, branch, batch }),
    }),
    onSuccess: (data) => setReportData(data),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Generate Report
          </CardTitle>
          <CardDescription>Select report type and filters, then generate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semester-summary">Semester Summary</SelectItem>
                  <SelectItem value="backlog-analysis">Backlog Analysis</SelectItem>
                  <SelectItem value="topper-list">Topper List</SelectItem>
                  <SelectItem value="internal-marks-summary">Internal Marks Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Input placeholder="e.g. I, II" value={semester} onChange={e => setSemester(e.target.value)} />
            </div>
            <div>
              <Label>Branch</Label>
              <Input placeholder="e.g. CSE" value={branch} onChange={e => setBranch(e.target.value)} />
            </div>
            <div>
              <Label>Batch</Label>
              <Input placeholder="e.g. 2023-27" value={batch} onChange={e => setBatch(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Generate Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {reportData && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">{reportData.reportType}</Badge>
                Report Results
              </CardTitle>
              <CardDescription>Generated: {new Date(reportData.generatedAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportDataView data={reportData} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function ReportDataView({ data }: { data: any }) {
  const d = data.data;
  if (!d) return <p className="text-sm text-muted-foreground">No data</p>;

  if (data.reportType === "semester-summary") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg"><p className="text-xs text-muted-foreground">Total Results</p><p className="text-xl font-bold">{d.totalResults}</p></div>
          <div className="p-3 bg-green-50 rounded-lg"><p className="text-xs text-green-600">Pass Rate</p><p className="text-xl font-bold text-green-700">{d.passRate}%</p></div>
          <div className="p-3 bg-blue-50 rounded-lg"><p className="text-xs text-blue-600">Grades</p><p className="text-xl font-bold text-blue-700">{Object.keys(d.gradeDistribution || {}).length}</p></div>
        </div>
        {d.gradeDistribution && Object.keys(d.gradeDistribution).length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Count</TableHead></TableRow></TableHeader>
            <TableBody>
              {Object.entries(d.gradeDistribution).map(([g, c]: [string, any]) => (
                <TableRow key={g}><TableCell className="font-medium">{g}</TableCell><TableCell>{c}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  if (data.reportType === "backlog-analysis") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium">Total students with backlogs: <span className="text-destructive font-bold">{d.totalStudentsWithBacklogs}</span></p>
        <Table>
          <TableHeader><TableRow><TableHead>Roll No</TableHead><TableHead>Name</TableHead><TableHead>Backlogs</TableHead></TableRow></TableHeader>
          <TableBody>
            {(d.students || []).slice(0, 20).map((s: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">{s.roll}</TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{s.subjects.map((sub: string) => <Badge key={sub} variant="destructive" className="text-xs">{sub}</Badge>)}</div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.reportType === "topper-list") {
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Roll No</TableHead><TableHead>Name</TableHead><TableHead>CGPA</TableHead><TableHead>Credits</TableHead></TableRow></TableHeader>
        <TableBody>
          {(d.toppers || []).map((s: any, i: number) => (
            <TableRow key={i}>
              <TableCell className="font-bold">{i + 1}</TableCell>
              <TableCell className="font-mono text-xs">{s.roll}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell><Badge variant={s.cgpa >= 8 ? "default" : "secondary"}>{s.cgpa}</Badge></TableCell>
              <TableCell>{s.totalCredits}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (data.reportType === "internal-marks-summary") {
    return (
      <Table>
        <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Mid Type</TableHead><TableHead>Students</TableHead><TableHead>Avg</TableHead><TableHead>Max</TableHead><TableHead>Min</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {(d.summary || []).map((s: any, i: number) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{s.subjectCode}</TableCell>
              <TableCell>{s.midType}</TableCell>
              <TableCell>{s.totalStudents}</TableCell>
              <TableCell>{s.avgMarks}</TableCell>
              <TableCell className="text-green-600 font-medium">{s.maxMarks}</TableCell>
              <TableCell className="text-red-600 font-medium">{s.minMarks}</TableCell>
              <TableCell><Badge variant={s.isFrozen ? "default" : "outline"}>{s.isFrozen ? "Frozen" : "Open"}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(d, null, 2)}</pre>;
}

// ═══════════ Evaluators Panel ═══════════
function EvaluatorsPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [subjects, setSubjects] = useState("");
  const [semester, setSemester] = useState("");
  const [branch, setBranch] = useState("");
  const [result, setResult] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: () => authFetch(`${API}/autonomous/evaluator/create`, {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        subjectCodes: subjects.split(",").map(s => s.trim()).filter(Boolean),
        semester,
        branch,
      }),
    }),
    onSuccess: (data) => {
      setResult(data);
      setUsername("");
      setPassword("");
      setSubjects("");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Create Evaluator Account
          </CardTitle>
          <CardDescription>Create a limited access account for paper evaluation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="evaluator_cse" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label>Assigned Subjects (comma-separated codes)</Label>
              <Input value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="CS301, CS302" />
            </div>
            <div>
              <Label>Semester</Label>
              <Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. III" />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. CSE" />
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !username || !password}>
            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            Create Evaluator
          </Button>
        </CardContent>
      </Card>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">{result.message}</p>
              </div>
              <p className="text-sm text-green-600 mt-2">
                Username: <span className="font-mono font-bold">{result.evaluator?.username}</span> |
                Assigned: {result.evaluator?.assignedSubjects?.join(", ") || "None"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════ Automation Panel ═══════════
function AutomationPanel() {
  const queryClient = useQueryClient();
  const [semester, setSemester] = useState("");
  const [branch, setBranch] = useState("");
  const [batch, setBatch] = useState("");
  const [processResult, setProcessResult] = useState<any>(null);
  const [lockResult, setLockResult] = useState<any>(null);

  const processMutation = useMutation({
    mutationFn: () => authFetch(`${API}/autonomous/process-results`, {
      method: "POST",
      body: JSON.stringify({ semester, branch, batch }),
    }),
    onSuccess: (data) => setProcessResult(data),
  });

  const lockMutation = useMutation({
    mutationFn: () => authFetch(`${API}/autonomous/auto-lock-marks`, {
      method: "POST",
      body: JSON.stringify({ semester }),
    }),
    onSuccess: (data) => {
      setLockResult(data);
      queryClient.invalidateQueries({ queryKey: [`${API}/autonomous/analytics`] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Result Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" /> Auto-Process Results
          </CardTitle>
          <CardDescription>Calculate SGPA, detect backlogs, and flag failures automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>Semester</Label><Input value={semester} onChange={e => setSemester(e.target.value)} placeholder="e.g. III" /></div>
            <div><Label>Branch</Label><Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. CSE" /></div>
            <div><Label>Batch</Label><Input value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. 2023-27" /></div>
          </div>
          <Button onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
            {processMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Process Results
          </Button>
        </CardContent>
      </Card>

      {processResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center"><p className="text-xs text-muted-foreground">Processed</p><p className="text-xl font-bold">{processResult.summary?.totalProcessed}</p></div>
                <div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-xs text-green-600">Passed</p><p className="text-xl font-bold text-green-700">{processResult.summary?.passed}</p></div>
                <div className="p-3 bg-red-50 rounded-lg text-center"><p className="text-xs text-red-600">Failed</p><p className="text-xl font-bold text-red-700">{processResult.summary?.failed}</p></div>
                <div className="p-3 bg-blue-50 rounded-lg text-center"><p className="text-xs text-blue-600">Pass Rate</p><p className="text-xl font-bold text-blue-700">{processResult.summary?.passRate}%</p></div>
              </div>
              {processResult.students?.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Roll No</TableHead><TableHead>Name</TableHead><TableHead>SGPA</TableHead><TableHead>Credits</TableHead><TableHead>Status</TableHead><TableHead>Backlogs</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {processResult.students.slice(0, 20).map((s: any) => (
                      <TableRow key={s.studentId}>
                        <TableCell className="font-mono text-xs">{s.rollNumber}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell><Badge variant={s.sgpa >= 6 ? "default" : "destructive"}>{s.sgpa}</Badge></TableCell>
                        <TableCell>{s.totalCredits}</TableCell>
                        <TableCell><Badge variant={s.status === 'PASS' ? "default" : "destructive"}>{s.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.backlogs.join(", ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Separator />

      {/* Auto Lock Marks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" /> Auto-Lock Internal Marks
          </CardTitle>
          <CardDescription>Automatically freeze exams where all marks are entered</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => lockMutation.mutate()} disabled={lockMutation.isPending} variant="outline">
            {lockMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
            Auto-Lock Complete Exams
          </Button>
        </CardContent>
      </Card>

      {lockResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <p className="font-medium text-blue-700">{lockResult.message}</p>
              {lockResult.lockedExams?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {lockResult.lockedExams.map((e: any) => (
                    <Badge key={e.examId} variant="outline" className="text-xs">{e.subjectCode} ({e.midType})</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ═══════════ Utility Components ═══════════
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border ${colorMap[color]?.split(' ')[2] || ''}`}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorMap[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{value ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
