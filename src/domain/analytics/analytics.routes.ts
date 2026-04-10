import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AnalyticsService } from './analytics.service';

const analyticsRouter = Router();

analyticsRouter.get('/overview', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getOverviewStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

analyticsRouter.get('/attendance-trends', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOD']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getAttendanceTrends();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

analyticsRouter.get('/exam-performance', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOD', 'EXAM_CELL']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AnalyticsService.getExamPerformance();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default analyticsRouter;
