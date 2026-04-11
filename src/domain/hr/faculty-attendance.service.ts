import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import { AttendanceStatus } from '@prisma/client';

export class FacultyAttendanceService {
  
  static async markAttendance(
    records: { facultyId: string; status: AttendanceStatus; remark?: string }[],
    date: string,
    requestedBy: string,
    institutionId: string
  ) {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) throw new APIError('BAD_REQUEST', 'Invalid date format.');

    const result = await prisma.$transaction(async (tx) => {
      const upserts = records.map(record =>
        tx.facultyAttendance.upsert({
          where: {
            facultyId_date: {
              facultyId: record.facultyId,
              date: attendanceDate
            }
          },
          update: {
            status: record.status,
            remark: record.remark
          },
          create: {
            facultyId: record.facultyId,
            date: attendanceDate,
            status: record.status,
            remark: record.remark
          }
        })
      );
      return Promise.all(upserts);
    });

    await AuditService.log(
      requestedBy,
      'FACULTY_ATTENDANCE_MARKED',
      'FacultyAttendance',
      `bulk-${date}`,
      null,
      { date, count: records.length }
    );

    return { markedCount: result.length };
  }

  static async getAttendanceByDate(date: string, departmentId?: string) {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) throw new APIError('BAD_REQUEST', 'Invalid date format.');

    const facultyWhere: any = { isActive: true };
    if (departmentId) facultyWhere.departmentId = departmentId;

    const [facultyList, attendanceList] = await Promise.all([
      prisma.faculty.findMany({
        where: facultyWhere,
        select: { id: true, faculty_name: true, designation: true } as any,
        orderBy: { faculty_name: 'asc' } as any
      }),
      prisma.facultyAttendance.findMany({
        where: { date: attendanceDate },
        select: { facultyId: true, status: true, remark: true }
      })
    ]);

    const attendanceMap = new Map(attendanceList.map(a => [a.facultyId.toString(), a]));

    return (facultyList as any[]).map(f => {
      const record = attendanceMap.get(f.id.toString());
      return {
        ...f,
        status: record ? record.status : null,
        remark: record ? record.remark : null
      };
    });
  }

  static async getFacultyAttendanceSummary(facultyId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await prisma.facultyAttendance.findMany({
      where: {
        facultyId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const summary = {
      totalWorkingDays: attendances.length,
      present: 0,
      absent: 0,
      od: 0,
      medicalLeave: 0
    };

    attendances.forEach(a => {
      if (a.status === 'PRESENT') summary.present++;
      else if (a.status === 'ABSENT') summary.absent++;
      else if (a.status === 'OD') summary.od++;
      else if (a.status === 'MEDICAL_LEAVE') summary.medicalLeave++;
    });

    return summary;
  }

  static async getDepartmentAttendanceSummary(departmentId: string, date: string) {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) throw new APIError('BAD_REQUEST', 'Invalid date format.');

    const attendances = await prisma.facultyAttendance.findMany({
      where: {
        date: attendanceDate,
        faculty: { departmentId, isActive: true }
      },
      include: {
        faculty: { select: { faculty_name: true, id: true } as any }
      }
    });

    const summary = {
      total: attendances.length,
      present: 0,
      absent: 0,
      od: 0,
      medicalLeave: 0
    };

    attendances.forEach(a => {
      if (a.status === 'PRESENT') summary.present++;
      else if (a.status === 'ABSENT') summary.absent++;
      else if (a.status === 'OD') summary.od++;
      else if (a.status === 'MEDICAL_LEAVE') summary.medicalLeave++;
    });

    return { summary, list: attendances };
  }
}
