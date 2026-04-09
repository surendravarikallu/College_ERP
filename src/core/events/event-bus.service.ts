import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisClient } from '../cache/redis.service';
import { CacheManager } from '../cache/cache.manager';

// Massive durability Pipeline protecting intra-module triggers globally 
export const eventBusQueue = new Queue('GlobalEventBus', { 
  connection: redisClient 
});

// Used strictly for capturing Failures pushing into a theoretical DLQ handler natively
export const queueEvents = new QueueEvents('GlobalEventBus', { connection: redisClient });
queueEvents.on('failed', ({ jobId, failedReason }) => console.error(`[EventBus DLQ] Job ${jobId} Failed permanently: ${failedReason}`));

export class ERPEventBus {
  static async emit(topic: string, payload: any) {
    try {
      if (redisClient.status !== 'ready') {
         console.warn(`[EventBus] Redis not ready. Skipping trigger for ${topic}`);
         return;
      }

      await eventBusQueue.add(topic, payload, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false
      });
    } catch (err) {
      console.error(`[EventBus Error] Failed to emit ${topic}:`, err);
      // Non-blocking: We don't throw so the main request (like Login) can continue
    }
  }
}

// Global Invalidation Worker bridging Decoupled domain triggers effortlessly 
export const eventBusWorker = new Worker('GlobalEventBus', async job => {
  const { name: topic, data } = job;

  switch (topic) {
    case 'finance.payment.captured':
       await CacheManager.invalidateNamespace(`finance:dash:${data.institutionId}:*`);
       await CacheManager.invalidateNamespace(`analytics:finance:${data.institutionId}:*`);
       break;

    case 'attendance.session.closed':
       await CacheManager.invalidateNamespace(`analytics:attendance:${data.institutionId}:*`);
       break;

    case 'exams.workflow.published':
       // Fire downstream domains... (e.g. Notifications Queue mapped natively later)
       break;
       
    // etc... 
  }
}, { connection: redisClient, concurrency: 10 });

eventBusWorker.on('error', err => console.error('[BullMQ Worker Exception]', err));
