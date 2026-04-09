import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../cache/redis.service';

/**
 * Higher-order middleware for Redis caching.
 * @param namespace The prefix for the cache key (e.g., 'dash:admin')
 * @param ttl Time-to-live in seconds (default 300)
 */
export const cacheMiddleware = (namespace: string, ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Generate unique key based on namespace + URL + User ID (for personal dashboards)
    const userId = (req as any).user?.id || 'anon';
    const cacheKey = `erp:cache:${namespace}:${userId}:${req.originalUrl}`;

    try {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`[Cache] MISS: ${cacheKey}`);

      // Monkey-patch res.json to capture response and store in cache
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        // Only cache successful 200 responses
        if (res.statusCode === 200) {
          redisClient.setex(cacheKey, ttl, JSON.stringify(data)).catch(err => 
            console.error('[Cache] Set error:', err)
          );
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('[Cache] Middleware error:', err);
      next(); // Fail-safe: continue without cache
    }
  };
};

/**
 * Utility to invalidate cache by pattern.
 * Uses SCAN to avoid blocking Redis like KEYS would.
 */
export const invalidateCache = async (pattern: string) => {
  const fullPattern = `erp:cache:${pattern}*`;
  console.log(`[Cache] Invalidating pattern: ${fullPattern}`);
  
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } while (cursor !== '0');
};
