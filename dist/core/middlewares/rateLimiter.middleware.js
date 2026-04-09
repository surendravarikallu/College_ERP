"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = exports.globalRateLimiter = void 0;
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const redis_service_1 = require("../cache/redis.service");
/**
 * Helper to determine if Redis is operational for Rate Limiting.
 * If not, we fallback to express-rate-limit's native MemoryStore to prevent 500s.
 */
const getSafeStore = (prefix) => {
    if (redis_service_1.redisClient.status !== 'ready') {
        console.warn(`[RateLimit] Redis not ready for ${prefix}. Falling back to MemoryStore.`);
        return undefined; // undefined defaults to MemoryStore
    }
    return new rate_limit_redis_1.default({
        prefix: `erp:rl:${prefix}:`,
        sendCommand: (...args) => {
            // Final guard during command execution
            if (redis_service_1.redisClient.status !== 'ready')
                return Promise.resolve();
            return redis_service_1.redisClient.call(args[0], ...args.slice(1));
        },
    });
};
/**
 * 1. Global API Strict Window Limiter
 * 100 requests per minute per IP preventing brute forcing natively.
 */
exports.globalRateLimiter = (0, express_rate_limit_1.default)({
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
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    store: getSafeStore('auth'),
    message: { success: false, error: 'Too many login attempts. Account locked for 15 minutes.' }
});
