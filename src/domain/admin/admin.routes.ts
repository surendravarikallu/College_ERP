import { Router, Response, NextFunction } from 'express';
import { authenticateToken as authenticate, requireRole as authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { AdminService } from './admin.service';
import { z } from 'zod';

const adminRouter = Router();

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

// ═══ Users ═══

adminRouter.get('/users', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filters = {
      role: req.query.role as string,
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };
    const data = await AdminService.listUsers(req.user!.institutionId!, filters);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

adminRouter.get('/users/stats', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.getUserStats(req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const createUserSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(6),
  role: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  enrollmentNo: z.string().optional(),
  departmentId: z.string().optional(),
  batchId: z.string().optional(),
});

adminRouter.post('/users', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(createUserSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.createUser(req.body, req.user!.id, req.user!.institutionId!);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

const userStatusSchema = z.object({ isActive: z.boolean() });
adminRouter.patch('/users/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(userStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.updateUserStatus(req.params.id, req.user!.id, req.user!.institutionId!, req.body.isActive);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const resetPasswordSchema = z.object({ newPassword: z.string().min(6) });
adminRouter.post('/users/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(resetPasswordSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.resetUserPassword(req.params.id, req.body.newPassword, req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Settings ═══

adminRouter.get('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.getSettings(req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

adminRouter.put('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.updateSettings(req.user!.institutionId!, req.body, req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Departments ═══

adminRouter.get('/departments', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.listDepartments(req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const createDeptSchema = z.object({ name: z.string(), code: z.string() });
adminRouter.post('/departments', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(createDeptSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.createDepartment({ ...req.body, institutionId: req.user!.institutionId! }, req.user!.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Subjects ═══

adminRouter.get('/subjects', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.listSubjects(req.query.departmentId as string, req.query.semester ? parseInt(req.query.semester as string) : undefined);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

const createSubjectSchema = z.object({ name: z.string(), code: z.string(), departmentId: z.string(), semester: z.number().int().min(1).max(8), credits: z.number().optional(), isLab: z.boolean().optional() });
adminRouter.post('/subjects', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(createSubjectSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.createSubject(req.body, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Batches ═══

adminRouter.get('/batches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.listBatches(req.query.courseId as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Faculty-Subject Mappings ═══

const assignSubjectSchema = z.object({ facultyId: z.string(), subjectId: z.string(), batchId: z.string().optional(), semester: z.number().int(), academicYear: z.string() });
adminRouter.post('/faculty-subjects', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'HOD'), validateBody(assignSubjectSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.assignSubjectToFaculty(req.body, req.user!.id, req.user!.institutionId!);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

adminRouter.get('/my-subjects', authenticate, authorize('FACULTY', 'HOD'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const facultyId = req.user!.profileId;
    if (!facultyId) return res.status(403).json({ success: false, error: 'Faculty profile not found.' });
    
    const data = await AdminService.getMySubjects(facultyId, req.query.academicYear as string, req.query.semester ? parseInt(req.query.semester as string) : undefined);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

adminRouter.get('/students-by-subject/:subjectId', authenticate, authorize('FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.getStudentsBySubject(req.params.subjectId, req.query.batchId as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ═══ Reset Password ═══
adminRouter.patch('/users/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bcrypt = await import('bcrypt');
      const { prisma } = await import('../../core/database/prisma.client');
      const { AuditService } = await import('../audit/audit.service');
      const { newPassword } = z.object({ newPassword: z.string().min(8) }).parse(req.body);
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
      await AuditService.log(req.user!.id, 'ADMIN_PASSWORD_RESET', 'User', req.params.id);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) { next(err); }
  }
);

// ═══ Settings ═══
adminRouter.get('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../../core/database/prisma.client');
      const settings = await prisma.settings.findMany({
        where: { institutionId: req.user!.institutionId! },
      });
      const configMap: Record<string, any> = {};
      settings.forEach((s: any) => {
        configMap[s.key] = s.value === 'true' ? true
          : s.value === 'false' ? false
          : s.value;
      });
      res.json({ success: true, data: configMap });
    } catch (err) { next(err); }
  }
);

adminRouter.put('/settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { prisma } = await import('../../core/database/prisma.client');
      const { AuditService } = await import('../audit/audit.service');
      const institutionId = req.user!.institutionId!;
      const entries = Object.entries(req.body);
      for (const [key, value] of entries) {
        const crypto = await import('crypto');
        await prisma.settings.upsert({
          where: { institutionId_key: { institutionId, key } },
          create: { id: crypto.randomUUID(), institutionId, key, value: String(value) },
          update: { value: String(value) },
        });
      }
      await AuditService.log(req.user!.id, 'SETTINGS_UPDATED', 'Settings', institutionId, null, req.body);
      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (err) { next(err); }
  }
);

export { adminRouter };
