import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Standard singleton connection handling heavy multiplexing
export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required specifically by BullMQ
  enableReadyCheck: false,
  lazyConnect: true, // Allow app to start even if Redis is unreachable
});

redisClient.on('error', (err) => {
  console.error('[Redis Core Error]', err.message);
  // Fail-safe: Avoid process.exit even on fatal connection errors during boot
});

redisClient.on('connect', () => console.log('[Redis] Connected to cluster.'));
