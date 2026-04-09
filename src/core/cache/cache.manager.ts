import { redisClient } from './redis.service';

export class CacheManager {
  /**
   * Universal Get-Or-Set fetcher equipped with Request Coalescing and Range Jitter.
   */
  static async get<T>(key: string, fetcher: () => Promise<T>, ttlBase: number = 3600): Promise<T> {
    const raw = await redisClient.get(key);
    if (raw) return JSON.parse(raw) as T;
    
    // Mutex Lock preventing Cache Stampede (Multiple requests pounding DB simultaneously)
    const lockKey = `lock:${key}`;
    const acquired = await redisClient.set(lockKey, 'LOCKED', 'EX', 10, 'NX');
    
    if (!acquired) {
      // Coalescing: Wait 50ms and try fetching the resolved cache again natively
      await new Promise(r => setTimeout(r, 50));
      return this.get(key, fetcher, ttlBase);
    }

    try {
      const result = await fetcher();
      
      // Jitter preventing synchronized expiration bombs (±10%)
      const jitter = Math.floor(Math.random() * (ttlBase * 0.1));
      await redisClient.set(key, JSON.stringify(result), 'EX', ttlBase + jitter);
      
      return result as T;
    } finally {
      await redisClient.del(lockKey); // Release lock natively
    }
  }

  /**
   * Phase 7 Optimization: Replaces blocking KEYS command with iterative SCAN.
   */
  static async invalidateNamespace(namespaceGlob: string) {
    let cursor = '0';
    do {
      const [newCursor, keys] = await redisClient.scan(
        cursor,
        'MATCH',
        namespaceGlob,
        'COUNT',
        '100'
      );
      cursor = newCursor;

      if (keys.length > 0) {
        // High-speed UNLINK (asynchronous deletion) vs synchronous DEL blocking Redis thread
        const pipeline = redisClient.pipeline();
        keys.forEach(k => pipeline.unlink(k));
        await pipeline.exec();
      }
    } while (cursor !== '0');
  }
}
