"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicsController = void 0;
const academics_service_1 = require("./academics.service");
class AcademicsController {
    // ===== DEPARTMENTS =====
    static async createDepartment(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createDepartment(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listDepartments(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listDepartments(req.tenantId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateDepartment(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.updateDepartment(req.tenantId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteDepartment(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteDepartment(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== COURSES =====
    static async createCourse(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createCourse(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listCourses(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listCourses(req.tenantId, req.query.departmentId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateCourse(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.updateCourse(req.tenantId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteCourse(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteCourse(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== BATCHES =====
    static async createBatch(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createBatch(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listBatches(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listBatches(req.tenantId, req.query.courseId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateBatch(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.updateBatch(req.tenantId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteBatch(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteBatch(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== SUBJECTS =====
    static async createSubject(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createSubject(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listSubjects(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listSubjects(req.tenantId, req.query.courseId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateSubject(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.updateSubject(req.tenantId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteSubject(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteSubject(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== TEACHING ALLOCATIONS =====
    static async createAllocation(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createTeachingAllocation(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listAllocations(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listTeachingAllocations(req.tenantId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteAllocation(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteTeachingAllocation(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== TIMETABLE =====
    static async createTimeSlot(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await academics_service_1.AcademicsService.createTimeSlot(req.tenantId, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listTimeSlots(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.listTimeSlots(req.tenantId, req.query.batchId) });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateTimeSlot(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.updateTimeSlot(req.tenantId, req.params.id, req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async deleteTimeSlot(req, res, next) {
        try {
            res.json({ success: true, data: await academics_service_1.AcademicsService.deleteTimeSlot(req.tenantId, req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.AcademicsController = AcademicsController;
