"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_service_1 = require("./dashboard.service");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const cache_middleware_1 = require("../../core/middlewares/cache.middleware");
const analyticsRouter = (0, express_1.Router)();
/**
 * GET /api/v1/analytics/dashboard/admin
 * Admin KPI overview — Global counts, revenue, and attendance trends.
 */
analyticsRouter.get('/dashboard/admin', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN', 'PRINCIPAL']), (0, cache_middleware_1.cacheMiddleware)('dash:admin', 300), async (req, res, next) => {
    try {
        const institutionId = req.user.institutionId;
        const data = await dashboard_service_1.DashboardService.getAdminSummary(institutionId);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/analytics/dashboard/student
 * Student personal snapshot — Attendance, SGPA, Fees, and Today's Schedule.
 */
analyticsRouter.get('/dashboard/student', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['STUDENT']), (0, cache_middleware_1.cacheMiddleware)('dash:student', 300), async (req, res, next) => {
    try {
        const studentId = req.user.profileId;
        if (!studentId)
            throw new Error('Unlinked profile');
        const data = await dashboard_service_1.DashboardService.getStudentSummary(studentId);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/v1/analytics/dashboard/faculty
 * Faculty workload snapshot — Classes, Grading Backlog.
 */
analyticsRouter.get('/dashboard/faculty', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['FACULTY', 'HOD']), (0, cache_middleware_1.cacheMiddleware)('dash:faculty', 300), async (req, res, next) => {
    try {
        const facultyId = req.user.profileId;
        if (!facultyId)
            throw new Error('Unlinked profile');
        const data = await dashboard_service_1.DashboardService.getFacultySummary(facultyId);
        res.status(200).json({ success: true, data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = analyticsRouter;
