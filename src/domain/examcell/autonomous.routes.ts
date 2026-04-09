// @ts-nocheck
/**
 * Autonomous Exam Cell Services
 * Paper evaluation, correction workflow, and auto-report generation
 */
import { Router, Request, Response } from 'express';
import { db } from './examcell.db';
import { storage } from './examcell.storage';
import * as schema from './examcell.schema';
import { eq, and, sql, desc, inArray, count } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { SESSION_SECRET } from './config';

const JWT_SECRET = SESSION_SECRET;
const router = Router();

// ——— Auth Middleware ———
function requireAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch { return res.status(401).json({ message: 'Invalid token' }); }
}

function requireAdmin(req: Request, res: Response, next: any) {
  requireAuth(req, res, () => {
    if (!(req as any).user?.isAdmin) return res.status(403).json({ message: 'Access denied' });
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
router.post('/autonomous/process-results', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicYear, semester, branch, batch } = req.body;
    
    // Get all students matching criteria
    const students = await db.select().from(schema.students)
      .where(and(
        branch ? eq(schema.students.branch, branch) : undefined,
        batch ? eq(schema.students.batch, batch) : undefined,
      ));

    const processed: any[] = [];
    let failCount = 0;
    let passCount = 0;

    for (const student of students) {
      // Get latest results for this student's semester
      const results = await db.select().from(schema.results)
        .innerJoin(schema.subjects, eq(schema.results.subjectId, schema.subjects.id))
        .where(and(
          eq(schema.results.studentId, student.id),
          eq(schema.results.isLatest, true),
          semester ? eq(schema.results.semester, semester) : undefined,
        ));

      let totalCredits = 0;
      let totalGradePoints = 0;
      let backlogs: string[] = [];

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

      if (hasFailed) failCount++;
      else passCount++;

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
  } catch (err: any) {
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
router.post('/autonomous/generate-report', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportType, academicYear, semester, branch, batch } = req.body;

    switch (reportType) {
      case 'semester-summary': {
        // Overall semester statistics
        const allResults = await db.select().from(schema.results)
          .innerJoin(schema.subjects, eq(schema.results.subjectId, schema.subjects.id))
          .where(and(
            eq(schema.results.isLatest, true),
            academicYear ? eq(schema.results.academicYear, academicYear) : undefined,
            semester ? eq(schema.results.semester, semester) : undefined,
          ));

        const gradeDistribution: Record<string, number> = {};
        let totalPass = 0, totalFail = 0;
        const subjectWise: Record<string, { pass: number; fail: number; avgGP: number; count: number }> = {};

        for (const r of allResults) {
          const grade = r.ec_results.grade;
          gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
          if (r.ec_results.status === 'PASS') totalPass++;
          else totalFail++;

          const code = r.ec_subjects.subjectCode;
          if (!subjectWise[code]) subjectWise[code] = { pass: 0, fail: 0, avgGP: 0, count: 0 };
          subjectWise[code].count++;
          subjectWise[code].avgGP += r.ec_results.gradePoints;
          if (r.ec_results.status === 'PASS') subjectWise[code].pass++;
          else subjectWise[code].fail++;
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
        const failResults = await db.select().from(schema.results)
          .innerJoin(schema.students, eq(schema.results.studentId, schema.students.id))
          .innerJoin(schema.subjects, eq(schema.results.subjectId, schema.subjects.id))
          .where(and(
            eq(schema.results.isLatest, true),
            eq(schema.results.status, 'FAIL'),
            branch ? eq(schema.students.branch, branch) : undefined,
            batch ? eq(schema.students.batch, batch) : undefined,
          ));

        // Group by student
        const studentBacklogs: Record<number, { name: string; roll: string; subjects: string[] }> = {};
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
        const students = await db.select().from(schema.students)
          .where(and(
            branch ? eq(schema.students.branch, branch) : undefined,
            batch ? eq(schema.students.batch, batch) : undefined,
          ));

        const toppers: { name: string; roll: string; cgpa: number; totalCredits: number }[] = [];

        for (const s of students) {
          const results = await db.select().from(schema.results)
            .innerJoin(schema.subjects, eq(schema.results.subjectId, schema.subjects.id))
            .where(and(
              eq(schema.results.studentId, s.id),
              eq(schema.results.isLatest, true),
            ));

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
        const midExams = await db.select().from(schema.midExams)
          .where(and(
            academicYear ? eq(schema.midExams.academicYear, academicYear) : undefined,
            semester ? eq(schema.midExams.semester, semester) : undefined,
            branch ? eq(schema.midExams.branch, branch) : undefined,
          ));

        const summary: any[] = [];

        for (const exam of midExams) {
          const marks = await db.select().from(schema.midMarks)
            .where(eq(schema.midMarks.midExamId, exam.id));

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
  } catch (err: any) {
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
router.post('/autonomous/evaluator/create', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, password, subjectCodes, semester, branch, batch, academicYear } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Create a limited admin account for the evaluator
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const evaluator = await storage.createAdmin({
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
        await db.insert(schema.facultySubjectMap).values({
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
  } catch (err: any) {
    console.error('[Autonomous] Evaluator creation error:', err);
    res.status(500).json({ message: err.message || 'Failed to create evaluator' });
  }
});

/**
 * GET /autonomous/evaluator/assignments
 * Get evaluator's assigned subjects and pending corrections
 */
router.get('/autonomous/evaluator/assignments', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get faculty subject mappings for this evaluator
    const assignments = await db.select().from(schema.facultySubjectMap)
      .where(eq(schema.facultySubjectMap.facultyId, userId));

    const pendingWork: any[] = [];

    for (const a of assignments) {
      // Check if MID exam exists and has pending marks
      const exams = await db.select().from(schema.midExams)
        .where(and(
          eq(schema.midExams.subjectCode, a.subjectCode),
          eq(schema.midExams.semester, a.semester),
          eq(schema.midExams.branch, a.branch),
        ));

      for (const exam of exams) {
        const marksCount = await db.select({ count: count() }).from(schema.midMarks)
          .where(eq(schema.midMarks.midExamId, exam.id));

        // Get total eligible students
        const eligibleStudents = await db.select({ count: count() }).from(schema.students)
          .where(and(
            eq(schema.students.branch, exam.branch),
            eq(schema.students.batch, exam.batch),
          ));

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
  } catch (err: any) {
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
router.post('/autonomous/auto-lock-marks', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { academicYear, semester } = req.body;

    const exams = await db.select().from(schema.midExams)
      .where(and(
        eq(schema.midExams.isFrozen, false),
        academicYear ? eq(schema.midExams.academicYear, academicYear) : undefined,
        semester ? eq(schema.midExams.semester, semester) : undefined,
      ));

    const lockedExams: any[] = [];

    for (const exam of exams) {
      // Count marks entered vs total students
      const marksCount = await db.select({ count: count() }).from(schema.midMarks)
        .where(eq(schema.midMarks.midExamId, exam.id));

      const studentCount = await db.select({ count: count() }).from(schema.students)
        .where(and(
          eq(schema.students.branch, exam.branch),
          eq(schema.students.batch, exam.batch),
        ));

      const entered = marksCount[0]?.count || 0;
      const total = studentCount[0]?.count || 0;

      // Lock if all marks are entered
      if (total > 0 && entered >= total) {
        await db.update(schema.midExams)
          .set({ isFrozen: true, lockedAt: new Date() })
          .where(eq(schema.midExams.id, exam.id));

        // Lock individual marks
        await db.update(schema.midMarks)
          .set({ isLocked: true, lockedAt: new Date() })
          .where(eq(schema.midMarks.midExamId, exam.id));

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
  } catch (err: any) {
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
router.get('/autonomous/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const totalStudents = await db.select({ count: count() }).from(schema.students);
    const totalSubjects = await db.select({ count: count() }).from(schema.subjects);
    const totalResults = await db.select({ count: count() }).from(schema.results);
    const totalFaculty = await db.select({ count: count() }).from(schema.faculty);
    
    // Pass/fail breakdown
    const passResults = await db.select({ count: count() }).from(schema.results)
      .where(and(eq(schema.results.isLatest, true), eq(schema.results.status, 'PASS')));
    const failResults = await db.select({ count: count() }).from(schema.results)
      .where(and(eq(schema.results.isLatest, true), eq(schema.results.status, 'FAIL')));

    // Internal marks status
    const frozenExams = await db.select({ count: count() }).from(schema.midExams)
      .where(eq(schema.midExams.isFrozen, true));
    const pendingExams = await db.select({ count: count() }).from(schema.midExams)
      .where(eq(schema.midExams.isFrozen, false));

    // Branch-wise student distribution
    const branchDist = await db.select({
      branch: schema.students.branch,
      count: count(),
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
  } catch (err: any) {
    console.error('[Autonomous] Analytics error:', err);
    res.status(500).json({ message: 'Analytics generation failed' });
  }
});

export default router;
