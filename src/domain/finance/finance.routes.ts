import { Router, Response, NextFunction } from 'express';
import express from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { FinanceService } from './finance.service';

const financeRouter = Router();

// POST /api/fees/structures
financeRouter.post('/structures', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await FinanceService.createFeeStructure(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/fees/structures
financeRouter.get('/structures', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await FinanceService.listFeeStructures(req.query.academicYear as string);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/fees/invoices/generate
financeRouter.post('/invoices/generate', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { feeStructureId, studentIds } = req.body;
    if (!feeStructureId || !studentIds) {
      return res.status(400).json({ success: false, error: 'feeStructureId and studentIds[] required' });
    }
    const result = await FinanceService.generateInvoices(feeStructureId, studentIds);
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/fees/invoices/student/:id
financeRouter.get('/invoices/student/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await FinanceService.getStudentInvoices(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/fees/payment/initiate
financeRouter.post('/payment/initiate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ success: false, error: 'invoiceId required' });

    // Resolve student ID from user
    const studentId = req.user!.profileId || '';
    const result = await FinanceService.initiatePayment(invoiceId, studentId);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
});

// POST /api/fees/payment/webhook — PUBLIC (verified by signature)
financeRouter.post('/payment/webhook',
  express.raw({ type: 'application/json' }),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) return res.status(400).json({ error: 'Missing signature' });

      const result = await FinanceService.verifyWebhook(req.body, signature);
      res.status(200).json(result);
    } catch (err) { next(err); }
  }
);

// GET /api/fees/dues
financeRouter.get('/dues', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'ACCOUNTS']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await FinanceService.getFeeDues(req.query.studentId as string);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/fees/receipt/:invoiceId
financeRouter.get('/receipt/:invoiceId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const buffer = await FinanceService.generateReceipt(req.params.invoiceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${req.params.invoiceId}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
});

export default financeRouter;
