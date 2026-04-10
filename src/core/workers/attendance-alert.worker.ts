import { Worker } from 'bullmq';
import { redisClient } from '../cache/redis.service';
import { notificationQueue } from '../queues/queue.setup';
import { emailQueue } from '../queues/queue.setup';

export const createAttendanceAlertWorker = () => {
  const worker = new Worker('AttendanceAlertQueue', async (job) => {
    const { studentId, studentName, userId, email, subjectName, percentage, threshold } = job.data;

    // Queue notification
    await notificationQueue.add('attendance-shortage', {
      userId,
      title: 'Attendance Shortage Alert',
      message: `Your attendance in ${subjectName} is ${percentage}% (below ${threshold}% threshold).`,
      type: 'ATTENDANCE_ALERT',
      metadata: { subjectName, percentage, threshold },
    });

    // Queue email alert
    if (email) {
      await emailQueue.add('attendance-alert-email', {
        to: email,
        subject: `⚠️ Attendance Shortage Alert — ${subjectName}`,
        html: `
          <h2>Attendance Shortage Alert</h2>
          <p>Dear ${studentName},</p>
          <p>Your attendance in <strong>${subjectName}</strong> has dropped to <strong>${percentage}%</strong>.</p>
          <p>The minimum required attendance is <strong>${threshold}%</strong>.</p>
          <p>Please ensure regular attendance to avoid being detained.</p>
          <br/>
          <p>Regards,<br/>Kits Akshar ERP System</p>
        `,
      });
    }

    return { alerted: true, studentId };
  }, { connection: redisClient });

  worker.on('completed', (job) => console.log(`[AttendanceAlertWorker] Job ${job.id} done.`));
  worker.on('failed', (job, err) => console.error(`[AttendanceAlertWorker] Job ${job?.id} failed:`, err.message));

  return worker;
};
