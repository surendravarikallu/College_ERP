import { Router, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { cacheMiddleware } from '../../core/middlewares/cache.middleware';

const analyticsRouter = Router();

/**
 * GET /api/v1/analytics/dashboard/admin
 * Admin KPI overview — Global counts, revenue, and attendance trends.
 */
analyticsRouter.get(
  '/dashboard/admin',
  authenticate,
  authorize(['ADMIN', 'SUPERADMIN', 'PRINCIPAL']),
  cacheMiddleware('dash:admin', 300),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const institutionId = req.user!.institutionId;
      const data = await DashboardService.getAdminSummary(institutionId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/v1/analytics/dashboard/student
 * Student personal snapshot — Attendance, SGPA, Fees, and Today's Schedule.
 */
analyticsRouter.get(
  '/dashboard/student',
  authenticate,
  authorize(['STUDENT']),
  cacheMiddleware('dash:student', 300),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const studentId = req.user!.profileId; 
      if (!studentId) throw new Error('Unlinked profile');
      const data = await DashboardService.getStudentSummary(studentId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

/**
 * GET /api/v1/analytics/dashboard/faculty
 * Faculty workload snapshot — Classes, Grading Backlog.
 */
analyticsRouter.get(
  '/dashboard/faculty',
  authenticate,
  authorize(['FACULTY', 'HOD']),
  cacheMiddleware('dash:faculty', 300),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const facultyId = req.user!.profileId;
      if (!facultyId) throw new Error('Unlinked profile');
      const data = await DashboardService.getFacultySummary(facultyId);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default analyticsRouter;
