"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const identity_controller_1 = require("./identity.controller");
const user_management_controller_1 = require("./user-management.controller");
const rateLimiter_middleware_1 = require("../../core/middlewares/rateLimiter.middleware");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const identityRouter = (0, express_1.Router)();
// ===== PUBLIC AUTH ROUTES =====
identityRouter.post('/auth/login', rateLimiter_middleware_1.authRateLimiter, identity_controller_1.IdentityController.login);
identityRouter.post('/auth/refresh', identity_controller_1.IdentityController.refresh);
// ===== PROTECTED: PASSWORD MANAGEMENT =====
identityRouter.put('/auth/change-password', auth_middleware_1.authenticate, user_management_controller_1.UserManagementController.changePassword);
// ===== PROTECTED: ADMIN USER MANAGEMENT =====
identityRouter.get('/users', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.listUsers);
identityRouter.get('/users/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.getUserStats);
identityRouter.get('/users/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.getUser);
identityRouter.post('/users', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.createUser);
identityRouter.put('/users/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.updateUser);
identityRouter.put('/users/:id/reset-password', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.resetPassword);
identityRouter.put('/users/:id/toggle-active', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN', 'SUPERADMIN']), user_management_controller_1.UserManagementController.toggleActive);
exports.default = identityRouter;
