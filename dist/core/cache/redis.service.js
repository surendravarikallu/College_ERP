"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Standard singleton connection handling heavy multiplexing
exports.redisClient = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Required specifically by BullMQ
    enableReadyCheck: false,
    lazyConnect: true, // Allow app to start even if Redis is unreachable
});
exports.redisClient.on('error', (err) => {
    console.error('[Redis Core Error]', err.message);
    // Fail-safe: Avoid process.exit even on fatal connection errors during boot
});
exports.redisClient.on('connect', () => console.log('[Redis] Connected to cluster.'));
