import cron from 'node-cron';
import { AggregationService } from '../domain/analytics/aggregation.service';
import { prisma } from './database/prisma.client';

/**
 * Centralized Cron Scheduler for periodic background tasks.
 * Runs aggregation jobs nightly and other maintenance tasks.
 */
export const initScheduler = () => {
  console.log('[Scheduler] Initializing cron jobs...');

  // Nightly aggregation at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Running nightly aggregation...');
    try {
      const institutions = await prisma.institution.findMany({ select: { id: true } });
      for (const inst of institutions) {
        await AggregationService.syncAggregations(inst.id, 'INCREMENTAL');
      }
      console.log('[Scheduler] Nightly aggregation complete.');
    } catch (err) {
      console.error('[Scheduler Error] Aggregation failed:', err);
    }
  });

  // Weekly full re-sync on Sunday at 3:00 AM
  cron.schedule('0 3 * * 0', async () => {
    console.log('[Scheduler] Running weekly full aggregation...');
    try {
      const institutions = await prisma.institution.findMany({ select: { id: true } });
      for (const inst of institutions) {
        await AggregationService.syncAggregations(inst.id, 'FULL');
      }
      console.log('[Scheduler] Weekly aggregation complete.');
    } catch (err) {
      console.error('[Scheduler Error] Full aggregation failed:', err);
    }
  });

  console.log('[Scheduler] Cron jobs registered.');
};
