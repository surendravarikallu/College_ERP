import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, FileText, Wallet,
  Building2, Library, Bus, Package, BarChart3, Settings, Clock,
  GraduationCap, Receipt, CalendarDays, PenTool, ScrollText, Upload,
  UserCog, FileBarChart, Stamp, ListChecks, Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

interface AppShellProps {
  role: string;
}

const menuConfig: Record<string, { label: string; path: string; icon: React.ReactNode }[]> = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Users', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
    { label: 'Academics', path: '/admin/academics', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Attendance', path: '/admin/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Exams', path: '/admin/exams', icon: <FileText className="w-4 h-4" /> },
    { label: 'Finance', path: '/admin/finance', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Hostel', path: '/admin/hostel', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Library', path: '/admin/library', icon: <Library className="w-4 h-4" /> },
    { label: 'Transport', path: '/admin/transport', icon: <Bus className="w-4 h-4" /> },
    { label: 'Inventory', path: '/admin/inventory', icon: <Package className="w-4 h-4" /> },
    { label: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4" /> },
    // ── Exam Cell ──
    { label: 'Exam Cell', path: '/admin/examcell', icon: <GraduationCap className="w-4 h-4" /> },
  ],
  STUDENT: [
    { label: 'Dashboard', path: '/student', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Attendance', path: '/student/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Results', path: '/student/results', icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Fees', path: '/student/fees', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Timetable', path: '/student/timetable', icon: <CalendarDays className="w-4 h-4" /> },
    { label: 'Library', path: '/student/library', icon: <Library className="w-4 h-4" /> },
  ],
  FACULTY: [
    { label: 'Dashboard', path: '/faculty', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Attendance', path: '/faculty/attendance', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'Marks Entry', path: '/faculty/marks', icon: <PenTool className="w-4 h-4" /> },
    { label: 'Timetable', path: '/faculty/timetable', icon: <CalendarDays className="w-4 h-4" /> },
  ],
};

const pageTitles: Record<string, string> = {
  '/admin': 'Admin Dashboard', '/admin/users': 'User Management', '/admin/academics': 'Academic Setup',
  '/admin/attendance': 'Attendance Reports', '/admin/exams': 'Exam Management', '/admin/finance': 'Finance Management',
  '/admin/hostel': 'Hostel Management', '/admin/library': 'Library Management', '/admin/transport': 'Transport Management',
  '/admin/inventory': 'Inventory Management', '/admin/reports': 'Reports & Analytics', '/admin/settings': 'System Settings',
  // Exam Cell
  '/admin/examcell': 'Exam Cell Dashboard', '/admin/examcell/students': 'EC Students',
  '/admin/examcell/reports': 'EC Academic Reports', '/admin/examcell/mid-marks': 'Internal Marks Entry',
  '/admin/examcell/lab-marks': 'Lab Internal Marks', '/admin/examcell/upload': 'Upload Data',
  '/admin/examcell/faculty': 'Faculty Mapping', '/admin/examcell/promotions': 'Promotions',
  '/admin/examcell/nominal-roll': 'Nominal Roll', '/admin/examcell/settings': 'EC Settings',
  '/admin/examcell/login': 'Exam Cell Login',
  // Student / Faculty
  '/student': 'Student Dashboard', '/student/attendance': 'My Attendance', '/student/results': 'Exam Results',
  '/student/fees': 'Fee Payment', '/student/timetable': 'My Timetable', '/student/library': 'Library',
  '/faculty': 'Faculty Dashboard', '/faculty/attendance': 'Mark Attendance', '/faculty/marks': 'Marks Entry',
  '/faculty/timetable': 'My Schedule',
};

const AppShell: React.FC<AppShellProps> = ({ role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const normalizedRole = role === 'SUPER_ADMIN' ? 'ADMIN' : (['HOD', 'PRINCIPAL'].includes(role) ? 'FACULTY' : role);
  const items = menuConfig[normalizedRole] || menuConfig.STUDENT;

  const userInfo = useMemo(() => {
    try {
      const token = localStorage.getItem('erp_access_token');
      if (!token) return { name: 'User', role };
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { name: payload.id?.substring(0, 8) || 'User', role: payload.role || role };
    } catch { return { name: 'User', role }; }
  }, [role]);

  const title = pageTitles[location.pathname] || 'Dashboard';

  useEffect(() => {
    const token = localStorage.getItem('erp_access_token');
    if (!token) return;

    // Connect to WebSocket dynamically
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    });

    socket.on('connect', () => console.log('Socket.io connected:', socket.id));
    
    // Listen for new notifications
    socket.on('notification:new', (data) => {
      toast(data.title, {
        description: data.message,
        icon: <Bot className="w-5 h-5 text-indigo-500" />,
      });
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar items={items} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <TopBar
          title={title}
          userName={userInfo.name}
          userRole={userInfo.role}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
