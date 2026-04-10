import { Worker } from 'bullmq';
import { redisClient } from '../cache/redis.service';
import { EmailService } from '../../domain/notifications/email.service';

export const createEmailWorker = () => {
  const worker = new Worker('EmailQueue', async (job) => {
    const { to, subject, html } = job.data;
    await EmailService.send(to, subject, html);
    return { sent: true, to };
  }, {
    connection: redisClient,
    limiter: { max: 5, duration: 1000 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  } as any);

  worker.on('completed', (job) => console.log(`[EmailWorker] Job ${job.id} done.`));
  worker.on('failed', (job, err) => console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message));

  return worker;
};
