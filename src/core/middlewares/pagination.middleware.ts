// src/core/middlewares/pagination.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const paginationGuard = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') {
    // 1. Edge Case: Negatives & NaN handling converting reliably to Int mapping
    let limit = parseInt(req.query.limit as string, 10);
    let page = parseInt(req.query.page as string, 10);

    // 2. Strict Hard Capping natively avoiding > 100 pull iterations
    if (isNaN(limit) || limit <= 0) limit = 20; 
    if (limit > 100) limit = 100;
    
    if (isNaN(page) || page <= 0) page = 1;

    // Mutate specifically protecting downstream generic Controllers natively mapped.
    req.query.limit = String(limit);
    req.query.page = String(page);
  }
  next();
};

// -------------------------------------------------------------
// src/core/middlewares/tracing.middleware.ts
// -------------------------------------------------------------
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// Extends deeply across Node allowing DB Loggers to extract correlationIds cleanly 
export const requestContext = new AsyncLocalStorage<Map<string, string>>();

export const tracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  res.setHeader('X-Correlation-ID', correlationId);

  const store = new Map<string, string>();
  store.set('correlationId', correlationId);
  // Optional pre-mapping of generic IP tracing 
  store.set('ip', req.ip || req.socket.remoteAddress || '127.0.0.1');

  requestContext.run(store, () => next());
};
