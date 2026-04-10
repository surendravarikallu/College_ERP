import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisClient } from '../../core/cache/redis.service';
import { EmailService } from '../notifications/email.service';
import { MarksService } from '../exams/marks.service';

const connection = redisClient;

// ════════════════════════════════════════════════
// QUEUES
// ════════════════════════════════════════════════

export const emailQueue = new Queue('EmailQueue', { connection });
export const examQueue = new Queue('ExamQueue', { connection });

// ════════════════════════════════════════════════
// WORKERS
// ════════════════════════════════════════════════

export const startWorkers = () => {
  // 1. Email Worker (Rate limited to avoid spamming SMTP)
  const emailWorker = new Worker('EmailQueue', async (job) => {
    const { to, subject, html } = job.data;
    await EmailService.send(to, subject, html);
    return { sent: true, to };
  }, { 
    connection,
    limiter: {
      max: 5,        // Max 5 emails
      duration: 1000 // per second
    }
  });

  emailWorker.on('completed', (job) => console.log(`[EmailWorker] Job ${job.id} done.`));
  emailWorker.on('failed', (job, err) => console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message));

  // 2. Exam Processing Worker (Heavy tasks like result generation)
  const examWorker = new Worker('ExamQueue', async (job) => {
    if (job.name === 'generate_hall_tickets') {
      const { sessionId, studentIds } = job.data;
      let generated = 0;
      for (const studentId of studentIds) {
        try {
          await MarksService.generateHallTicket(studentId, sessionId);
          generated++;
          // Update progress
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
