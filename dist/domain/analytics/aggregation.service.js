"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregationService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
class AggregationService {
    /**
     * Performs data aggregation for Attendance and Finance mirrors.
     * @param mode 'FULL' rebuilds everything, 'INCREMENTAL' updates recent 48 hours / 1 month.
     */
    static async syncAggregations(institutionId, mode = 'INCREMENTAL') {
        console.log(`[Aggregation] Starting ${mode} sync for ${institutionId}...`);
        await Promise.all([
            this.aggregateAttendance(institutionId, mode),
            this.aggregateFinance(institutionId, mode),
        ]);
        console.log(`[Aggregation] Finished ${mode} sync for ${institutionId}.`);
        return { status: 'COMPLETED', mode, timestamp: new Date() };
    }
    /** Aggregates daily attendance from raw AttendanceRecord entries */
    static async aggregateAttendance(institutionId, mode) {
        // Determine the date range
        let dateFilter = {};
        if (mode === 'INCREMENTAL') {
            const boundary = new Date();
            boundary.setDate(boundary.getDate() - 2); // Scan only last 48 hours for changes
            dateFilter = { session: { sessionDate: { gte: boundary } } };
        }
        // Get aggregated counts from raw data
        // Prisma doesn't support complex group-by across relations easily in one call, 
        // so we get raw sessions and their counts.
        const sessions = await prisma_client_1.prisma.attendanceSession.findMany({
            where: {
                timeSlot: { batch: { course: { department: { institutionId } } } },
                ...dateFilter
            },
            include: {
                records: true,
                timeSlot: { include: { batch: { include: { course: { include: { department: true } } } } } }
            }
        });
        const dailyMap = {};
        for (const session of sessions) {
            const dateStr = session.sessionDate.toISOString().split('T')[0];
            const deptId = session.timeSlot.batch.course.departmentId;
            const key = `${dateStr}_${deptId}`;
            if (!dailyMap[key]) {
                dailyMap[key] = { present: 0, absent: 0, deptId };
            }
            for (const record of session.records) {
                if (record.isPresent)
                    dailyMap[key].present++;
                else
                    dailyMap[key].absent++;
            }
        }
        // Upsert into ReportsDailyAttendanceAgg
        for (const [key, data] of Object.entries(dailyMap)) {
            const [datePart] = key.split('_');
            await prisma_client_1.prisma.reportsDailyAttendanceAgg.upsert({
                where: {
                    institutionId_departmentId_date: {
                        institutionId,
                        departmentId: data.deptId || '', // Handle null dept if needed
                        date: new Date(datePart),
                    }
                },
                update: { present: data.present, absent: data.absent },
                create: {
                    institutionId,
                    departmentId: data.deptId || '',
                    date: new Date(datePart),
                    present: data.present,
                    absent: data.absent
                }
            });
        }
    }
    /** Aggregates monthly finance data from Invoice and Payment tables */
    static async aggregateFinance(institutionId, mode) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-indexed
        // In a real production system, this would be a complex SQL query to calculate:
        // Total Captured Payments per month vs Total Sum of Invoices due in that month
        // For this implementation, we'll iterate through months of the current/past year
        const monthsToProcess = mode === 'FULL' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [currentMonth];
        for (const m of monthsToProcess) {
            const year = currentYear;
            const month = m + 1; // 1-indexed for storage
            const startDate = new Date(year, m, 1);
            const endDate = new Date(year, m + 1, 0, 23, 59, 59);
            const [collected, due] = await Promise.all([
                // Total sum of payments captured in this month
                prisma_client_1.prisma.payment.aggregate({
                    where: {
                        invoice: { student: { institutionId } },
                        status: 'CAPTURED',
                        createdAt: { gte: startDate, lte: endDate }
                    },
                    _sum: { amountPaid: true }
                }),
                // Total sum of remaining due on invoices whose due date is in this month
                prisma_client_1.prisma.invoice.aggregate({
                    where: {
                        student: { institutionId },
                        dueDate: { gte: startDate, lte: endDate },
                        status: { in: ['DUE', 'PARTIAL'] }
                    },
                    _sum: { totalAmount: true }
                })
            ]);
            await prisma_client_1.prisma.reportsMonthlyFinanceAgg.upsert({
                where: {
                    institutionId_year_month: { institutionId, year, month }
                },
                update: {
                    totalCollected: collected._sum.amountPaid || 0,
                    due: due._sum.totalAmount || 0
                },
                create: {
                    institutionId,
                    year,
                    month,
                    totalCollected: collected._sum.amountPaid || 0,
                    due: due._sum.totalAmount || 0
                }
            });
        }
    }
}
exports.AggregationService = AggregationService;
