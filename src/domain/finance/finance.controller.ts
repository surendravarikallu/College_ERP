import { Request, Response, NextFunction } from 'express';
import { FinanceService } from './finance.service';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export class FinanceController {
  
  /** POST /finance/invoices/:id/pay — Initiate payment flow */
  static async initiatePayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invoiceId = req.params.id;
      const order = await FinanceService.initiatePayment(invoiceId);
      res.status(200).json({ success: true, data: order });
    } catch (err) { next(err); }
  }

  /** POST /finance/webhook/:institutionId — Handle Razorpay payment captured events */
  static async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = req.body; 
      const signature = req.headers['x-razorpay-signature'] as string;
      const institutionId = req.params.institutionId;

      const data = await FinanceService.processRazorpayWebhook(institutionId, rawBody, signature);
      res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
  }

  /** GET /finance/invoices — Fetch current student invoices */
  static async getInvoices(req: AuthRequest, res: Response, next: NextFunction) {
    // Basic stub — in production this would fetch based on req.user.profileId
    res.status(200).json({ success: true, data: [] });
  }
}
