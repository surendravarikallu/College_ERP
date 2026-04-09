/**
 * Exam Cell Types — Client-side type definitions
 * These mirror the server-side Drizzle schema types.
 */

export interface Admin {
  id: number;
  username: string;
  password: string;
  isAdmin: boolean;
  canUpload: boolean;
  canManageSettings: boolean;
  canManageAcademics: boolean;
  canManageInternalMarks: boolean;
  canViewDashboard: boolean;
  canViewStudents: boolean;
  canViewReports: boolean;
  canFreezeMarks: boolean;
  loginType: string;
  allowedIps: string;
}

export interface Student {
  id: number;
  rollNumber: string;
  name: string;
  branch: string;
  batch: string;
  regulation: string;
  program?: string | null;
  section?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface Subject {
  id: number;
  subjectCode: string;
  subjectName: string;
  credits: number;
  semester: string;
  branch: string;
}

export interface Result {
  id: number;
  studentId: number;
  subjectId: number;
  semester: string;
  academicYear: string;
  examType: string;
  attemptNo: number;
  grade: string;
  gradePoints: number;
  creditsEarned: number;
  internalMarks?: number | null;
  status: string;
  isLatest: boolean;
  createdAt?: string | null;
}

export interface ResultWithRelations extends Result {
  subject: Subject;
}

export interface StudentDetails extends Student {
  results: ResultWithRelations[];
  sgpaPerSemester: Record<string, number>;
  cgpa: number;
  totalCredits: number;
  backlogCount: number;
  status?: string;
  statusSemester?: string;
}

export interface Faculty {
  id: number;
  facultyName: string;
  department?: string | null;
  designation?: string | null;
}

export interface FacultySubjectMap {
  id: number;
  facultyId: number;
  subjectCode: string;
  semester: string;
  branch: string;
  batch: string;
  academicYear: string;
  section?: string | null;
}

export interface MidExam {
  id: number;
  academicYear: string;
  semester: string;
  branch: string;
  batch: string;
  subjectCode: string;
  midType: string;
  maxMarks: number;
  isFrozen: boolean;
  isFinalLocked: boolean;
  lockedAt?: string | null;
  createdAt: string;
}

export interface MidMark {
  id: number;
  studentId: number;
  midExamId: number;
  midExamMarks: number;
  assignmentMarks: number;
  quizMarks: number;
  totalMarks: number;
  labDailyMarks: number;
  labRecordMarks: number;
  labInternalMarks: number;
  labVivaMarks: number;
  prcAssessmentMarks: number;
  reportMarks: number;
  seminarMarks: number;
  enteredBy: number;
  isLocked: boolean;
  lockedAt?: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  actionType: string;
  entityType: string;
  entityId: number;
  performedBy: number;
  reason?: string | null;
  createdAt: string;
}

export interface GlobalSettings {
  id: number;
  autoLockOnSave: boolean;
  updatedAt: string;
}

// Re-export table references for type compatibility
export const admins = {} as any;
export const students = {} as any;
export const subjects = {} as any;
export const results = {} as any;
