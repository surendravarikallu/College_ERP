import { Request, Response, NextFunction } from 'express';
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../cache/redis.service';

/**
 * Helper to determine if Redis is operational for Rate Limiting.
 * If not, we fallback to express-rate-limit's native MemoryStore to prevent 500s.
 */
const getSafeStore = (prefix: string) => {
  if (redisClient.status !== 'ready') {
    // We log it only once or gracefully fallback to MemoryStore (undefined)
    // This is safe and prevents crashes during script loading.
    return undefined; 
  }
  
  return new RedisStore({
    prefix: `erp:rl:${prefix}:`,
    sendCommand: (...args: string[]) => {
      if (redisClient.status !== 'ready') return Promise.resolve(); 
      return redisClient.call(args[0], ...args.slice(1)) as any;
    },
  });
};

/**
 * 1. Global API Strict Window Limiter
 * 100 requests per minute per IP preventing brute forcing natively.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false,
  store: getSafeStore('global'),
  message: { success: false, error: 'Too many requests from this IP, please try again after a minute.' }
});

/**
 * 2. Dedicated Auth Endpoint Limiter
 * Extremely tight limits explicitly protecting Database Authentication hashing blocks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: getSafeStore('auth'),
  message: { success: false, error: 'Too many login attempts. Account locked for 15 minutes.' }
});
