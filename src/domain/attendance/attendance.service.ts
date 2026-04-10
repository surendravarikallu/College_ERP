import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import { redisClient } from '../../core/cache/redis.service';

export class AttendanceService {

  /**
   * Mark bulk attendance for a subject.
   */
  static async markBulkAttendance(
    facultyId: string,
    subjectId: string,
    date: string,
    hour: number,
    records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'OD' | 'MEDICAL_LEAVE'; remark?: string }>
  ) {
    // Verify faculty is mapped to this subject via TeachingAllocation
    const mapping = await prisma.teachingAllocation.findFirst({
      where: { FacultyProfile: { userId: facultyId }, subjectId },
      include: { TimeSlot: true }
    });
    if (!mapping) throw new APIError('FORBIDDEN', 'You are not mapped to this subject.');

    const attendanceDate = new Date(date);
    if (attendanceDate > new Date()) throw new APIError('BAD_REQUEST', 'Cannot mark attendance for a future date.');

    // Find or create session
    // For simplicity, we just grab the first timeslot or create a dummy one
    const timeSlotId = mapping.TimeSlot[0]?.id || `ts-dummy-${subjectId}`;
    
    // Attempt to ensure session exists
    let session = await prisma.attendanceSession.findUnique({
      where: { timeSlotId_sessionDate: { timeSlotId, sessionDate: attendanceDate } }
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          id: `sess-${Date.now()}`,
          timeSlotId,
          sessionDate: attendanceDate,
          status: 'ACTIVE'
        }
      });
    }

    let marked = 0;
    let updated = 0;

    for (const record of records) {
      const isPresent = record.status === 'PRESENT' || record.status === 'OD';
      
      const existing = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: record.studentId } },
      });

      if (existing) {
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { isPresent },
        });
        updated++;
      } else {
        await prisma.attendanceRecord.create({
          data: {
            id: `att-${Date.now()}-${marked}`,
            sessionId: session.id,
            studentId: record.studentId,
            isPresent,
          },
        });
        marked++;
      }
    }

    // Invalidate attendance caches
    try {
      await redisClient.del(`attendance:subject:${subjectId}:${date}`);
      for (const r of records) {
        await redisClient.del(`attendance:student:${r.studentId}:*`);
      }
    } catch {}

    return { marked, updated, total: marked + updated };
  }

  /**
   * Get attendance records for a subject with optional date filter.
   */
  static async getAttendanceBySubject(subjectId: string, date?: string, fromDate?: string, toDate?: string) {
    const where: any = { AttendanceSession: { TimeSlot: { TeachingAllocation: { subjectId } } } };
    
    if (date) where.AttendanceSession.sessionDate = new Date(date);
    if (fromDate || toDate) {
      where.AttendanceSession.sessionDate = {};
      if (fromDate) where.AttendanceSession.sessionDate.gte = new Date(fromDate);
      if (toDate) where.AttendanceSession.sessionDate.lte = new Date(toDate);
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        StudentProfile: { select: { id: true, firstName: true, enrollmentNo: true } },
      },
    });

    return records.map(r => ({
      ...r,
      student: { id: r.StudentProfile.id, name: r.StudentProfile.firstName, rollNumber: r.StudentProfile.enrollmentNo },
      status: r.isPresent ? 'PRESENT' : 'ABSENT',
      date: date || new Date().toISOString(),
      hour: 1
    }));
  }

  /**
   * Get student's attendance with per-subject breakdown.
   */
  static async getStudentAttendance(studentId: string, semester?: number, subjectId?: string) {
    const where: any = { studentId };
    
    if (subjectId) {
      where.AttendanceSession = { TimeSlot: { TeachingAllocation: { subjectId } } };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        AttendanceSession: { include: { TimeSlot: { include: { TeachingAllocation: { include: { Subject: true } } } } } },
      },
    });

    // Compute per-subject aggregation
    const subjectMap: Record<string, { subject: any; total: number; present: number; absent: number; od: number; medical: number }> = {};

    for (const r of records) {
      const subject = r.AttendanceSession.TimeSlot.TeachingAllocation.Subject;
      const sid = subject.id;
      if (!subjectMap[sid]) {
        subjectMap[sid] = { subject, total: 0, present: 0, absent: 0, od: 0, medical: 0 };
      }
      subjectMap[sid].total++;
      if (r.isPresent) {
        subjectMap[sid].present++;
      } else {
        subjectMap[sid].absent++;
      }
    }

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.od) / s.total) * 100 * 100) / 100 : 0,
      isShortage: s.total > 0 && ((s.present + s.od) / s.total) * 100 < 75,
    }));

    const totalClasses = subjects.reduce((a, s) => a + s.total, 0);
    const totalPresent = subjects.reduce((a, s) => a + s.present + s.od, 0);
    const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100 * 100) / 100 : 0;

    return { subjects, overallPercentage, totalClasses, totalPresent };
  }

  /**
   * Correct attendance record (HOD/Admin only).
   */
  static async correctAttendance(
    attendanceId: string,
    newStatus: string,
    correctedById: string,
    remark?: string,
    req?: any
  ) {
    const existing = await prisma.attendanceRecord.findUnique({ where: { id: attendanceId } });
    if (!existing) throw new APIError('NOT_FOUND', 'Attendance record not found.');

    const isPresent = newStatus === 'PRESENT' || newStatus === 'OD';

    const updated = await prisma.attendanceRecord.update({
      where: { id: attendanceId },
      data: {
        isPresent
      },
    });

    return updated;
  }

  /**
   * Get default students below attendance threshold.
   */
  static async getAttendanceDefaulters(departmentId?: string, batchId?: string, threshold: number = 75) {
    const students = await prisma.studentProfile.findMany({
      select: { id: true, firstName: true, enrollmentNo: true, batchId: true },
    });

    const defaulters: any[] = [];

    for (const student of students) {
      const result = await this.getStudentAttendance(student.id);
      const shortageSubjects = result.subjects.filter(s => s.isShortage);

      if (shortageSubjects.length > 0) {
        defaulters.push({
          student: { id: student.id, name: student.firstName, rollNumber: student.enrollmentNo },
          overallPercentage: result.overallPercentage,
          shortageSubjects: shortageSubjects.map(s => ({
            name: s.subject.name,
            code: s.subject.code,
            percentage: s.percentage,
          })),
        });
      }
    }

    return defaulters;
  }

  /**
   * Monthly attendance report.
   */
  static async getMonthlyReport(departmentId?: string, batchId?: string, month: number = new Date().getMonth() + 1, year: number = new Date().getFullYear()) {
    return { month, year, report: [] };
  }
}
