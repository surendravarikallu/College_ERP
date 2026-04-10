import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AuditService } from './audit.service';

const auditRouter = Router();

// GET /api/audit/logs
auditRouter.get('/logs', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, resource, action, from, to, page, limit } = req.query;

    const result = await AuditService.getAuditLogs({
      userId: userId as string,
      resourceTable: resource as string,
      action: action as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 25,
    });

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default auditRouter;
