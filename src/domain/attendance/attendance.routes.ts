import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AttendanceService } from './attendance.service';

const attendanceRouter = Router();

// POST /api/v1/attendance/mark — Faculty marks attendance
attendanceRouter.post('/mark', authenticateToken, requireRole('FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { subjectId, date, hour, records } = req.body;
      if (!subjectId || !date || !records?.length) {
        return res.status(400).json({ success: false, error: 'subjectId, date, and records are required' });
      }
      const result = await AttendanceService.markBulkAttendance(req.user!.id, subjectId, date, hour || 1, records);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/attendance/subject/:subjectId — Get attendance by subject
attendanceRouter.get('/subject/:subjectId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { date, fromDate, toDate } = req.query;
      const data = await AttendanceService.getAttendanceBySubject(
        req.params.subjectId,
        date as string,
        fromDate as string,
        toDate as string,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/attendance/student/:studentId — Get student attendance
attendanceRouter.get('/student/:studentId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { semester, subjectId } = req.query;
      const data = await AttendanceService.getStudentAttendance(
        req.params.studentId,
        semester ? parseInt(semester as string) : undefined,
        subjectId as string,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/attendance/my — Current student's attendance
attendanceRouter.get('/my', authenticateToken, requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await AttendanceService.getStudentAttendance(req.user!.profileId || req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// PATCH /api/v1/attendance/:id/correct — HOD/Admin corrects attendance
attendanceRouter.patch('/:id/correct', authenticateToken, requireRole('HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, remark } = req.body;
      if (!status) return res.status(400).json({ success: false, error: 'Status is required' });
      const data = await AttendanceService.correctAttendance(req.params.id, status, req.user!.id, remark, req);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/attendance/defaulters
attendanceRouter.get('/defaulters', authenticateToken, requireRole('HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'FACULTY'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { departmentId, batchId, threshold } = req.query;
      const data = await AttendanceService.getAttendanceDefaulters(
        departmentId as string,
        batchId as string,
        threshold ? parseInt(threshold as string) : undefined,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/attendance/report/monthly
attendanceRouter.get('/report/monthly', authenticateToken, requireRole('HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { departmentId, batchId, month, year } = req.query;
      const data = await AttendanceService.getMonthlyReport(
        departmentId as string, batchId as string,
        month ? parseInt(month as string) : undefined,
        year ? parseInt(year as string) : undefined,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default attendanceRouter;
