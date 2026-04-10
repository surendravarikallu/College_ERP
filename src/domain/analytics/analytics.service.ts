import { prisma } from '../../core/database/prisma.client';
import { CacheManager } from '../../core/cache/cache.manager';

export class AnalyticsService {
  /**
   * Admin Dashboard Main Stats
   */
  static async getOverviewStats() {
    return CacheManager.get('analytics:overview', async () => {
      const [
        totalStudents,
        totalFaculty,
        activeHostelStudents,
        pendingFees,
        libraryIssued
      ] = await Promise.all([
        prisma.studentProfile.count({ where: { User: { isActive: true } } }),
        prisma.facultyProfile.count({ where: { User: { isActive: true } } }),
        prisma.bedAllocation.count({ where: { status: 'ACTIVE' } }),
        prisma.invoice.aggregate({
          where: { status: 'DUE' },
          _sum: { totalAmount: true },
        }),
        prisma.libraryTransaction.count({ where: { returnDate: null } }),
      ]);

      const [feePaidCurrentMonth, feeBilledCurrentMonth] = await Promise.all([
        prisma.invoice.aggregate({
          where: { status: 'PAID' },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { dueDate: { gte: new Date(new Date().setDate(1)) } },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        users: { students: totalStudents, faculty: totalFaculty },
        operations: { hostelOccupants: activeHostelStudents, libraryBooksIssued: libraryIssued },
        finance: {
          pendingDues: pendingFees._sum.totalAmount || 0,
          currentMonthCollection: feePaidCurrentMonth._sum.totalAmount || 0,
          currentMonthBilled: feeBilledCurrentMonth._sum.totalAmount || 0,
        },
      };
    }, 60 * 15); // Cache for 15 mins
  }

  /**
   * Get attendance trends across departments (for chart)
   */
  static async getAttendanceTrends() {
    return CacheManager.get('analytics:attendanceTrends', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const records = await prisma.attendanceRecord.findMany({
        where: { AttendanceSession: { sessionDate: { gte: thirtyDaysAgo } } },
        select: { StudentProfile: { select: { batchId: true } }, isPresent: true },
      });

      const trends: Record<string, { total: number; present: number }> = {};
      
      for (const r of records) {
        const dept = r.StudentProfile?.batchId || 'UNKNOWN';
        if (!trends[dept]) trends[dept] = { total: 0, present: 0 };
        trends[dept].total++;
        if (r.isPresent) trends[dept].present++;
      }

      return Object.keys(trends).map(dept => ({
        department: dept,
        percentage: Math.round((trends[dept].present / trends[dept].total) * 100 * 10) / 10,
      }));
    }, 60 * 60); // 1 hour cache
  }

  /**
   * Get Exam Pass Rate by Semester
   */
  static async getExamPerformance() {
    return CacheManager.get('analytics:examPerformance', async () => {
      const recentSessions = await prisma.examSchedule.findMany({
        orderBy: { examDate: 'desc' },
        take: 5,
        select: { id: true, subjectId: true },
      });

      const performance = await Promise.all(recentSessions.map(async (session) => {
        const marks = await prisma.marksInternal.findMany({
          where: { examScheduleId: session.id },
          select: { marksObtained: true },
        });

        if (marks.length === 0) return { session: session.subjectId, passRate: 0 };

        const passed = marks.filter((m: any) => (m.marksObtained || 0) >= 12).length; // assume 12 is passing marks for 30 max 
        return {
          session: session.subjectId,
          semester: 1,
          passRate: Math.round((passed / marks.length) * 100 * 10) / 10,
        };
      }));

      return performance;
    }, 60 * 60 * 12); // 12 hour cache
  }
}
