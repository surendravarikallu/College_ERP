import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AnalyticsService } from './analytics.service';

const analyticsRouter = Router();

// GET /api/v1/analytics/dashboard/admin
analyticsRouter.get('/dashboard/admin', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'PRINCIPAL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AnalyticsService.getOverviewStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/analytics/dashboard/student
analyticsRouter.get('/dashboard/student', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AnalyticsService.getStudentDashboard(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/analytics/dashboard/faculty
analyticsRouter.get('/dashboard/faculty', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AnalyticsService.getFacultyDashboard(req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/analytics/attendance-trends
analyticsRouter.get('/attendance-trends', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AnalyticsService.getAttendanceTrends();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/analytics/exam-performance
analyticsRouter.get('/exam-performance', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AnalyticsService.getExamPerformance();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default analyticsRouter;
