import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { AcademicsService } from './academics.service';

export class AcademicsController {

  // ===== DEPARTMENTS =====
  static async createDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createDepartment(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listDepartments(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listDepartments(req.tenantId!) }); } catch (e) { next(e); }
  }
  static async updateDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.updateDepartment(req.tenantId!, req.params.id, req.body) }); } catch (e) { next(e); }
  }
  static async deleteDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteDepartment(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }

  // ===== COURSES =====
  static async createCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createCourse(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listCourses(req.tenantId!, req.query.departmentId as string) }); } catch (e) { next(e); }
  }
  static async updateCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.updateCourse(req.tenantId!, req.params.id, req.body) }); } catch (e) { next(e); }
  }
  static async deleteCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteCourse(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }

  // ===== BATCHES =====
  static async createBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createBatch(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listBatches(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listBatches(req.tenantId!, req.query.courseId as string) }); } catch (e) { next(e); }
  }
  static async updateBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.updateBatch(req.tenantId!, req.params.id, req.body) }); } catch (e) { next(e); }
  }
  static async deleteBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteBatch(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }

  // ===== SUBJECTS =====
  static async createSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createSubject(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listSubjects(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listSubjects(req.tenantId!, req.query.courseId as string) }); } catch (e) { next(e); }
  }
  static async updateSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.updateSubject(req.tenantId!, req.params.id, req.body) }); } catch (e) { next(e); }
  }
  static async deleteSubject(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteSubject(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }

  // ===== TEACHING ALLOCATIONS =====
  static async createAllocation(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createTeachingAllocation(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listAllocations(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listTeachingAllocations(req.tenantId!) }); } catch (e) { next(e); }
  }
  static async deleteAllocation(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteTeachingAllocation(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }

  // ===== TIMETABLE =====
  static async createTimeSlot(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await AcademicsService.createTimeSlot(req.tenantId!, req.body) }); } catch (e) { next(e); }
  }
  static async listTimeSlots(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.listTimeSlots(req.tenantId!, req.query.batchId as string) }); } catch (e) { next(e); }
  }
  static async updateTimeSlot(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.updateTimeSlot(req.tenantId!, req.params.id, req.body) }); } catch (e) { next(e); }
  }
  static async deleteTimeSlot(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AcademicsService.deleteTimeSlot(req.tenantId!, req.params.id) }); } catch (e) { next(e); }
  }
}
