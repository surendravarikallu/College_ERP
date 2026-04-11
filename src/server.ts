import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';

// Core
import { prisma } from './core/database/prisma.client';
import { redisClient } from './core/cache/redis.service';
import { globalErrorFilter } from './core/common/exceptions/api.error';
import { paginationGuard } from './core/middlewares/pagination.middleware';
import { tracingMiddleware } from './core/middlewares/tracing.middleware';
import { setupSocketGateway } from './core/websockets/gateway';
import { globalRateLimiter, authRateLimiter } from './core/middlewares/rateLimiter.middleware';

// Domain routes
import authRouter from './domain/auth/auth.router';
import auditRouter from './domain/audit/audit.router';
import attendanceRouter from './domain/attendance/attendance.routes';
import examsRouter from './domain/exams/exams.routes';
import financeRouter from './domain/finance/finance.routes';
import operationsRouter from './domain/operations/operations.routes';
import notificationRouter from './domain/notifications/notification.router';
import analyticsRouter from './domain/analytics/analytics.routes';
import hostelRouter from './domain/hostel/hostel.router';
import libraryRouter from './domain/library/library.router';
import { adminRouter } from './domain/admin/admin.routes';
import { hrRouter } from './domain/hr/hr.routes';

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '8091', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// ════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ════════════════════════════════════════════════
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors({
  origin: NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'http://localhost:8090'
    : true,
  credentials: true,
}));

// JSON body parsing (skip for webhook route which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/api/v1/fees/payment/webhook') return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(tracingMiddleware);
app.use(paginationGuard);
app.use(globalRateLimiter);

// ════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redisOk = redisClient.status === 'ready';
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisOk ? 'connected' : 'disconnected',
      },
    });
  } catch (err: any) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ════════════════════════════════════════════════
// API ROUTES
// ════════════════════════════════════════════════
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/identity/auth', authRouter); // Legacy compat
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/exams', examsRouter);
app.use('/api/v1/fees', financeRouter);
app.use('/api/v1/operations', operationsRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/hostel', hostelRouter);
app.use('/api/v1/library', libraryRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/hr', hrRouter);

// Mount exam cell routes if present
try {
  const examcellRoutes = require('./domain/examcell/examcell.routes').default;
  if (examcellRoutes) app.use('/api/ec', examcellRoutes);
} catch { /* Exam cell module optional */ }

try {
  const autonomousRoutes = require('./domain/examcell/autonomous.routes').default;
  if (autonomousRoutes) app.use('/api/ec', autonomousRoutes);
} catch { /* Autonomous routes optional */ }

// ════════════════════════════════════════════════
// STATIC CLIENT (SPA)
// ════════════════════════════════════════════════
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/') || req.path === '/health') return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Frontend not built. Run: npm run build --prefix client' });
  });
});

// ════════════════════════════════════════════════
// ERROR HANDLER
// ════════════════════════════════════════════════
app.use(globalErrorFilter);

// ════════════════════════════════════════════════
// SOCKET.IO
// ════════════════════════════════════════════════
setupSocketGateway(httpServer);

import { startWorkers } from './domain/queues/workers';

// ════════════════════════════════════════════════
// STARTUP
// ════════════════════════════════════════════════
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║  🎓 Kits Akshar College ERP — ${NODE_ENV.toUpperCase()}             ║
  ║  Port: ${PORT}                                       ║
  ║  Health: http://localhost:${PORT}/health               ║
  ╚════════════════════════════════════════════════════╝
  `);
  
  // Start background queue workers
  if (NODE_ENV !== 'test') {
    startWorkers();
    console.log('[Workers] BullMQ workers started.');
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[Shutdown] Closing connections...');
  await prisma.$disconnect();
  redisClient.quit();
  httpServer.close(() => {
    console.log('[Shutdown] Server closed.');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, httpServer };
