import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import { attendanceAlertQueue } from '../../core/queues/queue.setup';

const ATTENDANCE_THRESHOLD = 75;

export class AttendanceService {

  /**
   * Mark bulk attendance for a subject (uses new models).
   */
  static async markBulkAttendance(
    facultyUserId: string,
    subjectId: string,
    date: string,
    hour: number,
    records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' | 'OD' | 'MEDICAL_LEAVE'; remark?: string }>
  ) {
    // Verify faculty mapping via new Faculty + FacultySubjectMapping
    const faculty = await (prisma.faculty as any).findUnique({ where: { userId: facultyUserId } });
    if (!faculty) {
      // Fallback: try legacy FacultyProfile → TeachingAllocation
      const legacyMapping = await prisma.teachingAllocation.findFirst({
        where: { FacultyProfile: { userId: facultyUserId } },
      });
      if (!legacyMapping) throw new APIError('FORBIDDEN', 'You are not mapped to any subject.');
    } else {
      const mapping = await prisma.facultySubjectMapping.findFirst({
        where: { facultyId: faculty.id, subjectId, isActive: true } as any,
      });
      if (!mapping) throw new APIError('FORBIDDEN', 'You are not mapped to this subject.');
    }

    const attendanceDate = new Date(date);
    if (attendanceDate > new Date()) throw new APIError('BAD_REQUEST', 'Cannot mark attendance for a future date.');

    const facultyId: string = faculty?.id || facultyUserId;
    let marked = 0;
    let updated = 0;

    for (const record of records) {
      const existing = await prisma.newAttendance.findUnique({
        where: { studentId_subjectId_date_hour: { studentId: record.studentId, subjectId, date: attendanceDate, hour } },
      });

      if (existing) {
        await prisma.newAttendance.update({
          where: { id: existing.id },
          data: { status: record.status as any, remark: record.remark, facultyId },
        });
        updated++;
      } else {
        await prisma.newAttendance.create({
          data: {
            studentId: record.studentId,
            subjectId,
            facultyId,
            date: attendanceDate,
            hour,
            status: record.status as any,
            remark: record.remark,
          },
        });
        marked++;
      }
    }

    // Check for attendance shortage and queue alerts
    for (const record of records) {
      try {
        const result = await this.getStudentSubjectAttendance(record.studentId, subjectId);
        if (result.percentage < ATTENDANCE_THRESHOLD) {
          const student = await prisma.student.findUnique({
            where: { id: record.studentId },
            include: { user: true },
          });
          if (student) {
            await attendanceAlertQueue.add('check-shortage', {
              studentId: record.studentId,
              studentName: student.name,
              userId: student.userId,
              email: student.user.email,
              subjectName: result.subjectName || 'Unknown',
              percentage: result.percentage,
              threshold: ATTENDANCE_THRESHOLD,
            });
          }
        }
      } catch { /* Non-blocking */ }
    }

    return { marked, updated, total: marked + updated };
  }

  /**
   * Get student-subject attendance percentage.
   */
  static async getStudentSubjectAttendance(studentId: string, subjectId: string) {
    const records = await prisma.newAttendance.findMany({
      where: { studentId, subjectId },
      include: { subject: { select: { name: true } } },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'OD').length;
    const percentage = total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0;

    return {
      total,
      present,
      absent: records.filter(r => r.status === 'ABSENT').length,
      od: records.filter(r => r.status === 'OD').length,
      medicalLeave: records.filter(r => r.status === 'MEDICAL_LEAVE').length,
      percentage,
      subjectName: records[0]?.subject?.name || null,
      isShortage: total > 0 && percentage < ATTENDANCE_THRESHOLD,
    };
  }

  /**
   * Get attendance records for a subject.
   */
  static async getAttendanceBySubject(subjectId: string, date?: string, fromDate?: string, toDate?: string) {
    const where: any = { subjectId };

    if (date) where.date = new Date(date);
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const records = await prisma.newAttendance.findMany({
      where,
      include: { student: { select: { id: true, name: true, rollNumber: true } } },
      orderBy: [{ date: 'desc' }, { hour: 'asc' }],
    });

    return records.map(r => ({
      ...r,
      studentName: r.student.name,
      rollNumber: r.student.rollNumber,
    }));
  }

  /**
   * Get student's overall attendance with per-subject breakdown.
   */
  static async getStudentAttendance(studentId: string, semester?: number, subjectId?: string) {
    const where: any = { studentId };
    if (subjectId) where.subjectId = subjectId;

    const records = await prisma.newAttendance.findMany({
      where,
      include: { subject: { select: { id: true, name: true, code: true, credits: true } } },
    });

    // Group by subject
    const subjectMap: Record<string, { subject: any; total: number; present: number; absent: number; od: number; medical: number }> = {};

    for (const r of records) {
      const sid = r.subjectId;
      if (!subjectMap[sid]) {
        subjectMap[sid] = { subject: r.subject, total: 0, present: 0, absent: 0, od: 0, medical: 0 };
      }
      subjectMap[sid].total++;
      if (r.status === 'PRESENT') subjectMap[sid].present++;
      else if (r.status === 'ABSENT') subjectMap[sid].absent++;
      else if (r.status === 'OD') subjectMap[sid].od++;
      else if (r.status === 'MEDICAL_LEAVE') subjectMap[sid].medical++;
    }

    const subjects = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.od) / s.total) * 100 * 100) / 100 : 0,
      isShortage: s.total > 0 && ((s.present + s.od) / s.total) * 100 < ATTENDANCE_THRESHOLD,
    }));

    const totalClasses = subjects.reduce((a, s) => a + s.total, 0);
    const totalPresent = subjects.reduce((a, s) => a + s.present + s.od, 0);
    const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100 * 100) / 100 : 0;

    return { subjects, overallPercentage, totalClasses, totalPresent };
  }

  /**
   * Correct attendance record (HOD/Admin only).
   */
  static async correctAttendance(attendanceId: string, newStatus: string, correctedById: string, remark?: string, req?: any) {
    const existing = await prisma.newAttendance.findUnique({ where: { id: attendanceId } });
    if (!existing) throw new APIError('NOT_FOUND', 'Attendance record not found.');

    const updated = await prisma.newAttendance.update({
      where: { id: attendanceId },
      data: {
        status: newStatus as any,
        correctedAt: new Date(),
        correctedById,
        remark: remark || existing.remark,
      },
    });

    await AuditService.log(correctedById, 'ATTENDANCE_CORRECTION', 'NewAttendance', attendanceId,
      { status: existing.status }, { status: newStatus }, req);

    return updated;
  }

  /**
   * Get attendance defaulters.
   */
  static async getAttendanceDefaulters(departmentId?: string, batchId?: string, threshold: number = ATTENDANCE_THRESHOLD) {
    const where: any = { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    if (batchId) where.batchId = batchId;

    const students = await prisma.student.findMany({
      where,
      select: { id: true, name: true, rollNumber: true, userId: true },
    });

    const defaulters: any[] = [];

    for (const student of students) {
      const result = await this.getStudentAttendance(student.id);
      const shortageSubjects = result.subjects.filter(s => s.isShortage);

      if (shortageSubjects.length > 0) {
        defaulters.push({
          student: { id: student.id, name: student.name, rollNumber: student.rollNumber },
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
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await prisma.newAttendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        ...(departmentId ? { student: { departmentId } } : {}),
      },
      include: { student: { select: { name: true, rollNumber: true } } },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT' || r.status === 'OD').length;

    return {
      month,
      year,
      totalRecords: total,
      presentCount: present,
      absentCount: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100 * 10) / 10 : 0,
    };
  }
}
