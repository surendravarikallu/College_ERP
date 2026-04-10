import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../../core/middlewares/auth.middleware';
import { NotificationService } from './notification.service';

const notificationRouter = Router();

// GET /api/v1/notifications
notificationRouter.get('/', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await NotificationService.getNotifications(
      req.user!.id,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 20
    );
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/v1/notifications/unread-count
notificationRouter.get('/unread-count', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await NotificationService.getUnreadCount(req.user!.id);
    res.json({ success: true, count });
  } catch (err) { next(err); }
});

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PATCH /api/v1/notifications/read-all
notificationRouter.patch('/read-all', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default notificationRouter;
