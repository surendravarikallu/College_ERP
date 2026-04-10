import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { HostelService, LibraryService, TransportService } from './operations.service';

const operationsRouter = Router();

// ═══════════ HOSTEL ═══════════
operationsRouter.post('/hostel/blocks', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOSTEL_WARDEN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await HostelService.createBlock(req.body) }); } catch (e) { next(e); }
});
operationsRouter.get('/hostel/blocks', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await HostelService.listBlocks() }); } catch (e) { next(e); }
});
operationsRouter.post('/hostel/rooms', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOSTEL_WARDEN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await HostelService.createRoom(req.body) }); } catch (e) { next(e); }
});
operationsRouter.get('/hostel/rooms', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await HostelService.listRooms(req.query.blockId as string) }); } catch (e) { next(e); }
});
operationsRouter.post('/hostel/allocate', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOSTEL_WARDEN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await HostelService.allocateRoom(req.body) }); } catch (e) { next(e); }
});
operationsRouter.post('/hostel/deallocate/:studentId', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'HOSTEL_WARDEN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await HostelService.deallocateRoom(req.params.studentId) }); } catch (e) { next(e); }
});
operationsRouter.get('/hostel/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await HostelService.getStats() }); } catch (e) { next(e); }
});

// ═══════════ LIBRARY ═══════════
operationsRouter.post('/library/books', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'LIBRARIAN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await LibraryService.addBook(req.body) }); } catch (e) { next(e); }
});
operationsRouter.get('/library/books', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q, page, limit } = req.query;
    res.json({ success: true, data: await LibraryService.searchBooks(q as string || '', parseInt(page as string) || 1, parseInt(limit as string) || 25) });
  } catch (e) { next(e); }
});
operationsRouter.post('/library/issue', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'LIBRARIAN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await LibraryService.issueBook(req.body) }); } catch (e) { next(e); }
});
operationsRouter.post('/library/return/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'LIBRARIAN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await LibraryService.returnBook(req.params.id) }); } catch (e) { next(e); }
});
operationsRouter.get('/library/overdue', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'LIBRARIAN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await LibraryService.getOverdueBooks() }); } catch (e) { next(e); }
});
operationsRouter.get('/library/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await LibraryService.getStats() }); } catch (e) { next(e); }
});

// ═══════════ TRANSPORT ═══════════
operationsRouter.post('/transport/routes', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await TransportService.createRoute(req.body) }); } catch (e) { next(e); }
});
operationsRouter.get('/transport/routes', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await TransportService.listRoutes() }); } catch (e) { next(e); }
});
operationsRouter.post('/transport/passes', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await TransportService.issuePass(req.body) }); } catch (e) { next(e); }
});
operationsRouter.delete('/transport/passes/:id', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await TransportService.revokePass(req.params.id) }); } catch (e) { next(e); }
});
operationsRouter.get('/transport/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await TransportService.getStats() }); } catch (e) { next(e); }
});

export default operationsRouter;
