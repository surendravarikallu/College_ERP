import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { LibraryService } from './library.service';

const libraryRouter = Router();

libraryRouter.post('/books', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'LIBRARIAN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await LibraryService.addBook(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

libraryRouter.get('/books', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { q, page, limit } = req.query;
      const data = await LibraryService.searchBooks(
        (q as string) || '',
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 25,
      );
      res.json({ success: true, ...data });
    } catch (err) { next(err); }
  }
);

libraryRouter.post('/issue', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'LIBRARIAN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await LibraryService.issueBook(req.body);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

libraryRouter.post('/return/:issueId', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'LIBRARIAN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await LibraryService.returnBook(req.params.issueId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

libraryRouter.post('/cards', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'LIBRARIAN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.body;
      if (!studentId) return res.status(400).json({ success: false, error: 'studentId is required' });
      const data = await LibraryService.createCard(studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

libraryRouter.get('/overdue', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'LIBRARIAN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await LibraryService.getOverdueBooks();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

libraryRouter.get('/stats', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await LibraryService.getStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default libraryRouter;
