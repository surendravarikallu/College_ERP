import { Router } from 'express';
import { FinanceController } from './finance.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const financeRouter = Router();

/** Initiate Payment Flow — Student Only */
financeRouter.post(
  '/invoices/:id/pay',
  authenticate,
  authorize(['STUDENT']),
  FinanceController.initiatePayment
);

/** Fetch My Invoices — Student Only */
financeRouter.get(
  '/invoices',
  authenticate,
  authorize(['STUDENT']),
  FinanceController.getInvoices
);

/** Razorpay Webhook — Public with HMAC Signature Verification */
financeRouter.post('/webhook/:institutionId', FinanceController.handleRazorpayWebhook);

export default financeRouter;
