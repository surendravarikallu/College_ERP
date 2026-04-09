"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const redis_service_1 = require("./redis.service");
class CacheManager {
    /**
     * Universal Get-Or-Set fetcher equipped with Request Coalescing and Range Jitter.
     */
    static async get(key, fetcher, ttlBase = 3600) {
        const raw = await redis_service_1.redisClient.get(key);
        if (raw)
            return JSON.parse(raw);
        // Mutex Lock preventing Cache Stampede (Multiple requests pounding DB simultaneously)
        const lockKey = `lock:${key}`;
        const acquired = await redis_service_1.redisClient.set(lockKey, 'LOCKED', 'EX', 10, 'NX');
        if (!acquired) {
            // Coalescing: Wait 50ms and try fetching the resolved cache again natively
            await new Promise(r => setTimeout(r, 50));
            return this.get(key, fetcher, ttlBase);
        }
        try {
            const result = await fetcher();
            // Jitter preventing synchronized expiration bombs (±10%)
            const jitter = Math.floor(Math.random() * (ttlBase * 0.1));
            await redis_service_1.redisClient.set(key, JSON.stringify(result), 'EX', ttlBase + jitter);
            return result;
        }
        finally {
            await redis_service_1.redisClient.del(lockKey); // Release lock natively
        }
    }
    /**
     * Phase 7 Optimization: Replaces blocking KEYS command with iterative SCAN.
     */
    static async invalidateNamespace(namespaceGlob) {
        let cursor = '0';
        do {
            const [newCursor, keys] = await redis_service_1.redisClient.scan(cursor, 'MATCH', namespaceGlob, 'COUNT', '100');
            cursor = newCursor;
            if (keys.length > 0) {
                // High-speed UNLINK (asynchronous deletion) vs synchronous DEL blocking Redis thread
                const pipeline = redis_service_1.redisClient.pipeline();
                keys.forEach(k => pipeline.unlink(k));
                await pipeline.exec();
            }
        } while (cursor !== '0');
    }
}
exports.CacheManager = CacheManager;
