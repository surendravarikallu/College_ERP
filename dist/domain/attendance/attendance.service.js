"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
const redis_service_1 = require("../../core/cache/redis.service");
const api_error_1 = require("../../core/common/exceptions/api.error");
const event_bus_service_1 = require("../../core/events/event-bus.service");
const emitter_service_1 = require("../../core/websockets/emitter.service");
class AttendanceService {
    // 1. Initiate Real-Time Sockets Native mapping
    static async startLiveSession(institutionId, facultyId, timeSlotId) {
        const slot = await prisma_client_1.prisma.timeSlot.findFirst({
            where: { id: timeSlotId, teachingAllocation: { facultyId, subject: { course: { department: { institutionId } } } } }
        });
        if (!slot)
            throw new api_error_1.APIError('FORBIDDEN', 'Unauthorized explicitly to trigger this batch.');
        // Upsert creating the exact DB record locking the Daily sequence natively
        const sessionDate = new Date();
        sessionDate.setUTCHours(0, 0, 0, 0); // Strip hours tracking uniquely
        const session = await prisma_client_1.prisma.attendanceSession.upsert({
            where: { timeSlotId_sessionDate: { timeSlotId, sessionDate } },
            update: {},
            create: { timeSlotId, sessionDate, status: 'ACTIVE' }
        });
        // Write highly transient 3Hr tracker mapping to explicit Redis rooms dropping DB hits entirely for Socket reads
        await redis_service_1.redisClient.set(`attendance:live:${session.id}`, 'OPEN', 'EX', 10800);
        return { sessionId: session.id, status: 'OPEN' };
    }
    // 2. High Speed Tapping mapping
    static async markLiveSessionRecord(institutionId, sessionId, studentId, isPresent) {
        // Only accept Native sockets if Redis explicitly claims Room is OPEN
        const isActive = await redis_service_1.redisClient.exists(`attendance:live:${sessionId}`);
        if (!isActive)
            throw new api_error_1.APIError('FORBIDDEN', 'Attendance Window definitively closed.');
        // Prisma natively handles UPSERT gracefully protecting DB loops
        const record = await prisma_client_1.prisma.attendanceRecord.upsert({
            where: { sessionId_studentId: { sessionId, studentId } },
            update: { isPresent },
            create: { sessionId, studentId, isPresent }
        });
        // 3. Real-time push to student
        emitter_service_1.SocketEmitter.emitToUser(studentId, 'attendance_updated', {
            sessionId,
            isPresent
        });
        return record;
    }
    // 3. Close the explicit socket mapped loops firing BullMQ Analytics invalidations natively
    static async closeSession(institutionId, sessionId) {
        await prisma_client_1.prisma.attendanceSession.update({ where: { id: sessionId }, data: { status: 'LOCKED' } });
        await redis_service_1.redisClient.del(`attendance:live:${sessionId}`);
        // Decoupled Triggers pushing Analytics Module aggregations securely
        await event_bus_service_1.ERPEventBus.emit('attendance.session.closed', { institutionId, sessionId });
        return { success: true };
    }
}
exports.AttendanceService = AttendanceService;
