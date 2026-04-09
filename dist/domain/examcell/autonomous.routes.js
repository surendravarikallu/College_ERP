"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
/**
 * Autonomous Exam Cell Services
 * Paper evaluation, correction workflow, and auto-report generation
 */
const express_1 = require("express");
const examcell_db_1 = require("./examcell.db");
const examcell_storage_1 = require("./examcell.storage");
const schema = __importStar(require("./examcell.schema"));
const drizzle_orm_1 = require("drizzle-orm");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const JWT_SECRET = config_1.SESSION_SECRET;
const router = (0, express_1.Router)();
// ——— Auth Middleware ———
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: 'Access denied' });
        next();
    });
}
// ════════════════════════════════════════════════
// 1. AUTONOMOUS RESULT PROCESSING
// ════════════════════════════════════════════════
/**
 * POST /autonomous/process-results
 * Auto-process uploaded results: calculate SGPA, detect backlogs, flag failures
 */
router.post('/autonomous/process-results', requireAdmin, async (req, res) => {
    try {
        const { academicYear, semester, branch, batch } = req.body;
        // Get all students matching criteria
        const students = await examcell_db_1.db.select().from(schema.students)
            .where((0, drizzle_orm_1.and)(branch ? (0, drizzle_orm_1.eq)(schema.students.branch, branch) : undefined, batch ? (0, drizzle_orm_1.eq)(schema.students.batch, batch) : undefined));
        const processed = [];
        let failCount = 0;
        let passCount = 0;
        for (const student of students) {
            // Get latest results for this student's semester
            const results = await examcell_db_1.db.select().from(schema.results)
                .innerJoin(schema.subjects, (0, drizzle_orm_1.eq)(schema.results.subjectId, schema.subjects.id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.studentId, student.id), (0, drizzle_orm_1.eq)(schema.results.isLatest, true), semester ? (0, drizzle_orm_1.eq)(schema.results.semester, semester) : undefined));
            let totalCredits = 0;
            let totalGradePoints = 0;
            let backlogs = [];
            for (const r of results) {
                const credits = r.ec_subjects.credits;
                totalCredits += credits;
                totalGradePoints += r.ec_results.gradePoints * credits;
                if (r.ec_results.status === 'FAIL' || r.ec_results.grade === 'F') {
                    backlogs.push(r.ec_subjects.subjectCode);
                }
            }
            const sgpa = totalCredits > 0 ? +(totalGradePoints / totalCredits).toFixed(2) : 0;
            const hasFailed = backlogs.length > 0;
            if (hasFailed)
                failCount++;
            else
                passCount++;
            processed.push({
                studentId: student.id,
                rollNumber: student.rollNumber,
                name: student.name,
                sgpa,
                totalCredits,
                backlogs,
                status: hasFailed ? 'FAIL' : 'PASS',
            });
        }
        res.json({
            summary: {
                totalProcessed: processed.length,
                passed: passCount,
                failed: failCount,
                passRate: processed.length > 0 ? +((passCount / processed.length) * 100).toFixed(1) : 0,
            },
            students: processed,
        });
    }
    catch (err) {
        console.error('[Autonomous] Result processing error:', err);
        res.status(500).json({ message: err.message || 'Processing failed' });
    }
});
// ════════════════════════════════════════════════
// 2. AUTONOMOUS REPORT GENERATION
// ════════════════════════════════════════════════
/**
 * POST /autonomous/generate-report
 * Generate a comprehensive report with statistics
 */
router.post('/autonomous/generate-report', requireAdmin, async (req, res) => {
    try {
        const { reportType, academicYear, semester, branch, batch } = req.body;
        switch (reportType) {
            case 'semester-summary': {
                // Overall semester statistics
                const allResults = await examcell_db_1.db.select().from(schema.results)
                    .innerJoin(schema.subjects, (0, drizzle_orm_1.eq)(schema.results.subjectId, schema.subjects.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.isLatest, true), academicYear ? (0, drizzle_orm_1.eq)(schema.results.academicYear, academicYear) : undefined, semester ? (0, drizzle_orm_1.eq)(schema.results.semester, semester) : undefined));
                const gradeDistribution = {};
                let totalPass = 0, totalFail = 0;
                const subjectWise = {};
                for (const r of allResults) {
                    const grade = r.ec_results.grade;
                    gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
                    if (r.ec_results.status === 'PASS')
                        totalPass++;
                    else
                        totalFail++;
                    const code = r.ec_subjects.subjectCode;
                    if (!subjectWise[code])
                        subjectWise[code] = { pass: 0, fail: 0, avgGP: 0, count: 0 };
                    subjectWise[code].count++;
                    subjectWise[code].avgGP += r.ec_results.gradePoints;
                    if (r.ec_results.status === 'PASS')
                        subjectWise[code].pass++;
                    else
                        subjectWise[code].fail++;
                }
                // Calculate averages
                for (const code of Object.keys(subjectWise)) {
                    subjectWise[code].avgGP = +(subjectWise[code].avgGP / subjectWise[code].count).toFixed(2);
                }
                res.json({
                    reportType: 'semester-summary',
                    generatedAt: new Date().toISOString(),
                    data: {
                        totalResults: allResults.length,
                        passRate: allResults.length > 0 ? +((totalPass / allResults.length) * 100).toFixed(1) : 0,
                        gradeDistribution,
                        subjectWise,
                    },
                });
                break;
            }
            case 'backlog-analysis': {
                // Find students with backlogs
                const failResults = await examcell_db_1.db.select().from(schema.results)
                    .innerJoin(schema.students, (0, drizzle_orm_1.eq)(schema.results.studentId, schema.students.id))
                    .innerJoin(schema.subjects, (0, drizzle_orm_1.eq)(schema.results.subjectId, schema.subjects.id))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.isLatest, true), (0, drizzle_orm_1.eq)(schema.results.status, 'FAIL'), branch ? (0, drizzle_orm_1.eq)(schema.students.branch, branch) : undefined, batch ? (0, drizzle_orm_1.eq)(schema.students.batch, batch) : undefined));
                // Group by student
                const studentBacklogs = {};
                for (const r of failResults) {
                    const sid = r.ec_students.id;
                    if (!studentBacklogs[sid]) {
                        studentBacklogs[sid] = {
                            name: r.ec_students.name,
                            roll: r.ec_students.rollNumber,
                            subjects: [],
                        };
                    }
                    studentBacklogs[sid].subjects.push(`${r.ec_subjects.subjectCode} - ${r.ec_subjects.subjectName}`);
                }
                const backlogList = Object.values(studentBacklogs).sort((a, b) => b.subjects.length - a.subjects.length);
                res.json({
                    reportType: 'backlog-analysis',
                    generatedAt: new Date().toISOString(),
                    data: {
                        totalStudentsWithBacklogs: backlogList.length,
                        students: backlogList,
                    },
                });
                break;
            }
            case 'topper-list': {
                // Calculate CGPA for all students and rank
                const students = await examcell_db_1.db.select().from(schema.students)
                    .where((0, drizzle_orm_1.and)(branch ? (0, drizzle_orm_1.eq)(schema.students.branch, branch) : undefined, batch ? (0, drizzle_orm_1.eq)(schema.students.batch, batch) : undefined));
                const toppers = [];
                for (const s of students) {
                    const results = await examcell_db_1.db.select().from(schema.results)
                        .innerJoin(schema.subjects, (0, drizzle_orm_1.eq)(schema.results.subjectId, schema.subjects.id))
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.studentId, s.id), (0, drizzle_orm_1.eq)(schema.results.isLatest, true)));
                    let totalCredits = 0;
                    let totalGP = 0;
                    for (const r of results) {
                        totalCredits += r.ec_subjects.credits;
                        totalGP += r.ec_results.gradePoints * r.ec_subjects.credits;
                    }
                    const cgpa = totalCredits > 0 ? +(totalGP / totalCredits).toFixed(2) : 0;
                    toppers.push({ name: s.name, roll: s.rollNumber, cgpa, totalCredits });
                }
                toppers.sort((a, b) => b.cgpa - a.cgpa);
                res.json({
                    reportType: 'topper-list',
                    generatedAt: new Date().toISOString(),
                    data: {
                        toppers: toppers.slice(0, 50), // Top 50
                    },
                });
                break;
            }
            case 'internal-marks-summary': {
                // Summarize internal marks for a semester
                const midExams = await examcell_db_1.db.select().from(schema.midExams)
                    .where((0, drizzle_orm_1.and)(academicYear ? (0, drizzle_orm_1.eq)(schema.midExams.academicYear, academicYear) : undefined, semester ? (0, drizzle_orm_1.eq)(schema.midExams.semester, semester) : undefined, branch ? (0, drizzle_orm_1.eq)(schema.midExams.branch, branch) : undefined));
                const summary = [];
                for (const exam of midExams) {
                    const marks = await examcell_db_1.db.select().from(schema.midMarks)
                        .where((0, drizzle_orm_1.eq)(schema.midMarks.midExamId, exam.id));
                    const total = marks.length;
                    const avgMarks = total > 0 ? +(marks.reduce((s, m) => s + m.totalMarks, 0) / total).toFixed(1) : 0;
                    const maxMarks = total > 0 ? Math.max(...marks.map(m => m.totalMarks)) : 0;
                    const minMarks = total > 0 ? Math.min(...marks.map(m => m.totalMarks)) : 0;
                    summary.push({
                        subjectCode: exam.subjectCode,
                        midType: exam.midType,
                        totalStudents: total,
                        avgMarks,
                        maxMarks,
                        minMarks,
                        isFrozen: exam.isFrozen,
                    });
                }
                res.json({
                    reportType: 'internal-marks-summary',
                    generatedAt: new Date().toISOString(),
                    data: { summary },
                });
                break;
            }
            default:
                res.status(400).json({ message: `Unknown report type: ${reportType}` });
        }
    }
    catch (err) {
        console.error('[Autonomous] Report generation error:', err);
        res.status(500).json({ message: err.message || 'Report generation failed' });
    }
});
// ════════════════════════════════════════════════
// 3. EVALUATOR / CORRECTION PORTAL
// ════════════════════════════════════════════════
/**
 * POST /autonomous/evaluator/create
 * Create an evaluator account for paper correction
 */
router.post('/autonomous/evaluator/create', requireAdmin, async (req, res) => {
    try {
        const { username, password, subjectCodes, semester, branch, batch, academicYear } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }
        // Create a limited admin account for the evaluator
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        const hashedPassword = await bcrypt.hash(password, 10);
        const evaluator = await examcell_storage_1.storage.createAdmin({
            username,
            password: hashedPassword,
            isAdmin: false,
            canUpload: false,
            canManageSettings: false,
            canManageAcademics: false,
            canManageInternalMarks: true, // Can enter marks
            canViewDashboard: false,
            canViewStudents: true,
            canViewReports: false,
            canFreezeMarks: false,
            loginType: 'EVALUATOR',
            allowedIps: '',
        });
        // If subject codes provided, create faculty mappings
        if (subjectCodes && Array.isArray(subjectCodes)) {
            for (const code of subjectCodes) {
                await examcell_db_1.db.insert(schema.facultySubjectMap).values({
                    facultyId: evaluator.id,
                    subjectCode: code,
                    semester: semester || '',
                    branch: branch || '',
                    batch: batch || '',
                    academicYear: academicYear || '',
                });
            }
        }
        res.json({
            message: 'Evaluator account created',
            evaluator: {
                id: evaluator.id,
                username: evaluator.username,
                assignedSubjects: subjectCodes || [],
            },
        });
    }
    catch (err) {
        console.error('[Autonomous] Evaluator creation error:', err);
        res.status(500).json({ message: err.message || 'Failed to create evaluator' });
    }
});
/**
 * GET /autonomous/evaluator/assignments
 * Get evaluator's assigned subjects and pending corrections
 */
router.get('/autonomous/evaluator/assignments', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get faculty subject mappings for this evaluator
        const assignments = await examcell_db_1.db.select().from(schema.facultySubjectMap)
            .where((0, drizzle_orm_1.eq)(schema.facultySubjectMap.facultyId, userId));
        const pendingWork = [];
        for (const a of assignments) {
            // Check if MID exam exists and has pending marks
            const exams = await examcell_db_1.db.select().from(schema.midExams)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.midExams.subjectCode, a.subjectCode), (0, drizzle_orm_1.eq)(schema.midExams.semester, a.semester), (0, drizzle_orm_1.eq)(schema.midExams.branch, a.branch)));
            for (const exam of exams) {
                const marksCount = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.midMarks)
                    .where((0, drizzle_orm_1.eq)(schema.midMarks.midExamId, exam.id));
                // Get total eligible students
                const eligibleStudents = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.students)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.students.branch, exam.branch), (0, drizzle_orm_1.eq)(schema.students.batch, exam.batch)));
                const entered = marksCount[0]?.count || 0;
                const total = eligibleStudents[0]?.count || 0;
                pendingWork.push({
                    subjectCode: a.subjectCode,
                    midType: exam.midType,
                    examId: exam.id,
                    isFrozen: exam.isFrozen,
                    marksEntered: entered,
                    totalStudents: total,
                    pending: total - entered,
                });
            }
        }
        res.json({ assignments: pendingWork });
    }
    catch (err) {
        console.error('[Autonomous] Assignments fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch assignments' });
    }
});
// ════════════════════════════════════════════════
// 4. AUTO MARKS LOCK & FREEZE
// ════════════════════════════════════════════════
/**
 * POST /autonomous/auto-lock-marks
 * Automatically lock marks when all entries are complete
 */
router.post('/autonomous/auto-lock-marks', requireAdmin, async (req, res) => {
    try {
        const { academicYear, semester } = req.body;
        const exams = await examcell_db_1.db.select().from(schema.midExams)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.midExams.isFrozen, false), academicYear ? (0, drizzle_orm_1.eq)(schema.midExams.academicYear, academicYear) : undefined, semester ? (0, drizzle_orm_1.eq)(schema.midExams.semester, semester) : undefined));
        const lockedExams = [];
        for (const exam of exams) {
            // Count marks entered vs total students
            const marksCount = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.midMarks)
                .where((0, drizzle_orm_1.eq)(schema.midMarks.midExamId, exam.id));
            const studentCount = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.students)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.students.branch, exam.branch), (0, drizzle_orm_1.eq)(schema.students.batch, exam.batch)));
            const entered = marksCount[0]?.count || 0;
            const total = studentCount[0]?.count || 0;
            // Lock if all marks are entered
            if (total > 0 && entered >= total) {
                await examcell_db_1.db.update(schema.midExams)
                    .set({ isFrozen: true, lockedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema.midExams.id, exam.id));
                // Lock individual marks
                await examcell_db_1.db.update(schema.midMarks)
                    .set({ isLocked: true, lockedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema.midMarks.midExamId, exam.id));
                lockedExams.push({
                    examId: exam.id,
                    subjectCode: exam.subjectCode,
                    midType: exam.midType,
                    marksEntered: entered,
                });
            }
        }
        res.json({
            message: `Auto-locked ${lockedExams.length} exams`,
            lockedExams,
        });
    }
    catch (err) {
        console.error('[Autonomous] Auto-lock error:', err);
        res.status(500).json({ message: 'Auto-lock failed' });
    }
});
// ════════════════════════════════════════════════
// 5. DASHBOARD ANALYTICS
// ════════════════════════════════════════════════
/**
 * GET /autonomous/analytics
 * Full dashboard analytics for the exam cell
 */
router.get('/autonomous/analytics', requireAuth, async (req, res) => {
    try {
        const totalStudents = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.students);
        const totalSubjects = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.subjects);
        const totalResults = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.results);
        const totalFaculty = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.faculty);
        // Pass/fail breakdown
        const passResults = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.results)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.isLatest, true), (0, drizzle_orm_1.eq)(schema.results.status, 'PASS')));
        const failResults = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.results)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.results.isLatest, true), (0, drizzle_orm_1.eq)(schema.results.status, 'FAIL')));
        // Internal marks status
        const frozenExams = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.midExams)
            .where((0, drizzle_orm_1.eq)(schema.midExams.isFrozen, true));
        const pendingExams = await examcell_db_1.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.midExams)
            .where((0, drizzle_orm_1.eq)(schema.midExams.isFrozen, false));
        // Branch-wise student distribution
        const branchDist = await examcell_db_1.db.select({
            branch: schema.students.branch,
            count: (0, drizzle_orm_1.count)(),
        }).from(schema.students).groupBy(schema.students.branch);
        res.json({
            overview: {
                totalStudents: totalStudents[0]?.count || 0,
                totalSubjects: totalSubjects[0]?.count || 0,
                totalResults: totalResults[0]?.count || 0,
                totalFaculty: totalFaculty[0]?.count || 0,
                passCount: passResults[0]?.count || 0,
                failCount: failResults[0]?.count || 0,
                passRate: (passResults[0]?.count || 0) + (failResults[0]?.count || 0) > 0
                    ? +(((passResults[0]?.count || 0) / ((passResults[0]?.count || 0) + (failResults[0]?.count || 0))) * 100).toFixed(1) : 0,
            },
            internalMarks: {
                frozenExams: frozenExams[0]?.count || 0,
                pendingExams: pendingExams[0]?.count || 0,
            },
            branchDistribution: branchDist,
        });
    }
    catch (err) {
        console.error('[Autonomous] Analytics error:', err);
        res.status(500).json({ message: 'Analytics generation failed' });
    }
});
exports.default = router;
