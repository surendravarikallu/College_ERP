import { Worker } from 'bullmq';
import { redisClient } from '../cache/redis.service';
import { prisma } from '../database/prisma.client';
import { getSocketIO } from '../websockets/gateway';

export const createNotificationWorker = () => {
  const worker = new Worker('NotificationQueue', async (job) => {
    const { userId, title, message, type, metadata } = job.data;

    // Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        body: message,
        type: type || 'INFO',
        metadata: metadata || undefined,
      },
    });

    // Emit via Socket.IO for real-time push
    try {
      const io = getSocketIO();
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          id: notification.id,
          title,
          message,
          type: type || 'INFO',
          createdAt: notification.createdAt,
        });
      }
    } catch {
      // Socket not available, notification persisted in DB
    }

    return { notificationId: notification.id };
  }, { connection: redisClient });

  worker.on('completed', (job) => console.log(`[NotificationWorker] Job ${job.id} done.`));
  worker.on('failed', (job, err) => console.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message));

  return worker;
};
