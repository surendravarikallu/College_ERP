import { prisma } from '../../core/database/prisma.client';
import { redisClient } from '../../core/cache/redis.service';
import { APIError } from '../../core/common/exceptions/api.error';
import { ERPEventBus } from '../../core/events/event-bus.service';
import { SocketEmitter } from '../../core/websockets/emitter.service';

export class AttendanceService {

  // 1. Initiate Real-Time Sockets Native mapping
  static async startLiveSession(institutionId: string, facultyId: string, timeSlotId: string) {
    const slot = await prisma.timeSlot.findFirst({
        where: { id: timeSlotId, teachingAllocation: { facultyId, subject: { course: { department: { institutionId } } } } }
    });
    if (!slot) throw new APIError('FORBIDDEN', 'Unauthorized explicitly to trigger this batch.');

    // Upsert creating the exact DB record locking the Daily sequence natively
    const sessionDate = new Date();
    sessionDate.setUTCHours(0, 0, 0, 0); // Strip hours tracking uniquely

    const session = await prisma.attendanceSession.upsert({
       where: { timeSlotId_sessionDate: { timeSlotId, sessionDate } },
       update: {},
       create: { timeSlotId, sessionDate, status: 'ACTIVE' }
    });

    // Write highly transient 3Hr tracker mapping to explicit Redis rooms dropping DB hits entirely for Socket reads
    await redisClient.set(`attendance:live:${session.id}`, 'OPEN', 'EX', 10800);
    return { sessionId: session.id, status: 'OPEN' };
  }

  // 2. High Speed Tapping mapping
  static async markLiveSessionRecord(institutionId: string, sessionId: string, studentId: string, isPresent: boolean) {
    // Only accept Native sockets if Redis explicitly claims Room is OPEN
    const isActive = await redisClient.exists(`attendance:live:${sessionId}`);
    if (!isActive) throw new APIError('FORBIDDEN', 'Attendance Window definitively closed.');

    // Prisma natively handles UPSERT gracefully protecting DB loops
    const record = await prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId, studentId } },
      update: { isPresent },
      create: { sessionId, studentId, isPresent }
    });

    // 3. Real-time push to student
    SocketEmitter.emitToUser(studentId, 'attendance_updated', {
      sessionId,
      isPresent
    });

    return record;
  }

  // 3. Close the explicit socket mapped loops firing BullMQ Analytics invalidations natively
  static async closeSession(institutionId: string, sessionId: string) {
    await prisma.attendanceSession.update({ where: { id: sessionId }, data: { status: 'LOCKED' } });
    await redisClient.del(`attendance:live:${sessionId}`);
    
    // Decoupled Triggers pushing Analytics Module aggregations securely
    await ERPEventBus.emit('attendance.session.closed', { institutionId, sessionId });
    return { success: true };
  }
}
