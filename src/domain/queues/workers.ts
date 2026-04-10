import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisClient } from '../../core/cache/redis.service';
import { EmailService } from '../notifications/email.service';
import { MarksService } from '../exams/marks.service';
import { createEmailWorker } from '../../core/workers/email.worker';
import { createNotificationWorker } from '../../core/workers/notification.worker';
import { createAttendanceAlertWorker } from '../../core/workers/attendance-alert.worker';

const connection = redisClient;

// ════════════════════════════════════════════════
// QUEUES (legacy — re-exported from queue.setup)
// ════════════════════════════════════════════════

export const emailQueue = new Queue('EmailQueue', { connection });
export const examQueue = new Queue('ExamQueue', { connection });

// ════════════════════════════════════════════════
// WORKERS
// ════════════════════════════════════════════════

export const startWorkers = () => {
  // 1. Email Worker
  createEmailWorker();
  console.log('[Workers] Email worker started.');

  // 2. Notification Worker
  createNotificationWorker();
  console.log('[Workers] Notification worker started.');

  // 3. Attendance Alert Worker
  createAttendanceAlertWorker();
  console.log('[Workers] Attendance alert worker started.');

  // 4. Exam Processing Worker (Heavy tasks like hall ticket generation)
  const examWorker = new Worker('ExamQueue', async (job) => {
    if (job.name === 'generate_hall_tickets') {
      const { sessionId, studentIds } = job.data;
      let generated = 0;
      for (const studentId of studentIds) {
        try {
          await MarksService.generateHallTicket(studentId, sessionId);
          generated++;
          await job.updateProgress(Math.floor((generated / studentIds.length) * 100));
        } catch (e) {
          console.error(`[ExamWorker] Failed hall ticket for ${studentId}:`, e);
        }
      }
      return { completed: true, generated };
    }
    
    if (job.name === 'publish_results') {
       const { sessionId, publishedById } = job.data;
       return await MarksService.publishResults(sessionId, publishedById);
    }
  }, { connection });

  examWorker.on('completed', (job) => console.log(`[ExamWorker] Job ${job.name}:${job.id} done.`));
  examWorker.on('failed', (job, err) => console.error(`[ExamWorker] Job ${job?.name}:${job?.id} failed:`, err.message));
};
