"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBusWorker = exports.ERPEventBus = exports.queueEvents = exports.eventBusQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_service_1 = require("../cache/redis.service");
const cache_manager_1 = require("../cache/cache.manager");
// Massive durability Pipeline protecting intra-module triggers globally 
exports.eventBusQueue = new bullmq_1.Queue('GlobalEventBus', {
    connection: redis_service_1.redisClient
});
// Used strictly for capturing Failures pushing into a theoretical DLQ handler natively
exports.queueEvents = new bullmq_1.QueueEvents('GlobalEventBus', { connection: redis_service_1.redisClient });
exports.queueEvents.on('failed', ({ jobId, failedReason }) => console.error(`[EventBus DLQ] Job ${jobId} Failed permanently: ${failedReason}`));
class ERPEventBus {
    static async emit(topic, payload) {
        try {
            if (redis_service_1.redisClient.status !== 'ready') {
                console.warn(`[EventBus] Redis not ready. Skipping trigger for ${topic}`);
                return;
            }
            await exports.eventBusQueue.add(topic, payload, {
                attempts: 5,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: true,
                removeOnFail: false
            });
        }
        catch (err) {
            console.error(`[EventBus Error] Failed to emit ${topic}:`, err);
            // Non-blocking: We don't throw so the main request (like Login) can continue
        }
    }
}
exports.ERPEventBus = ERPEventBus;
// Global Invalidation Worker bridging Decoupled domain triggers effortlessly 
exports.eventBusWorker = new bullmq_1.Worker('GlobalEventBus', async (job) => {
    const { name: topic, data } = job;
    switch (topic) {
        case 'finance.payment.captured':
            await cache_manager_1.CacheManager.invalidateNamespace(`finance:dash:${data.institutionId}:*`);
            await cache_manager_1.CacheManager.invalidateNamespace(`analytics:finance:${data.institutionId}:*`);
            break;
        case 'attendance.session.closed':
            await cache_manager_1.CacheManager.invalidateNamespace(`analytics:attendance:${data.institutionId}:*`);
            break;
        case 'exams.workflow.published':
            // Fire downstream domains... (e.g. Notifications Queue mapped natively later)
            break;
        // etc... 
    }
}, { connection: redis_service_1.redisClient, concurrency: 10 });
exports.eventBusWorker.on('error', err => console.error('[BullMQ Worker Exception]', err));
