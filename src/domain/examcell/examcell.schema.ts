import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";

export const admins = pgTable("ec_admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  canUpload: boolean("can_upload").default(false).notNull(),
  canManageSettings: boolean("can_manage_settings").default(false).notNull(),
  canManageAcademics: boolean("can_manage_academics").default(false).notNull(),
  canManageInternalMarks: boolean("can_manage_internal_marks").default(false).notNull(),
  canViewDashboard: boolean("can_view_dashboard").default(false).notNull(),
  canViewStudents: boolean("can_view_students").default(false).notNull(),
  canViewReports: boolean("can_view_reports").default(false).notNull(),
  canFreezeMarks: boolean("can_freeze_marks").default(false).notNull(),
  loginType: text("login_type").notNull().default("GLOBAL"),
  allowedIps: text("allowed_ips").notNull().default(""),
});

export const students = pgTable("ec_students", {
  id: serial("id").primaryKey(),
  rollNumber: text("roll_number").notNull().unique(),
  name: text("name").notNull(),
  branch: text("branch").notNull(),
  batch: text("batch").notNull(),
  regulation: text("regulation").notNull(),
  program: text("program"),
  section: text("section"),
  gender: text("gender"),
  phone: text("phone"),
  address: text("address"),
  fatherName: text("father_name"),
});

export const studentAcademicStatus = pgTable("ec_student_academic_status", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  academicYear: text("academic_year").notNull(),
  semester: text("semester").notNull(),
  status: text("status").notNull(),
  reason: text("reason").default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const studentPhotos = pgTable("ec_student_photos", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id).unique(),
  photoData: text("photo_data").notNull(),
});

export const subjects = pgTable("ec_subjects", {
  id: serial("id").primaryKey(),
  subjectCode: text("subject_code").notNull().unique(),
  subjectName: text("subject_name").notNull(),
  credits: doublePrecision("credits").notNull(),
  semester: text("semester").notNull(),
  branch: text("branch").notNull(),
});

export const results = pgTable("ec_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  semester: text("semester").notNull(),
  academicYear: text("academic_year").notNull(),
  examType: text("exam_type").notNull(),
  attemptNo: integer("attempt_no").notNull(),
  grade: text("grade").notNull(),
  gradePoints: integer("grade_points").notNull(),
  creditsEarned: doublePrecision("credits_earned").notNull(),
  internalMarks: integer("internal_marks"),
  status: text("status").notNull(),
  isLatest: boolean("is_latest").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    uniqueResultIdx: uniqueIndex("ec_unique_result_idx").on(
      table.studentId,
      table.subjectId,
      table.examType,
      table.academicYear
    )
  };
});

export const faculty = pgTable("ec_faculty", {
  id: serial("id").primaryKey(),
  facultyName: text("faculty_name").notNull(),
  department: text("department"),
  designation: text("designation"),
});

export const facultySubjectMap = pgTable("ec_faculty_subject_map", {
  id: serial("id").primaryKey(),
  facultyId: integer("faculty_id").notNull().references(() => faculty.id),
  subjectCode: text("subject_code").notNull(),
  semester: text("semester").notNull(),
  branch: text("branch").notNull(),
  batch: text("batch").notNull(),
  academicYear: text("academic_year").notNull(),
  section: text("section"),
});

export const midExams = pgTable("ec_mid_exams", {
  id: serial("id").primaryKey(),
  academicYear: text("academic_year").notNull(),
  semester: text("semester").notNull(),
  branch: text("branch").notNull(),
  batch: text("batch").notNull().default(''),
  subjectCode: text("subject_code").notNull(),
  midType: text("mid_type").notNull(),
  maxMarks: integer("max_marks").notNull().default(30),
  isFrozen: boolean("is_frozen").notNull().default(false),
  isFinalLocked: boolean("is_final_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const midMarks = pgTable("ec_mid_marks", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  midExamId: integer("mid_exam_id").notNull().references(() => midExams.id),
  midExamMarks: doublePrecision("mid_exam_marks").notNull().default(0),
  assignmentMarks: doublePrecision("assignment_marks").notNull().default(0),
  quizMarks: doublePrecision("quiz_marks").notNull().default(0),
  totalMarks: doublePrecision("total_marks").notNull().default(0),
  labDailyMarks: doublePrecision("lab_daily_marks").notNull().default(0),
  labRecordMarks: doublePrecision("lab_record_marks").notNull().default(0),
  labInternalMarks: doublePrecision("lab_internal_marks").notNull().default(0),
  labVivaMarks: doublePrecision("lab_viva_marks").notNull().default(0),
  prcAssessmentMarks: doublePrecision("prc_assessment_marks").notNull().default(0),
  reportMarks: doublePrecision("report_marks").notNull().default(0),
  seminarMarks: doublePrecision("seminar_marks").notNull().default(0),
  enteredBy: integer("entered_by").notNull().references(() => admins.id),
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueMidMarkIdx: uniqueIndex("ec_unique_mid_mark_idx").on(
      table.studentId,
      table.midExamId
    )
  };
});

export const auditLogs = pgTable("ec_audit_logs", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  performedBy: integer("performed_by").notNull().references(() => admins.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const globalSettings = pgTable("ec_global_settings", {
  id: serial("id").primaryKey(),
  autoLockOnSave: boolean("auto_lock_on_save").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ——— Zod Schemas (manual, Zod v4 compatible) ———
export const insertAdminSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  isAdmin: z.boolean().optional().default(false),
  canUpload: z.boolean().optional().default(false),
  canManageSettings: z.boolean().optional().default(false),
  canManageAcademics: z.boolean().optional().default(false),
  canManageInternalMarks: z.boolean().optional().default(false),
  canViewDashboard: z.boolean().optional().default(true),
  canViewStudents: z.boolean().optional().default(true),
  canViewReports: z.boolean().optional().default(true),
  canFreezeMarks: z.boolean().optional().default(false),
  loginType: z.string().optional().default("GLOBAL"),
  allowedIps: z.string().optional().default(""),
});

export const insertStudentSchema = z.object({
  name: z.string(),
  rollNumber: z.string(),
  branch: z.string(),
  batch: z.string(),
  regulation: z.string(),
  program: z.string().nullable().optional(),
  section: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
});

export const insertSubjectSchema = z.object({
  subjectCode: z.string(),
  subjectName: z.string(),
  credits: z.number(),
  semester: z.string(),
  branch: z.string(),
});

export const insertResultSchema = z.object({
  studentId: z.number(),
  subjectId: z.number(),
  semester: z.string(),
  academicYear: z.string(),
  examType: z.string(),
  attemptNo: z.number(),
  grade: z.string(),
  gradePoints: z.number(),
  creditsEarned: z.number(),
  internalMarks: z.number().nullable().optional(),
  status: z.string(),
  isLatest: z.boolean().optional().default(true),
});

export const insertFacultySchema = z.object({
  facultyName: z.string(),
  department: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
});

export const insertFacultySubjectMapSchema = z.object({
  facultyId: z.number(),
  subjectCode: z.string(),
  semester: z.string(),
  branch: z.string(),
  batch: z.string(),
  academicYear: z.string(),
  section: z.string().nullable().optional(),
});

export const insertMidExamSchema = z.object({
  academicYear: z.string(),
  semester: z.string(),
  branch: z.string(),
  batch: z.string().optional().default(''),
  subjectCode: z.string(),
  midType: z.string(),
  maxMarks: z.number().optional().default(30),
  isFrozen: z.boolean().optional().default(false),
  isFinalLocked: z.boolean().optional().default(false),
  lockedAt: z.date().nullable().optional(),
});

export const insertMidMarkSchema = z.object({
  studentId: z.number(),
  midExamId: z.number(),
  midExamMarks: z.number().optional().default(0),
  assignmentMarks: z.number().optional().default(0),
  quizMarks: z.number().optional().default(0),
  totalMarks: z.number().optional().default(0),
  labDailyMarks: z.number().optional().default(0),
  labRecordMarks: z.number().optional().default(0),
  labInternalMarks: z.number().optional().default(0),
  labVivaMarks: z.number().optional().default(0),
  prcAssessmentMarks: z.number().optional().default(0),
  reportMarks: z.number().optional().default(0),
  seminarMarks: z.number().optional().default(0),
  enteredBy: z.number(),
  isLocked: z.boolean().optional().default(false),
  lockedAt: z.date().nullable().optional(),
});

export const insertAuditLogSchema = z.object({
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.number(),
  performedBy: z.number(),
  reason: z.string().nullable().optional(),
});

export const insertGlobalSettingsSchema = z.object({
  autoLockOnSave: z.boolean().optional().default(true),
});

// ——— Types ———
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;
export type ResultWithRelations = Result & { subject: Subject };
export type StudentDetails = Student & {
  results: ResultWithRelations[];
  sgpaPerSemester: Record<string, number>;
  cgpa: number;
  totalCredits: number;
  backlogCount: number;
  status?: string;
  statusSemester?: string;
};
export type Faculty = typeof faculty.$inferSelect;
export type InsertFaculty = z.infer<typeof insertFacultySchema>;
export type FacultySubjectMap = typeof facultySubjectMap.$inferSelect;
export type InsertFacultySubjectMap = z.infer<typeof insertFacultySubjectMapSchema>;
export type MidExam = typeof midExams.$inferSelect;
export type InsertMidExam = z.infer<typeof insertMidExamSchema>;
export type MidMark = typeof midMarks.$inferSelect;
export type InsertMidMark = z.infer<typeof insertMidMarkSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type GlobalSettings = typeof globalSettings.$inferSelect;
export type InsertGlobalSettings = z.infer<typeof insertGlobalSettingsSchema>;
