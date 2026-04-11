import { Router, Response, NextFunction } from 'express';
import { authenticateToken as authenticate, requireRole as authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { FacultyAttendanceService } from './faculty-attendance.service';
import { z } from 'zod';

const facultyAttendanceRouter = Router();

const validateBody = (schema: z.ZodType<any>) => (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    next(error);
  }
};

const markAttendanceSchema = z.object({
  date: z.string(),
  records: z.array(z.object({
    facultyId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'OD', 'MEDICAL_LEAVE']),
    remark: z.string().optional()
  }))
});

// POST Mark Attendance
facultyAttendanceRouter.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), validateBody(markAttendanceSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await FacultyAttendanceService.markAttendance(
      req.body.records,
      req.body.date,
      req.user!.id,
      req.user!.institutionId!
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET Attendance by Date
facultyAttendanceRouter.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.query.date) return res.status(400).json({ success: false, error: 'Date is required.' });
    const data = await FacultyAttendanceService.getAttendanceByDate(
      req.query.date as string,
      req.query.departmentId as string
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET Individual Faculty Summary
facultyAttendanceRouter.get('/summary/:facultyId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'FACULTY'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await FacultyAttendanceService.getFacultyAttendanceSummary(req.params.facultyId, month, year);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET Department Summary
facultyAttendanceRouter.get('/department/:deptId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.query.date) return res.status(400).json({ success: false, error: 'Date is required.' });
    const data = await FacultyAttendanceService.getDepartmentAttendanceSummary(req.params.deptId, req.query.date as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export { facultyAttendanceRouter };
