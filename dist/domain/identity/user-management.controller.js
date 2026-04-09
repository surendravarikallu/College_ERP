"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementController = void 0;
const user_management_service_1 = require("./user-management.service");
class UserManagementController {
    static async createUser(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.createUser(req.tenantId, req.body);
            res.status(201).json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async listUsers(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.listUsers(req.tenantId, {
                role: req.query.role,
                search: req.query.search,
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 25,
            });
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getUser(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.getUser(req.tenantId, req.params.id);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async updateUser(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.updateUser(req.tenantId, req.params.id, req.body);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async resetPassword(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.resetPassword(req.tenantId, req.params.id, req.body.newPassword);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async changePassword(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async toggleActive(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.toggleActive(req.tenantId, req.params.id);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
    static async getUserStats(req, res, next) {
        try {
            const data = await user_management_service_1.UserManagementService.getUserStats(req.tenantId);
            res.json({ success: true, data });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.UserManagementController = UserManagementController;
