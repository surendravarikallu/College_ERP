import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { OfficeService } from './office.service';
import multer from 'multer';

const officeRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /office/import — Bulk excel student import
officeRouter.post('/import', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });
      const data = await OfficeService.importStudentsFromExcel(req.file.buffer);
      res.json(data);
    } catch (err) { next(err); }
  }
);

// POST /office/admissions — Create single application
officeRouter.post('/admissions', authenticateToken, requireRole('ADMIN', 'STAFF'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Logic for single entry (Part 3)
    try {
       // Single entry implementation skipping for brevity or can be added
       res.status(501).json({ error: 'Not implemented: Use bulk import' });
    } catch (err) { next(err); }
  }
);

// GET /office/admissions — List applications
officeRouter.get('/admissions', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const data = await OfficeService.listApplications(status as any);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// PATCH /office/admissions/:id — Update admission status (APPLIED -> APPROVED -> ADMITTED)
officeRouter.patch('/admissions/:id', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const data = await OfficeService.updateAdmissionStatus(req.params.id, status, req.user!.institutionId!);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default officeRouter;
