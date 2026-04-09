import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma.client';

export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only target Mutative REST actions natively
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const originalSend = res.send;
    
    // Intercept outbound success signals mimicking Phase 3 logic specifically tracking UUID mappings
    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        
        const correlationId = res.getHeader('X-Correlation-ID') as string;
        // Extrapolate payload data without blocking outgoing network hooks
        setImmediate(async () => {
          try {
            await prisma.auditLog.create({
              data: {
                institutionId: req.user?.institutionId || 'SYSTEM',
                userId: req.user?.id,
                action: `${req.method}_${req.originalUrl.split('?')[0]}`,
                resourceTable: 'MIXED_API_CALL',
                resourceId: 'NA',
                newValues: ['POST','PUT','PATCH'].includes(req.method) ? req.body : null,
                correlationId
              }
            });
          } catch(e) { console.error('[Audit Error] Failed to persist trace logic', e); }
        });
      }
      return originalSend.call(this, body);
    };
  }
  next();
};
