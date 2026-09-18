import { Router, Response, NextFunction, raw } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { FinanceService } from './finance.service';
import { prisma } from '../../core/database/prisma.client';

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

financeRouter.get('/receipt/:invoiceId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const isStaff = req.user!.role !== 'STUDENT';
      const buffer = await FinanceService.generateReceipt(req.params.invoiceId, isStaff);
      res.set({ 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename=receipt-${req.params.invoiceId}.pdf` 
      });
      res.send(buffer);
    } catch (err) { next(err); }
  }
);

// ── OFFLINE / CASH PAYMENT COLLECTION ────────────────────────────────────

// POST /api/v1/fees/collect — Record cash/cheque/DD payment (CASHIER/ADMIN)
financeRouter.post('/collect', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'CASHIER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        studentId, feeInvoiceId, academicYear, feeParticulars, period,
        amount, fineAmount, paymentMode, chequeNo, chequeDate, bankName,
        refNo, transactionId, narration, excessAmount, receiptDate,
      } = req.body;

      if (!studentId || !feeInvoiceId || !amount || !paymentMode) {
        return res.status(400).json({ success: false, error: 'studentId, feeInvoiceId, amount, paymentMode are required.' });
      }

      const data = await FinanceService.recordOfflinePayment(
        {
          studentId, feeInvoiceId, academicYear, feeParticulars, period,
          amount: parseFloat(amount), fineAmount: parseFloat(fineAmount || '0'),
          paymentMode, chequeNo, chequeDate, bankName, refNo, transactionId,
          narration, excessAmount: parseFloat(excessAmount || '0'), receiptDate,
        },
        req.user!.id,
        req.user!.institutionId!
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/student/:htNo/search — Search student by HT number
financeRouter.get('/student/:htNo/search', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'CASHIER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.searchStudentByHT(req.params.htNo, req.user!.institutionId!);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/student/:studentId/fee-card — Full fee card view
financeRouter.get('/student/:studentId/fee-card', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.getStudentFeeCard(req.params.studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/student/:studentId/payment-history — All receipts
financeRouter.get('/student/:studentId/payment-history', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.getStudentPaymentHistory(req.params.studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/my/fee-card — Student views own fee card
financeRouter.get('/my/fee-card', authenticateToken, requireRole('STUDENT'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
      if (!student) return res.status(404).json({ success: false, error: 'Student profile not found.' });
      const data = await FinanceService.getStudentFeeCard(student.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/receipt/:receiptId/kits-pdf — Download KITS format receipt PDF
financeRouter.get('/receipt/:receiptId/kits-pdf', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const buffer = await FinanceService.generateReceipt(req.params.receiptId, true);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=receipt-${req.params.receiptId}.pdf`,
      });
      res.send(buffer);
    } catch (err) { next(err); }
  }
);

// DELETE /api/v1/fees/receipt/:receiptId — Soft delete receipt
financeRouter.delete('/receipt/:receiptId', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ success: false, error: 'Reason is required for receipt deletion.' });
      const data = await FinanceService.deleteReceipt(req.params.receiptId, reason, req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/fees/collection-report — Admin collection report
financeRouter.get('/collection-report', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS', 'CASHIER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await FinanceService.getCollectionReport({
        institutionId: req.user!.institutionId!,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        paymentMode: req.query.paymentMode as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default financeRouter;
