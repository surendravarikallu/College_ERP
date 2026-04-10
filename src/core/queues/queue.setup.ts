import { Queue } from 'bullmq';
import { redisClient } from '../cache/redis.service';

const connection = redisClient;

export const emailQueue = new Queue('EmailQueue', { connection });
export const notificationQueue = new Queue('NotificationQueue', { connection });
export const attendanceAlertQueue = new Queue('AttendanceAlertQueue', { connection });
export const reportQueue = new Queue('ReportQueue', { connection });
