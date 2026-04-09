"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const aggregation_service_1 = require("../domain/analytics/aggregation.service");
const prisma_client_1 = require("./database/prisma.client");
/**
 * Centralized Cron Scheduler for periodic background tasks.
 * Runs aggregation jobs nightly and other maintenance tasks.
 */
const initScheduler = () => {
    console.log('[Scheduler] Initializing cron jobs...');
    // Nightly aggregation at 2:00 AM
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('[Scheduler] Running nightly aggregation...');
        try {
            const institutions = await prisma_client_1.prisma.institution.findMany({ select: { id: true } });
            for (const inst of institutions) {
                await aggregation_service_1.AggregationService.syncAggregations(inst.id, 'INCREMENTAL');
            }
            console.log('[Scheduler] Nightly aggregation complete.');
        }
        catch (err) {
            console.error('[Scheduler Error] Aggregation failed:', err);
        }
    });
    // Weekly full re-sync on Sunday at 3:00 AM
    node_cron_1.default.schedule('0 3 * * 0', async () => {
        console.log('[Scheduler] Running weekly full aggregation...');
        try {
            const institutions = await prisma_client_1.prisma.institution.findMany({ select: { id: true } });
            for (const inst of institutions) {
                await aggregation_service_1.AggregationService.syncAggregations(inst.id, 'FULL');
            }
            console.log('[Scheduler] Weekly aggregation complete.');
        }
        catch (err) {
            console.error('[Scheduler Error] Full aggregation failed:', err);
        }
    });
    console.log('[Scheduler] Cron jobs registered.');
};
exports.initScheduler = initScheduler;
