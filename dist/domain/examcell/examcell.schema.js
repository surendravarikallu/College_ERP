"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertGlobalSettingsSchema = exports.insertAuditLogSchema = exports.insertMidMarkSchema = exports.insertMidExamSchema = exports.insertFacultySubjectMapSchema = exports.insertFacultySchema = exports.insertResultSchema = exports.insertSubjectSchema = exports.insertStudentSchema = exports.insertAdminSchema = exports.globalSettings = exports.auditLogs = exports.midMarks = exports.midExams = exports.facultySubjectMap = exports.faculty = exports.results = exports.subjects = exports.studentPhotos = exports.studentAcademicStatus = exports.students = exports.admins = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const zod_1 = require("zod");
exports.admins = (0, pg_core_1.pgTable)("ec_admins", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    isAdmin: (0, pg_core_1.boolean)("is_admin").default(false).notNull(),
    canUpload: (0, pg_core_1.boolean)("can_upload").default(false).notNull(),
    canManageSettings: (0, pg_core_1.boolean)("can_manage_settings").default(false).notNull(),
    canManageAcademics: (0, pg_core_1.boolean)("can_manage_academics").default(false).notNull(),
    canManageInternalMarks: (0, pg_core_1.boolean)("can_manage_internal_marks").default(false).notNull(),
    canViewDashboard: (0, pg_core_1.boolean)("can_view_dashboard").default(false).notNull(),
    canViewStudents: (0, pg_core_1.boolean)("can_view_students").default(false).notNull(),
    canViewReports: (0, pg_core_1.boolean)("can_view_reports").default(false).notNull(),
    canFreezeMarks: (0, pg_core_1.boolean)("can_freeze_marks").default(false).notNull(),
    loginType: (0, pg_core_1.text)("login_type").notNull().default("GLOBAL"),
    allowedIps: (0, pg_core_1.text)("allowed_ips").notNull().default(""),
});
exports.students = (0, pg_core_1.pgTable)("ec_students", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    rollNumber: (0, pg_core_1.text)("roll_number").notNull().unique(),
    name: (0, pg_core_1.text)("name").notNull(),
    branch: (0, pg_core_1.text)("branch").notNull(),
    batch: (0, pg_core_1.text)("batch").notNull(),
    regulation: (0, pg_core_1.text)("regulation").notNull(),
    program: (0, pg_core_1.text)("program"),
    section: (0, pg_core_1.text)("section"),
    gender: (0, pg_core_1.text)("gender"),
    phone: (0, pg_core_1.text)("phone"),
    address: (0, pg_core_1.text)("address"),
});
exports.studentAcademicStatus = (0, pg_core_1.pgTable)("ec_student_academic_status", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").notNull().references(() => exports.students.id),
    academicYear: (0, pg_core_1.text)("academic_year").notNull(),
    semester: (0, pg_core_1.text)("semester").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    reason: (0, pg_core_1.text)("reason").default(""),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.studentPhotos = (0, pg_core_1.pgTable)("ec_student_photos", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").notNull().references(() => exports.students.id).unique(),
    photoData: (0, pg_core_1.text)("photo_data").notNull(),
});
exports.subjects = (0, pg_core_1.pgTable)("ec_subjects", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    subjectCode: (0, pg_core_1.text)("subject_code").notNull().unique(),
    subjectName: (0, pg_core_1.text)("subject_name").notNull(),
    credits: (0, pg_core_1.doublePrecision)("credits").notNull(),
    semester: (0, pg_core_1.text)("semester").notNull(),
    branch: (0, pg_core_1.text)("branch").notNull(),
});
exports.results = (0, pg_core_1.pgTable)("ec_results", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").notNull().references(() => exports.students.id),
    subjectId: (0, pg_core_1.integer)("subject_id").notNull().references(() => exports.subjects.id),
    semester: (0, pg_core_1.text)("semester").notNull(),
    academicYear: (0, pg_core_1.text)("academic_year").notNull(),
    examType: (0, pg_core_1.text)("exam_type").notNull(),
    attemptNo: (0, pg_core_1.integer)("attempt_no").notNull(),
    grade: (0, pg_core_1.text)("grade").notNull(),
    gradePoints: (0, pg_core_1.integer)("grade_points").notNull(),
    creditsEarned: (0, pg_core_1.doublePrecision)("credits_earned").notNull(),
    internalMarks: (0, pg_core_1.integer)("internal_marks"),
    status: (0, pg_core_1.text)("status").notNull(),
    isLatest: (0, pg_core_1.boolean)("is_latest").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => {
    return {
        uniqueResultIdx: (0, pg_core_1.uniqueIndex)("ec_unique_result_idx").on(table.studentId, table.subjectId, table.examType, table.academicYear)
    };
});
exports.faculty = (0, pg_core_1.pgTable)("ec_faculty", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    facultyName: (0, pg_core_1.text)("faculty_name").notNull(),
    department: (0, pg_core_1.text)("department"),
    designation: (0, pg_core_1.text)("designation"),
});
exports.facultySubjectMap = (0, pg_core_1.pgTable)("ec_faculty_subject_map", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    facultyId: (0, pg_core_1.integer)("faculty_id").notNull().references(() => exports.faculty.id),
    subjectCode: (0, pg_core_1.text)("subject_code").notNull(),
    semester: (0, pg_core_1.text)("semester").notNull(),
    branch: (0, pg_core_1.text)("branch").notNull(),
    batch: (0, pg_core_1.text)("batch").notNull(),
    academicYear: (0, pg_core_1.text)("academic_year").notNull(),
    section: (0, pg_core_1.text)("section"),
});
exports.midExams = (0, pg_core_1.pgTable)("ec_mid_exams", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    academicYear: (0, pg_core_1.text)("academic_year").notNull(),
    semester: (0, pg_core_1.text)("semester").notNull(),
    branch: (0, pg_core_1.text)("branch").notNull(),
    batch: (0, pg_core_1.text)("batch").notNull().default(''),
    subjectCode: (0, pg_core_1.text)("subject_code").notNull(),
    midType: (0, pg_core_1.text)("mid_type").notNull(),
    maxMarks: (0, pg_core_1.integer)("max_marks").notNull().default(30),
    isFrozen: (0, pg_core_1.boolean)("is_frozen").notNull().default(false),
    isFinalLocked: (0, pg_core_1.boolean)("is_final_locked").notNull().default(false),
    lockedAt: (0, pg_core_1.timestamp)("locked_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.midMarks = (0, pg_core_1.pgTable)("ec_mid_marks", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    studentId: (0, pg_core_1.integer)("student_id").notNull().references(() => exports.students.id),
    midExamId: (0, pg_core_1.integer)("mid_exam_id").notNull().references(() => exports.midExams.id),
    midExamMarks: (0, pg_core_1.doublePrecision)("mid_exam_marks").notNull().default(0),
    assignmentMarks: (0, pg_core_1.doublePrecision)("assignment_marks").notNull().default(0),
    quizMarks: (0, pg_core_1.doublePrecision)("quiz_marks").notNull().default(0),
    totalMarks: (0, pg_core_1.doublePrecision)("total_marks").notNull().default(0),
    labDailyMarks: (0, pg_core_1.doublePrecision)("lab_daily_marks").notNull().default(0),
    labRecordMarks: (0, pg_core_1.doublePrecision)("lab_record_marks").notNull().default(0),
    labInternalMarks: (0, pg_core_1.doublePrecision)("lab_internal_marks").notNull().default(0),
    labVivaMarks: (0, pg_core_1.doublePrecision)("lab_viva_marks").notNull().default(0),
    prcAssessmentMarks: (0, pg_core_1.doublePrecision)("prc_assessment_marks").notNull().default(0),
    reportMarks: (0, pg_core_1.doublePrecision)("report_marks").notNull().default(0),
    seminarMarks: (0, pg_core_1.doublePrecision)("seminar_marks").notNull().default(0),
    enteredBy: (0, pg_core_1.integer)("entered_by").notNull().references(() => exports.admins.id),
    isLocked: (0, pg_core_1.boolean)("is_locked").notNull().default(false),
    lockedAt: (0, pg_core_1.timestamp)("locked_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => {
    return {
        uniqueMidMarkIdx: (0, pg_core_1.uniqueIndex)("ec_unique_mid_mark_idx").on(table.studentId, table.midExamId)
    };
});
exports.auditLogs = (0, pg_core_1.pgTable)("ec_audit_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    actionType: (0, pg_core_1.text)("action_type").notNull(),
    entityType: (0, pg_core_1.text)("entity_type").notNull(),
    entityId: (0, pg_core_1.integer)("entity_id").notNull(),
    performedBy: (0, pg_core_1.integer)("performed_by").notNull().references(() => exports.admins.id),
    reason: (0, pg_core_1.text)("reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.globalSettings = (0, pg_core_1.pgTable)("ec_global_settings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    autoLockOnSave: (0, pg_core_1.boolean)("auto_lock_on_save").notNull().default(true),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ——— Zod Schemas (manual, Zod v4 compatible) ———
exports.insertAdminSchema = zod_1.z.object({
    username: zod_1.z.string().min(3),
    password: zod_1.z.string().min(6),
    isAdmin: zod_1.z.boolean().optional().default(false),
    canUpload: zod_1.z.boolean().optional().default(false),
    canManageSettings: zod_1.z.boolean().optional().default(false),
    canManageAcademics: zod_1.z.boolean().optional().default(false),
    canManageInternalMarks: zod_1.z.boolean().optional().default(false),
    canViewDashboard: zod_1.z.boolean().optional().default(true),
    canViewStudents: zod_1.z.boolean().optional().default(true),
    canViewReports: zod_1.z.boolean().optional().default(true),
    canFreezeMarks: zod_1.z.boolean().optional().default(false),
    loginType: zod_1.z.string().optional().default("GLOBAL"),
    allowedIps: zod_1.z.string().optional().default(""),
});
exports.insertStudentSchema = zod_1.z.object({
    name: zod_1.z.string(),
    rollNumber: zod_1.z.string(),
    branch: zod_1.z.string(),
    batch: zod_1.z.string(),
    regulation: zod_1.z.string(),
    program: zod_1.z.string().nullable().optional(),
    section: zod_1.z.string().nullable().optional(),
    gender: zod_1.z.string().nullable().optional(),
    phone: zod_1.z.string().nullable().optional(),
    address: zod_1.z.string().nullable().optional(),
});
exports.insertSubjectSchema = zod_1.z.object({
    subjectCode: zod_1.z.string(),
    subjectName: zod_1.z.string(),
    credits: zod_1.z.number(),
    semester: zod_1.z.string(),
    branch: zod_1.z.string(),
});
exports.insertResultSchema = zod_1.z.object({
    studentId: zod_1.z.number(),
    subjectId: zod_1.z.number(),
    semester: zod_1.z.string(),
    academicYear: zod_1.z.string(),
    examType: zod_1.z.string(),
    attemptNo: zod_1.z.number(),
    grade: zod_1.z.string(),
    gradePoints: zod_1.z.number(),
    creditsEarned: zod_1.z.number(),
    internalMarks: zod_1.z.number().nullable().optional(),
    status: zod_1.z.string(),
    isLatest: zod_1.z.boolean().optional().default(true),
});
exports.insertFacultySchema = zod_1.z.object({
    facultyName: zod_1.z.string(),
    department: zod_1.z.string().nullable().optional(),
    designation: zod_1.z.string().nullable().optional(),
});
exports.insertFacultySubjectMapSchema = zod_1.z.object({
    facultyId: zod_1.z.number(),
    subjectCode: zod_1.z.string(),
    semester: zod_1.z.string(),
    branch: zod_1.z.string(),
    batch: zod_1.z.string(),
    academicYear: zod_1.z.string(),
    section: zod_1.z.string().nullable().optional(),
});
exports.insertMidExamSchema = zod_1.z.object({
    academicYear: zod_1.z.string(),
    semester: zod_1.z.string(),
    branch: zod_1.z.string(),
    batch: zod_1.z.string().optional().default(''),
    subjectCode: zod_1.z.string(),
    midType: zod_1.z.string(),
    maxMarks: zod_1.z.number().optional().default(30),
    isFrozen: zod_1.z.boolean().optional().default(false),
    isFinalLocked: zod_1.z.boolean().optional().default(false),
    lockedAt: zod_1.z.date().nullable().optional(),
});
exports.insertMidMarkSchema = zod_1.z.object({
    studentId: zod_1.z.number(),
    midExamId: zod_1.z.number(),
    midExamMarks: zod_1.z.number().optional().default(0),
    assignmentMarks: zod_1.z.number().optional().default(0),
    quizMarks: zod_1.z.number().optional().default(0),
    totalMarks: zod_1.z.number().optional().default(0),
    labDailyMarks: zod_1.z.number().optional().default(0),
    labRecordMarks: zod_1.z.number().optional().default(0),
    labInternalMarks: zod_1.z.number().optional().default(0),
    labVivaMarks: zod_1.z.number().optional().default(0),
    prcAssessmentMarks: zod_1.z.number().optional().default(0),
    reportMarks: zod_1.z.number().optional().default(0),
    seminarMarks: zod_1.z.number().optional().default(0),
    enteredBy: zod_1.z.number(),
    isLocked: zod_1.z.boolean().optional().default(false),
    lockedAt: zod_1.z.date().nullable().optional(),
});
exports.insertAuditLogSchema = zod_1.z.object({
    actionType: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.number(),
    performedBy: zod_1.z.number(),
    reason: zod_1.z.string().nullable().optional(),
});
exports.insertGlobalSettingsSchema = zod_1.z.object({
    autoLockOnSave: zod_1.z.boolean().optional().default(true),
});
