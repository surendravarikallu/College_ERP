import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Middlewares
import { tracingMiddleware } from './core/middlewares/tracing.middleware';
import { globalRateLimiter } from './core/middlewares/rateLimiter.middleware';
import { paginationGuard } from './core/middlewares/pagination.middleware';
import { globalErrorFilter } from './core/common/exceptions/api.error';
import { auditMiddleware } from './core/middlewares/audit.middleware';
import { initScheduler } from './core/scheduler';

// Core
import { configureWebSockets } from './core/websockets/gateway';
import mainRouter from './domain/routes';

const app = express();
const httpServer = createServer(app);

// 1. Hardened Global Security Layers
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ 
  origin: (origin, callback) => callback(null, true), // Dynamic Origin for LAN/Multiple IPs
  credentials: true 
}));
app.use(compression());

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Core Operational Hooks
app.use((req, res, next) => { next(); });
app.use('/api', globalRateLimiter);
app.use('/api', paginationGuard);
app.use('/api', auditMiddleware);

// 3. API Sub-Router Binding
app.use('/api/v1', mainRouter);

// 4. Global Error Filter (must be AFTER routes)
app.use(globalErrorFilter);

// 5. Single-Port Front-End Proxy
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// 6. Websocket Attachment
const io = configureWebSockets(httpServer);
import { SocketEmitter } from './core/websockets/emitter.service';
SocketEmitter.setIo(io);

const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[ERP Core] Target multiplexer bound on 0.0.0.0:${PORT} (LAN Ready)`);
    initScheduler();
});
