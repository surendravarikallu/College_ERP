import { Router, Response, NextFunction, raw } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { FinanceService } from './finance.service';

const financeRouter = Router();

// POST /api/v1/fees/structures — Create fee structure
financeRouter.post('/structures', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.createFeeStructure(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/structures — List fee structures
financeRouter.get('/structures', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { academicYear } = req.query;
      const data = await FinanceService.listFeeStructures(academicYear as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/fees/invoices — Generate invoices
financeRouter.post('/invoices', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { feeStructureId, studentIds } = req.body;
      if (!feeStructureId || !studentIds?.length) {
        return res.status(400).json({ success: false, error: 'feeStructureId and studentIds are required' });
      }
      const data = await FinanceService.generateInvoices({ feeStructureId, studentIds, academicYear: req.body.academicYear, semester: req.body.semester });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/dues — Get fee dues
financeRouter.get('/dues', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.query;
      const data = await FinanceService.getFeeDues(studentId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/my — Student's own invoices
financeRouter.get('/my', authenticateToken, requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.getStudentInvoices(req.user!.profileId || req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/invoices/student/:studentId — Admin view of student invoices
financeRouter.get('/invoices/student/:studentId', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'HOD'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.getStudentInvoices(req.params.studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/fees/payment/initiate — Initiate payment
financeRouter.post('/payment/initiate', authenticateToken, requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ success: false, error: 'invoiceId is required' });
      const data = await FinanceService.initiatePayment(invoiceId, req.user!.profileId || req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/fees/payment/webhook — Razorpay webhook (raw body)
financeRouter.post('/payment/webhook', raw({ type: 'application/json' }),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) return res.status(400).json({ error: 'Missing signature' });
      const result = await FinanceService.verifyWebhook(req.body, signature);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/receipt/:invoiceId — Download receipt PDF
financeRouter.get('/receipt/:invoiceId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const buffer = await FinanceService.generateReceipt(req.params.invoiceId);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=receipt-${req.params.invoiceId}.pdf` });
      res.send(buffer);
    } catch (err) { next(err); }
  }
);

export default financeRouter;
