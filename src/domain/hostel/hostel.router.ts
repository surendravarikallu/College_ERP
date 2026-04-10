import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { HostelService } from './hostel.service';

const hostelRouter = Router();

hostelRouter.post('/blocks', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOSTEL_WARDEN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HostelService.createBlock(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.get('/blocks', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HostelService.listBlocks();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.post('/rooms', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOSTEL_WARDEN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HostelService.createRoom(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.get('/rooms', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { blockId } = req.query;
      const data = await HostelService.listRooms(blockId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.post('/allocate', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOSTEL_WARDEN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HostelService.allocateRoom(req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.post('/deallocate', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOSTEL_WARDEN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });
      const data = await HostelService.deallocateRoom(studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

hostelRouter.get('/stats', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'HOSTEL_WARDEN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await HostelService.getStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default hostelRouter;
