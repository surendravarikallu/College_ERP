import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { UserManagementService } from './user-management.service';

export class UserManagementController {

  static async createUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.createUser(req.tenantId!, req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.listUsers(req.tenantId!, {
        role: req.query.role as string,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 25,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.getUser(req.tenantId!, req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.updateUser(req.tenantId!, req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.resetPassword(req.tenantId!, req.params.id, req.body.newPassword);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.changePassword(req.user!.id, req.body.oldPassword, req.body.newPassword);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async toggleActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.toggleActive(req.tenantId!, req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }

  static async getUserStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await UserManagementService.getUserStats(req.tenantId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  }
}
