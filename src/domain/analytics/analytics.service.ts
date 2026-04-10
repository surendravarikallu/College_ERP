import { prisma } from '../../core/database/prisma.client';
import { CacheManager } from '../../core/cache/cache.manager';

export class AnalyticsService {
  /**
   * Admin Dashboard Main Stats
   */
  static async getOverviewStats() {
    return CacheManager.get('analytics:overview', async () => {
      const [
        totalStudentsNew,
        totalStudentsLegacy,
        totalFacultyNew,
        totalFacultyLegacy,
        pendingFees,
        pendingFeesNew,
      ] = await Promise.all([
        prisma.student.count({ where: { isActive: true } }),
        prisma.studentProfile.count({ where: { User: { isActive: true } } }),
        (prisma.faculty as any).count({ where: { isActive: true } }),
        prisma.facultyProfile.count({ where: { User: { isActive: true } } }),
        prisma.invoice.aggregate({ where: { status: 'DUE' }, _sum: { totalAmount: true } }),
        prisma.feeInvoice.aggregate({ where: { status: 'PENDING' }, _sum: { finalAmount: true } }),
      ]);

      const totalStudents = totalStudentsNew || totalStudentsLegacy;
      const totalFaculty = totalFacultyNew || totalFacultyLegacy;

      // Hostel stats
      const hostelOccupants = await prisma.hostelAllocation.count({ where: { isActive: true } }).catch(() => 0);

      // Library stats
      const libraryBooksIssued = await prisma.bookIssue.count({ where: { isReturned: false } }).catch(() => 0);

      const pendingDues = (pendingFeesNew._sum.finalAmount || 0) + (pendingFees._sum.totalAmount || 0);

      return {
        totalStudents,
        totalFaculty,
        users: { students: totalStudents, faculty: totalFaculty },
        operations: { hostelOccupants, libraryBooksIssued },
        finance: { pendingDues },
      };
    }, 60 * 15);
  }

  /**
   * Attendance trends (last 30 days).
   */
  static async getAttendanceTrends() {
    return CacheManager.get('analytics:attendanceTrends', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const records = await prisma.newAttendance.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        select: { status: true, subject: { select: { departmentId: true } } },
      });

      const trends: Record<string, { total: number; present: number }> = {};

      for (const r of records) {
        const dept = r.subject?.departmentId || 'UNKNOWN';
        if (!trends[dept]) trends[dept] = { total: 0, present: 0 };
        trends[dept].total++;
        if (r.status === 'PRESENT' || r.status === 'OD') trends[dept].present++;
      }

      return Object.keys(trends).map(dept => ({
        department: dept,
        percentage: Math.round((trends[dept].present / trends[dept].total) * 100 * 10) / 10,
      }));
    }, 60 * 60);
  }

  /**
   * Exam pass rate.
   */
  static async getExamPerformance() {
    return CacheManager.get('analytics:examPerformance', async () => {
      const sessions = await prisma.examSession.findMany({
        orderBy: { startDate: 'desc' },
        take: 5,
        select: { id: true, name: true, semester: true },
      });

      const performance = await Promise.all(sessions.map(async (session) => {
        const marks = await prisma.newMark.findMany({
          where: { examSessionId: session.id },
          select: { marksObtained: true, maxMarks: true },
        });

        if (marks.length === 0) return { session: session.name, semester: session.semester, passRate: 0 };

        const passed = marks.filter(m => {
          const pct = m.maxMarks > 0 ? ((m.marksObtained || 0) / m.maxMarks) * 100 : 0;
          return pct >= 40;
        }).length;

        return {
          session: session.name,
          semester: session.semester,
          passRate: Math.round((passed / marks.length) * 100 * 10) / 10,
        };
      }));

      return performance;
    }, 60 * 60 * 12);
  }

  /**
   * Student dashboard data.
   */
  static async getStudentDashboard(userId: string) {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return { attendancePct: 0, finance: { due: 0 }, classesToday: 0, cgpa: 0 };

    const [attendance, dues, grades] = await Promise.all([
      prisma.newAttendance.findMany({ where: { studentId: student.id } }),
      prisma.feeInvoice.aggregate({ where: { studentId: student.id, status: 'PENDING' }, _sum: { finalAmount: true } }),
      prisma.newGradeRecord.findMany({ where: { studentId: student.id }, orderBy: { semester: 'desc' }, take: 1 }),
    ]);

    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'OD').length;
    const attendancePct = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      attendancePct,
      finance: { due: dues._sum.finalAmount || 0 },
      classesToday: 0,
      cgpa: grades[0]?.cgpa || 0,
    };
  }

  /**
   * Faculty dashboard data.
   */
  static async getFacultyDashboard(userId: string) {
    const faculty = await (prisma.faculty as any).findUnique({ where: { userId } });
    if (!faculty) return { classesToday: 0, totalStudents: 0, pendingMarks: 0, avgAttendance: 0 };

    const mappings = await prisma.facultySubjectMapping.findMany({
      where: { facultyId: faculty.id, isActive: true as any },
    });

    return {
      classesToday: mappings.length,
      totalStudents: 0,
      pendingMarks: 0,
      avgAttendance: 0,
    };
  }
}
