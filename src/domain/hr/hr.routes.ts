import { Router, Response, NextFunction } from 'express';
import {
  authenticateToken as authenticate,
  requireRole as authorize,
  AuthRequest
} from '../../core/middlewares/auth.middleware';
import { HRService } from './hr.service';
import { facultyAttendanceRouter } from './faculty-attendance.routes';
import { z } from 'zod';

export const hrRouter = Router();

const vb = (schema: z.ZodType<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    try { req.body = schema.parse(req.body); next(); }
    catch (e) {
      if (e instanceof z.ZodError)
        return res.status(400).json({ success: false, errors: e.errors });
      next(e);
    }
  };

// ─── FACULTY ATTENDANCE (sub-router) ───────────────────────────────
hrRouter.use('/faculty-attendance', facultyAttendanceRouter);

// ─── EMPLOYEE PROFILES ─────────────────────────────────────────────
hrRouter.get('/employees',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'PRINCIPAL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.listEmployeeProfiles({
        departmentId: req.query.departmentId as string,
        employeeType: req.query.employeeType as string,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.get('/employees/:facultyId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.getEmployeeProfileByFacultyId(req.params.facultyId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

const profileSchema = z.object({
  employeeType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
  joiningDate: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

hrRouter.put('/employees/:facultyId/profile',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'),
  vb(profileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.upsertEmployeeProfile(
        req.params.facultyId,
        { ...req.body, joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : undefined },
        req.user!.id,
        req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

// ─── SALARY STRUCTURE ──────────────────────────────────────────────
const salarySchema = z.object({
  basicPay: z.number().min(0),
  hra: z.number().min(0).default(0),
  da: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  providentFund: z.number().min(0).default(0),
  professionalTax: z.number().min(0).default(0),
});

hrRouter.put('/salary-structure/:facultyId',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'ACCOUNTS'),
  vb(salarySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.upsertSalaryStructure(
        req.params.facultyId, req.body, req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.get('/salary-structure/:facultyId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.getEmployeeProfileByFacultyId(req.params.facultyId);
      res.json({ success: true, data: data.salaryStructure });
    } catch (e) { next(e); }
  }
);

// ─── LEAVE MANAGEMENT ──────────────────────────────────────────────
hrRouter.get('/leave',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD', 'PRINCIPAL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.getLeaveApplications({
        facultyId: req.query.facultyId as string,
        status: req.query.status as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

const leaveAppSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED']),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().positive(),
  reason: z.string().min(5),
});

hrRouter.post('/leave/apply',
  authenticate,
  vb(leaveAppSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../../core/database/prisma.client');
      const faculty = await (prisma.faculty as any).findUnique({ where: { userId: req.user!.id } });
      if (!faculty) return res.status(403).json({ success: false, error: 'Faculty profile not found.' });
      const data = await HRService.applyForLeave(
        faculty.id, req.body, req.user!.id, req.user!.institutionId!
      );
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }
);

const leaveStatusSchema = z.object({ remarks: z.string().optional() });

hrRouter.post('/leave/:applicationId/approve',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD', 'PRINCIPAL'),
  vb(leaveStatusSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.updateLeaveStatus(
        req.params.applicationId, 'LEAVE_APPROVED' as any,
        req.body.remarks || '', req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.post('/leave/:applicationId/reject',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD', 'PRINCIPAL'),
  vb(leaveStatusSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.updateLeaveStatus(
        req.params.applicationId, 'LEAVE_REJECTED' as any,
        req.body.remarks || '', req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.post('/leave/balance/init',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { facultyId, year } = z.object({
        facultyId: z.string(), year: z.number().int()
      }).parse(req.body);
      const data = await HRService.initializeLeaveBalance(facultyId, year);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

// ─── PAYROLL ───────────────────────────────────────────────────────
hrRouter.post('/payroll/generate',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { facultyId, month, year } = z.object({
        facultyId: z.string(),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2020),
      }).parse(req.body);
      const data = await HRService.generatePayslip(
        facultyId, month, year, req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.post('/payroll/generate-bulk',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { month, year, departmentId } = z.object({
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2020),
        departmentId: z.string().optional(),
      }).parse(req.body);
      const data = await HRService.generateBulkPayslips(
        month, year, departmentId, req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

// GET must come before /:id to avoid "history" being treated as an id
hrRouter.get('/payroll/history',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let facultyId = req.query.facultyId as string;
      if (!facultyId) {
        const { prisma } = await import('../../core/database/prisma.client');
        const faculty = await (prisma.faculty as any).findUnique({ where: { userId: req.user!.id } });
        facultyId = faculty?.id || '';
      }
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const data = await HRService.getPayslipHistory(facultyId || undefined, year);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.get('/payroll/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.getPayslipById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.post('/payroll/:id/approve',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'PRINCIPAL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.approvePayslip(
        req.params.id, req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.post('/payroll/:id/mark-paid',
  authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HRService.markPayslipPaid(
        req.params.id, req.user!.id, req.user!.institutionId!
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
);

hrRouter.get('/payroll/:id/pdf',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pdfPath = await HRService.generatePayslipPDF(req.params.id);
      res.json({ success: true, pdfPath });
    } catch (e) { next(e); }
  }
);

export default hrRouter;
