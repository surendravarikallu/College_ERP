import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Upload, ListChecks, TrendingUp, Users, 
  CheckCircle2, AlertCircle, Loader2, FileType, Search,
  ArrowRight, ShieldCheck, UserPlus
} from 'lucide-react';
import { officeService } from '../../api/officeService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from '../../components/ui/table';
import { toast } from 'sonner';

const OfficeManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ applied: 0, approved: 0, admitted: 0 });

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await officeService.getApplications();
      setApplications(data);
      
      const counts = data.reduce((acc: any, app: any) => {
        acc[app.status.toLowerCase()] = (acc[app.status.toLowerCase()] || 0) + 1;
        return acc;
      }, {});
      setStats({
        applied: counts.applied || 0,
        approved: counts.approved || 0,
        admitted: counts.admitted || 0
      });
    } catch (err) {
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await officeService.importStudents(file);
      toast.success(`Successfully imported ${res.count} applications`);
      setFile(null);
      fetchApplications();
      setActiveTab('workflow');
    } catch (err) {
      toast.error('Import failed. Please check the Excel format.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await officeService.updateStatus(id, status);
      toast.success(`Status updated to ${status}`);
      fetchApplications();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Office Management</h1>
          <p className="text-muted-foreground mt-1">Manage admissions, bulk imports, and student enrollment workflow.</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="px-4 py-1.5 rounded-full flex gap-2 items-center bg-indigo-50 text-indigo-700 border-indigo-200">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             Active Session: 2025-26
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-wider text-slate-500">Applications Received</CardDescription>
            <CardTitle className="text-3xl font-black">{stats.applied}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
              <TrendingUp className="w-3 h-3" /> New leads this week
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-wider text-slate-500">Approved for Admission</CardDescription>
            <CardTitle className="text-3xl font-black">{stats.approved}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
              <ShieldCheck className="w-3 h-3" /> Ready for enrollment
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm overflow-hidden group hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase text-[10px] font-bold tracking-wider text-slate-500">Total Admitted</CardDescription>
            <CardTitle className="text-3xl font-black">{stats.admitted}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <UserPlus className="w-3 h-3" /> Converted students
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-xl w-full max-w-md">
          <TabsTrigger value="overview" className="flex-1 gap-2"><Building2 className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="import" className="flex-1 gap-2"><Upload className="w-4 h-4" /> Bulk Import</TabsTrigger>
          <TabsTrigger value="workflow" className="flex-1 gap-2"><ListChecks className="w-4 h-4" /> Admissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
           <Card className="border-slate-200 shadow-none">
              <CardHeader>
                <CardTitle>Admission Overview</CardTitle>
                <CardDescription>Visual breakdown of the current admission cycle progress.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center text-slate-400 border-t bg-slate-50/50 border-slate-100 italic">
                 [ Admission conversion funnel chart coming soon ]
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-dashed bg-slate-50/30">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <FileType className="w-8 h-8 text-indigo-500" />
                </div>
                <CardTitle>Bulk Admission Sync</CardTitle>
                <CardDescription>Upload an Excel file to import student applications in bulk.</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${file ? 'bg-indigo-50/50 border-indigo-400' : 'bg-white border-slate-300 hover:border-indigo-400'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx,.xls" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="font-bold text-slate-800">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" className="text-xs text-red-500" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <p className="font-medium text-slate-700">Click to select or drag and drop</p>
                       <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">XLSX, XLS supported</p>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-center">
                  <Button 
                    disabled={!file || isUploading} 
                    onClick={handleUpload}
                    className="px-10 py-6 rounded-2xl shadow-xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 gap-2 font-bold transition-all text-lg"
                  >
                    {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Upload className="w-5 h-5" /> Import Now</>}
                  </Button>
                </div>
                <div className="mt-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-700 italic">
                  Note: The Excel must contain columns: [Admission Number, Name, Email, Phone, Department ID, Quota Type, Category, Fee Structure ID].
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                 <CardTitle>Admission Queue</CardTitle>
                 <CardDescription>Manage status transitions for incoming applications.</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search applicants..." className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Applicant Name</TableHead>
                      <TableHead>Quota/Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 font-medium text-slate-400 italic">Loading applications...</TableCell></TableRow>
                    ) : applications.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 font-medium text-slate-400 italic">No applications found in queue.</TableCell></TableRow>
                    ) : (
                      applications.map((app) => (
                        <TableRow key={app.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-mono text-xs">{app.admissionNumber}</TableCell>
                          <TableCell>
                            <div className="font-bold">{app.name}</div>
                            <div className="text-[10px] text-slate-500">{app.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant="secondary" className="text-[9px] uppercase px-1.5">{app.quotaType}</Badge>
                              <Badge variant="outline" className="text-[9px] uppercase px-1.5">{app.category}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`uppercase text-[9px] ${
                              app.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              app.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {app.status === 'APPLIED' && (
                              <Button size="sm" variant="outline" className="h-8 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => updateStatus(app.id, 'APPROVED')}>
                                Approve
                              </Button>
                            )}
                            {app.status === 'APPROVED' && (
                              <Button size="sm" className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => updateStatus(app.id, 'ADMITTED')}>
                                Admit & Create Profile <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                            {app.status === 'ADMITTED' && (
                              <Badge variant="outline" className="text-[9px] text-slate-400 italic">Profile Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OfficeManagement;
