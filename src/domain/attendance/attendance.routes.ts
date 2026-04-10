import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AttendanceService } from './attendance.service';

const attendanceRouter = Router();

// POST /api/attendance/mark — FACULTY marks bulk attendance
attendanceRouter.post('/mark', authenticate, authorize(['FACULTY', 'HOD']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subjectId, date, hour, records } = req.body;
    if (!subjectId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'subjectId, date, and records[] are required' });
    }
    const result = await AttendanceService.markBulkAttendance(req.user!.id, subjectId, date, hour || 1, records);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/attendance/subject/:id — view attendance for a subject
attendanceRouter.get('/subject/:id', authenticate, authorize(['FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, fromDate, toDate } = req.query;
    const records = await AttendanceService.getAttendanceBySubject(
      req.params.id,
      date as string,
      fromDate as string,
      toDate as string
    );
    res.status(200).json({ success: true, data: records });
  } catch (err) { next(err); }
});

// GET /api/attendance/student/:id — student attendance summary
attendanceRouter.get('/student/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { semester, subjectId } = req.query;
    const data = await AttendanceService.getStudentAttendance(
      req.params.id,
      semester ? parseInt(semester as string) : undefined,
      subjectId as string
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

// PATCH /api/attendance/:id/correct — HOD/Admin corrects attendance
attendanceRouter.patch('/:id/correct', authenticate, authorize(['HOD', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, remark } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const result = await AttendanceService.correctAttendance(req.params.id, status, req.user!.id, remark, req);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/attendance/defaulters — students below threshold
attendanceRouter.get('/defaulters', authenticate, authorize(['HOD', 'ADMIN', 'SUPER_ADMIN', 'EXAM_CELL']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { departmentId, batchId, threshold } = req.query;
    const data = await AttendanceService.getAttendanceDefaulters(
      departmentId as string,
      batchId as string,
      threshold ? parseInt(threshold as string) : 75
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/attendance/report/monthly — monthly report
attendanceRouter.get('/report/monthly', authenticate, authorize(['HOD', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { departmentId, batchId, month, year } = req.query;
    const data = await AttendanceService.getMonthlyReport(
      departmentId as string,
      batchId as string,
      month ? parseInt(month as string) : undefined,
      year ? parseInt(year as string) : undefined
    );
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
});

export default attendanceRouter;
