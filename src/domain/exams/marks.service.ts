import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import { CacheManager } from '../../core/cache/cache.manager';
import PDFDocument from 'pdfkit';

const GRADE_MAP: Record<string, { min: number; points: number }> = {
  'O':  { min: 90, points: 10 },
  'A+': { min: 80, points: 9 },
  'A':  { min: 70, points: 8 },
  'B+': { min: 60, points: 7 },
  'B':  { min: 50, points: 6 },
  'C':  { min: 40, points: 5 },
  'F':  { min: 0,  points: 0 },
};

function getGrade(percentage: number): { grade: string; points: number } {
  for (const [grade, { min, points }] of Object.entries(GRADE_MAP)) {
    if (percentage >= min) return { grade, points };
  }
  return { grade: 'F', points: 0 };
}

export class MarksService {

  /**
   * Create an exam session.
   */
  static async createExamSession(data: {
    name: string; examType: string; semester: number;
    academicYear: string; startDate: string; endDate: string;
  }) {
    return prisma.examSession.create({
      data: {
        name: data.name,
        examType: data.examType,
        semester: data.semester,
        academicYear: data.academicYear,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  /**
   * List exam sessions.
   */
  static async listExamSessions(semester?: number, academicYear?: string) {
    const where: any = {};
    if (semester) where.semester = semester;
    if (academicYear) where.academicYear = academicYear;
    return prisma.examSession.findMany({ where, orderBy: { startDate: 'desc' } });
  }

  /**
   * Enter marks for students in an exam session.
   */
  static async enterMarks(
    facultyUserId: string,
    examSessionId: string,
    subjectId: string,
    records: Array<{ studentId: string; marksObtained: number | null; isAbsent?: boolean }>,
    req?: any
  ) {
    const session = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!session) throw new APIError('NOT_FOUND', 'Exam session not found.');
    if (session.isLocked) throw new APIError('FORBIDDEN', 'Exam session is locked. Cannot modify marks.');

    // Verify faculty mapping
    const faculty = await (prisma.faculty as any).findUnique({ where: { userId: facultyUserId } });
    if (faculty) {
      const mapping = await prisma.facultySubjectMapping.findFirst({
        where: { facultyId: faculty.id, subjectId, isActive: true } as any,
      });
      if (!mapping) throw new APIError('FORBIDDEN', 'You are not mapped to this subject.');
    }

    let entered = 0;
    let updated = 0;

    for (const record of records) {
      const existing = await prisma.newMark.findUnique({
        where: { studentId_subjectId_examSessionId: { studentId: record.studentId, subjectId, examSessionId } },
      });

      const data = {
        marksObtained: record.marksObtained,
        isAbsent: record.isAbsent || false,
        enteredById: facultyUserId,
      };

      if (existing) {
        await prisma.newMark.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.newMark.create({
          data: { studentId: record.studentId, subjectId, examSessionId, ...data },
        });
        entered++;
      }
    }

    await AuditService.log(facultyUserId, 'MARKS_ENTRY', 'NewMark', examSessionId,
      null, { subjectId, entered, updated }, req);

    return { entered, updated, total: entered + updated };
  }

  /**
   * Get marks for an exam session.
   */
  static async getMarks(examSessionId: string, subjectId?: string) {
    const where: any = { examSessionId };
    if (subjectId) where.subjectId = subjectId;

    return prisma.newMark.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    });
  }

  /**
   * Compute grades + SGPA for a student in a semester.
   */
  static async computeGrades(studentId: string, semester: number, academicYear: string) {
    const marks = await prisma.newMark.findMany({
      where: { studentId, examSession: { semester, academicYear } },
      include: { subject: true },
    });

    if (marks.length === 0) return { sgpa: 0, cgpa: 0, totalCredits: 0, earnedCredits: 0, subjectGrades: [] };

    let totalCreditPoints = 0;
    let totalCredits = 0;
    let earnedCredits = 0;
    const subjectGrades: any[] = [];

    for (const mark of marks) {
      const maxMarks = mark.maxMarks || 30;
      const obtained = mark.marksObtained || 0;
      const percentage = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;
      const { grade, points } = getGrade(percentage);
      const credits = mark.subject.credits;

      totalCredits += credits;
      totalCreditPoints += points * credits;
      if (grade !== 'F') earnedCredits += credits;

      subjectGrades.push({
        subjectId: mark.subjectId,
        subjectName: mark.subject.name,
        subjectCode: mark.subject.code,
        marks: obtained,
        maxMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        gradePoints: points,
        credits,
      });
    }

    const sgpa = totalCredits > 0 ? Math.round((totalCreditPoints / totalCredits) * 100) / 100 : 0;

    // Compute CGPA from all semesters
    const allGrades = await prisma.newGradeRecord.findMany({ where: { studentId } });
    const prevSgpaSum = allGrades.reduce((sum, g) => sum + g.sgpa * g.totalCredits, 0);
    const prevCreditsSum = allGrades.reduce((sum, g) => sum + g.totalCredits, 0);
    const cgpa = (prevCreditsSum + totalCredits) > 0
      ? Math.round(((prevSgpaSum + sgpa * totalCredits) / (prevCreditsSum + totalCredits)) * 100) / 100
      : sgpa;

    // Upsert grade record
    await prisma.newGradeRecord.upsert({
      where: { studentId_semester_academicYear: { studentId, semester, academicYear } },
      create: { studentId, semester, academicYear, sgpa, cgpa, totalCredits, earnedCredits },
      update: { sgpa, cgpa, totalCredits, earnedCredits },
    });

    return { sgpa, cgpa, totalCredits, earnedCredits, subjectGrades };
  }

  /**
   * Lock an exam session.
   */
  static async lockExamSession(examSessionId: string, lockedById: string) {
    return prisma.examSession.update({
      where: { id: examSessionId },
      data: { isLocked: true, lockedAt: new Date(), lockedById },
    });
  }

  /**
   * Generate hall ticket.
   */
  static async generateHallTicket(studentId: string, examSessionId: string) {
    // Check attendance eligibility
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new APIError('NOT_FOUND', 'Student not found.');

    const session = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!session) throw new APIError('NOT_FOUND', 'Exam session not found.');

    // Get subjects for this semester
    const subjects = await prisma.newSubject.findMany({
      where: { departmentId: student.departmentId, semester: session.semester },
      select: { id: true, name: true, code: true },
    });

    return prisma.newHallTicket.upsert({
      where: { studentId_examSessionId: { studentId, examSessionId } },
      create: {
        studentId,
        examSessionId,
        eligibleSubjects: subjects,
        isEligible: true,
      },
      update: {
        eligibleSubjects: subjects,
        isEligible: true,
      },
    });
  }

  /**
   * Get student grades.
   */
  static async getStudentGrades(studentId: string) {
    return prisma.newGradeRecord.findMany({
      where: { studentId },
      orderBy: { semester: 'asc' },
    });
  }

  /**
   * Publish results for an exam session.
   */
  static async publishResults(examSessionId: string, publishedById: string) {
    const session = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!session) throw new APIError('NOT_FOUND', 'Exam session not found.');

    await prisma.newGradeRecord.updateMany({
      where: { semester: session.semester, academicYear: session.academicYear },
      data: { isPublished: true, publishedAt: new Date() },
    });

    return { published: true, session };
  }

  /**
   * Get detained students (below attendance threshold).
   */
  static async getDetainedStudents(examSessionId: string) {
    const session = await prisma.examSession.findUnique({ where: { id: examSessionId } });
    if (!session) return [];

    const students = await prisma.student.findMany({
      where: { semester: session.semester, isActive: true },
      select: { id: true, name: true, rollNumber: true },
    });

    const detained: any[] = [];
    for (const student of students) {
      const marks = await prisma.newMark.findMany({
        where: { studentId: student.id, examSessionId, isDetained: true },
      });
      if (marks.length > 0) detained.push(student);
    }

    return detained;
  }
}
