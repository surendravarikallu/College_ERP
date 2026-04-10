import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from '../cache/redis.service';
import jwt from 'jsonwebtoken';

let io: Server;

export const setupSocketGateway = (httpServer: any) => {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling (PM2 cluster mode)
  try {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    pubClient.on('error', (err) => console.error('[Socket Redis Pub Error]', err.message));
    subClient.on('error', (err) => console.error('[Socket Redis Sub Error]', err.message));
    io.adapter(createAdapter(pubClient, subClient));
  } catch (err) {
    console.warn('[Socket Adapter] Redis not available, falling back to local adapter.');
  }

  // JWT Authentication for WebSocket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['bearer'];
    if (!token) return next(new Error('Authentication required.'));

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-dev-key');
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Join user-specific room for targeted notifications
    socket.join(`user:${user.id}`);

    // Role-based rooms
    socket.join(`role:${user.role}`);

    // Attendance live session room
    socket.on('join_attendance_room', (roomId: string) => {
      socket.join(`attendance:${roomId}`);
    });

    console.log(`[Socket] User ${user.id} connected (role: ${user.role})`);

    // Token expiry revalidation every 15 minutes
    const tick = setInterval(() => {
      const currentTs = Math.floor(Date.now() / 1000);
      if (currentTs > user.exp) socket.disconnect(true);
    }, 15 * 60 * 1000);

    socket.on('disconnect', () => clearInterval(tick));
  });

  return io;
};

/**
 * Get the Socket.IO server instance for emitting events from services.
 */
export const getSocketIO = () => io;
