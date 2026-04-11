import { Router, Response, NextFunction } from 'express';
import { authenticateToken as authenticate, requireRole as authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { HRService } from './hr.service';
import { facultyAttendanceRouter } from './faculty-attendance.routes';
import { z } from 'zod';

const hrRouter = Router();

// Mount attendance sub-router
hrRouter.use('/faculty-attendance', facultyAttendanceRouter);

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

/**
 * --- Employee Profiles ---
 */
hrRouter.get('/employees', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'PRINCIPAL'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.getEmployeeProfile(req.params.facultyId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const profileSchema = z.object({
  employeeType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']),
  joiningDate: z.string(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional()
});

hrRouter.put('/employees/:facultyId/profile', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), validateBody(profileSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.upsertEmployeeProfile(req.params.facultyId, { ...req.body, joiningDate: new Date(req.body.joiningDate) }, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * --- Salary Structure ---
 */
const salarySchema = z.object({
  basicPay: z.number().min(0),
  hra: z.number().min(0),
  da: z.number().min(0),
  allowances: z.number().min(0),
  deductions: z.number().min(0),
  providentFund: z.number().min(0),
  professionalTax: z.number().min(0)
});

hrRouter.put('/salary-structure/:facultyId', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), validateBody(salarySchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.upsertSalaryStructure(req.params.facultyId, req.body, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

/**
 * --- Leave Management ---
 */
hrRouter.get('/leave', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.getEmployeeProfile(req.user!.id); // Mocking getLeaveApplications
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
});

const leaveAppSchema = z.object({
  leaveType: z.enum(['CASUAL', 'SICK', 'EARNED']),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().positive(),
  reason: z.string()
});

hrRouter.post('/leave/apply', authenticate, authorize('FACULTY'), validateBody(leaveAppSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const facultyId = req.user!.profileId;
    if (!facultyId) return res.status(403).json({ success: false, error: 'Faculty profile not found.' });
    
    const data = await HRService.applyForLeave(facultyId, req.body, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const leaveStatusSchema = z.object({
  status: z.enum(['LEAVE_APPROVED', 'LEAVE_REJECTED']),
  remarks: z.string()
});

hrRouter.post('/leave/:applicationId/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD'), validateBody(leaveStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.updateLeaveStatus(req.params.applicationId, req.body.status, req.body.remarks, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.post('/leave/:applicationId/reject', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'HOD'), validateBody(leaveStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.updateLeaveStatus(req.params.applicationId, 'LEAVE_REJECTED' as any, req.body.remarks, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.post('/leave/balance/init', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.initializeLeaveBalance(req.body.facultyId, new Date().getFullYear());
    res.json({ success: true, data });
  } catch (err) { next(err); }
});


/**
 * --- Payroll ---
 */
hrRouter.post('/payroll/generate', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR', 'ACCOUNTS'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);
    if (!month || !year) return res.status(400).json({ success: false, error: 'Month and year required.' });

    const data = await HRService.generatePayslip(req.body.facultyId, month, year, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.post('/payroll/generate-bulk', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.generatePayslip(req.body.facultyId || '', req.body.month, req.body.year, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.post('/payroll/:id/approve', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'PRINCIPAL'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.markPayslipPaid(req.params.id, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.post('/payroll/:id/mark-paid', authenticate, authorize('ADMIN', 'SUPER_ADMIN', 'HR'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await HRService.markPayslipPaid(req.params.id, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

hrRouter.get('/payroll/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: [] });
  } catch (err) { next(err); }
});

// Download PDF
hrRouter.get('/payroll/:id/pdf', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pdfPath = await HRService.generatePayslipPDF(req.params.id);
    res.json({ success: true, pdfPath });
  } catch (err) { next(err); }
});

export { hrRouter };
