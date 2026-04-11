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

// Users
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

const userStatusSchema = z.object({ isActive: z.boolean() });
adminRouter.patch('/users/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), validateBody(userStatusSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.updateUserStatus(req.params.id, req.user!.id, req.user!.institutionId!, req.body.isActive);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Departments
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

// Subjects
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

// Batches
adminRouter.get('/batches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await AdminService.listBatches(req.query.courseId as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// Faculty-Subject Mappings
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

export { adminRouter };
