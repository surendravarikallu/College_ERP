import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage<Map<string, string>>();

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  res.setHeader('X-Correlation-ID', correlationId);

  const store = new Map<string, string>();
  store.set('correlationId', correlationId);
  store.set('ip', req.ip || req.socket?.remoteAddress || '127.0.0.1');

  requestContext.run(store, () => next());
};
