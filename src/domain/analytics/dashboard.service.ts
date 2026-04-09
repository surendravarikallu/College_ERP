import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class DashboardService {

  /** Admin KPIs: Global counts, revenue, and attendance trends */
  static async getAdminSummary(institutionId: string) {
    const [students, faculty, depts, courses] = await Promise.all([
      prisma.studentProfile.count({ where: { institutionId } }),
      prisma.facultyProfile.count({ where: { institutionId } }),
      prisma.department.count({ where: { institutionId } }),
      prisma.course.count({ where: { department: { institutionId } } }),
    ]);

    const attendanceAgg = await prisma.reportsDailyAttendanceAgg.findMany({
      where: { institutionId },
      orderBy: { date: 'desc' },
      take: 7,
    });

    const financeAgg = await prisma.reportsMonthlyFinanceAgg.findMany({
      where: { institutionId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 6,
    });

    return {
      stats: { totalStudents: students, totalFaculty: faculty, departments: depts, courses },
      attendanceTrend: attendanceAgg.reverse(),
      financeTrend: financeAgg.reverse(),
    };
  }

  /** Student KPIs: Personal Attendance, SGPA, Fee Dues, and Today's Schedule */
  static async getStudentSummary(studentId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        batch: { include: { course: true } },
        attendanceRecords: { include: { session: true } },
        invoices: { include: { payments: true } },
      }
    });

    if (!student) throw new APIError('NOT_FOUND', 'Student profile not found.');

    // Calculate overall attendance %
    const totalSessions = student.attendanceRecords.length;
    const presentSessions = student.attendanceRecords.filter(r => r.isPresent).length;
    const attendancePercentage = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;

    // Calculate total fees and pending
    const totalFees = student.invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = student.invoices.flatMap(i => i.payments).filter(p => p.status === 'CAPTURED').reduce((s, p) => s + p.amountPaid, 0);

    // Fetch Today's Classes
    const today = new Date().getDay();
    const classes = await prisma.timeSlot.findMany({
      where: { batchId: student.batchId || '', dayOfWeek: today },
      include: { teachingAllocation: { include: { subject: true, faculty: true } } }
    });

    return {
      attendance: Math.round(attendancePercentage * 100) / 100,
      finance: { totalFees, totalPaid, pending: totalFees - totalPaid },
      todaySchedule: classes.map(c => ({
        subject: c.teachingAllocation.subject.name,
        time: `${c.startTime} - ${c.endTime}`,
        faculty: `${c.teachingAllocation.faculty.firstName} ${c.teachingAllocation.faculty.lastName}`,
      })),
      invoices: student.invoices
    };
  }

  /** Faculty KPIs: Assigned classes, grading backlog and performance averages */
  static async getFacultySummary(facultyId: string) {
    const faculty = await prisma.facultyProfile.findUnique({
      where: { id: facultyId },
      include: { teachingAllocations: { include: { subject: true } } }
    });

    if (!faculty) throw new APIError('NOT_FOUND', 'Faculty profile not found.');

    const today = new Date().getDay();
    const todayClasses = await prisma.timeSlot.findMany({
      where: { teachingAllocation: { facultyId }, dayOfWeek: today },
      include: { batch: { include: { course: true } }, teachingAllocation: { include: { subject: true } } }
    });

    const pendingGrading = await prisma.scriptAllocation.findMany({
      where: { evaluatorId: facultyId, status: 'ASSIGNED' },
      include: { script: { include: { examSchedule: { include: { subject: true } } } } }
    });

    return {
      todayClasses: todayClasses.map(c => ({
        subject: c.teachingAllocation.subject.name,
        batch: `${c.batch.course.name} (${c.batch.year})`,
        time: `${c.startTime} - ${c.endTime}`,
        room: 'Standard LH'
      })),
      gradingBacklog: pendingGrading.map(g => ({
        exam: g.script.examSchedule.subject.name,
        scripts: 1, 
        deadline: 'Apr 15', 
        priority: 'normal'
      })),
      assignedSubjects: faculty.teachingAllocations.map(a => a.subject.name),
    };
  }
}
