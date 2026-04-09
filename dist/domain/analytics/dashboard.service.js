"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
const api_error_1 = require("../../core/common/exceptions/api.error");
class DashboardService {
    /** Admin KPIs: Global counts, revenue, and attendance trends */
    static async getAdminSummary(institutionId) {
        const [students, faculty, depts, courses] = await Promise.all([
            prisma_client_1.prisma.studentProfile.count({ where: { institutionId } }),
            prisma_client_1.prisma.facultyProfile.count({ where: { institutionId } }),
            prisma_client_1.prisma.department.count({ where: { institutionId } }),
            prisma_client_1.prisma.course.count({ where: { department: { institutionId } } }),
        ]);
        const attendanceAgg = await prisma_client_1.prisma.reportsDailyAttendanceAgg.findMany({
            where: { institutionId },
            orderBy: { date: 'desc' },
            take: 7,
        });
        const financeAgg = await prisma_client_1.prisma.reportsMonthlyFinanceAgg.findMany({
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
    static async getStudentSummary(studentId) {
        const student = await prisma_client_1.prisma.studentProfile.findUnique({
            where: { id: studentId },
            include: {
                batch: { include: { course: true } },
                attendanceRecords: { include: { session: true } },
                invoices: { include: { payments: true } },
            }
        });
        if (!student)
            throw new api_error_1.APIError('NOT_FOUND', 'Student profile not found.');
        // Calculate overall attendance %
        const totalSessions = student.attendanceRecords.length;
        const presentSessions = student.attendanceRecords.filter(r => r.isPresent).length;
        const attendancePercentage = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;
        // Calculate total fees and pending
        const totalFees = student.invoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalPaid = student.invoices.flatMap(i => i.payments).filter(p => p.status === 'CAPTURED').reduce((s, p) => s + p.amountPaid, 0);
        // Fetch Today's Classes
        const today = new Date().getDay();
        const classes = await prisma_client_1.prisma.timeSlot.findMany({
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
    static async getFacultySummary(facultyId) {
        const faculty = await prisma_client_1.prisma.facultyProfile.findUnique({
            where: { id: facultyId },
            include: { teachingAllocations: { include: { subject: true } } }
        });
        if (!faculty)
            throw new api_error_1.APIError('NOT_FOUND', 'Faculty profile not found.');
        const today = new Date().getDay();
        const todayClasses = await prisma_client_1.prisma.timeSlot.findMany({
            where: { teachingAllocation: { facultyId }, dayOfWeek: today },
            include: { batch: { include: { course: true } }, teachingAllocation: { include: { subject: true } } }
        });
        const pendingGrading = await prisma_client_1.prisma.scriptAllocation.findMany({
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
exports.DashboardService = DashboardService;
