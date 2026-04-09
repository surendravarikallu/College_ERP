import { Router } from 'express';
import { IdentityController } from './identity.controller';
import { UserManagementController } from './user-management.controller';
import { authRateLimiter } from '../../core/middlewares/rateLimiter.middleware';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const identityRouter = Router();

// ===== PUBLIC AUTH ROUTES =====
identityRouter.post('/auth/login', authRateLimiter, IdentityController.login);
identityRouter.post('/auth/refresh', IdentityController.refresh);

// ===== PROTECTED: PASSWORD MANAGEMENT =====
identityRouter.put('/auth/change-password', authenticate, UserManagementController.changePassword);

// ===== PROTECTED: ADMIN USER MANAGEMENT =====
identityRouter.get('/users', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.listUsers);
identityRouter.get('/users/stats', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.getUserStats);
identityRouter.get('/users/:id', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.getUser);
identityRouter.post('/users', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.createUser);
identityRouter.put('/users/:id', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.updateUser);
identityRouter.put('/users/:id/reset-password', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.resetPassword);
identityRouter.put('/users/:id/toggle-active', authenticate, authorize(['ADMIN', 'SUPERADMIN']), UserManagementController.toggleActive);

export default identityRouter;
