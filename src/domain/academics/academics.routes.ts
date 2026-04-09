import { Router } from 'express';
import { AcademicsController } from './academics.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const academicsRouter = Router();

// All academics routes require authentication
academicsRouter.use(authenticate);

// ===== DEPARTMENTS =====
academicsRouter.post('/departments', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.createDepartment);
academicsRouter.get('/departments', AcademicsController.listDepartments);
academicsRouter.put('/departments/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.updateDepartment);
academicsRouter.delete('/departments/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.deleteDepartment);

// ===== COURSES =====
academicsRouter.post('/courses', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.createCourse);
academicsRouter.get('/courses', AcademicsController.listCourses);
academicsRouter.put('/courses/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.updateCourse);
academicsRouter.delete('/courses/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.deleteCourse);

// ===== BATCHES =====
academicsRouter.post('/batches', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.createBatch);
academicsRouter.get('/batches', AcademicsController.listBatches);
academicsRouter.put('/batches/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.updateBatch);
academicsRouter.delete('/batches/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.deleteBatch);

// ===== SUBJECTS =====
academicsRouter.post('/subjects', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.createSubject);
academicsRouter.get('/subjects', AcademicsController.listSubjects);
academicsRouter.put('/subjects/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.updateSubject);
academicsRouter.delete('/subjects/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.deleteSubject);

// ===== TEACHING ALLOCATIONS =====
academicsRouter.post('/allocations', authorize(['ADMIN', 'SUPERADMIN', 'HOD']), AcademicsController.createAllocation);
academicsRouter.get('/allocations', AcademicsController.listAllocations);
academicsRouter.delete('/allocations/:id', authorize(['ADMIN', 'SUPERADMIN', 'HOD']), AcademicsController.deleteAllocation);

// ===== TIMETABLE =====
academicsRouter.post('/timetable', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.createTimeSlot);
academicsRouter.get('/timetable', AcademicsController.listTimeSlots);
academicsRouter.put('/timetable/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.updateTimeSlot);
academicsRouter.delete('/timetable/:id', authorize(['ADMIN', 'SUPERADMIN']), AcademicsController.deleteTimeSlot);

export default academicsRouter;
