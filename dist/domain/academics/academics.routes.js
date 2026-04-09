"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const academics_controller_1 = require("./academics.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const academicsRouter = (0, express_1.Router)();
// All academics routes require authentication
academicsRouter.use(auth_middleware_1.authenticate);
// ===== DEPARTMENTS =====
academicsRouter.post('/departments', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.createDepartment);
academicsRouter.get('/departments', academics_controller_1.AcademicsController.listDepartments);
academicsRouter.put('/departments/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.updateDepartment);
academicsRouter.delete('/departments/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.deleteDepartment);
// ===== COURSES =====
academicsRouter.post('/courses', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.createCourse);
academicsRouter.get('/courses', academics_controller_1.AcademicsController.listCourses);
academicsRouter.put('/courses/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.updateCourse);
academicsRouter.delete('/courses/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.deleteCourse);
// ===== BATCHES =====
academicsRouter.post('/batches', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.createBatch);
academicsRouter.get('/batches', academics_controller_1.AcademicsController.listBatches);
academicsRouter.put('/batches/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.updateBatch);
academicsRouter.delete('/batches/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.deleteBatch);
// ===== SUBJECTS =====
academicsRouter.post('/subjects', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.createSubject);
academicsRouter.get('/subjects', academics_controller_1.AcademicsController.listSubjects);
academicsRouter.put('/subjects/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.updateSubject);
academicsRouter.delete('/subjects/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.deleteSubject);
// ===== TEACHING ALLOCATIONS =====
academicsRouter.post('/allocations', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'HOD']), academics_controller_1.AcademicsController.createAllocation);
academicsRouter.get('/allocations', academics_controller_1.AcademicsController.listAllocations);
academicsRouter.delete('/allocations/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'HOD']), academics_controller_1.AcademicsController.deleteAllocation);
// ===== TIMETABLE =====
academicsRouter.post('/timetable', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.createTimeSlot);
academicsRouter.get('/timetable', academics_controller_1.AcademicsController.listTimeSlots);
academicsRouter.put('/timetable/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.updateTimeSlot);
academicsRouter.delete('/timetable/:id', (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), academics_controller_1.AcademicsController.deleteTimeSlot);
exports.default = academicsRouter;
