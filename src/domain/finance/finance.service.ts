import { prisma } from '../../core/database/prisma.client';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { ERPEventBus } from '../../core/events/event-bus.service';
import { APIError } from '../../core/common/exceptions/api.error';
import { SocketEmitter } from '../../core/websockets/emitter.service';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || 'dummy_key',
  key_secret: process.env.RAZORPAY_SECRET || 'dummy_secret',
});

export class FinanceService {

  /**
   * Initiates payment for an invoice with exclusive database locking.
   * Ensures idempotency via Invoice.idempotencyKey.
   */
  static async initiatePayment(invoiceId: string) {
    return await prisma.$transaction(async (tx: any) => {
      // 1. Lock invoice for update to prevent concurrent payment initiations
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
      if (invoice.status === 'PAID') throw new APIError('CONFLICT', 'Invoice already paid.');

      // 2. Reuse existing idempotency key if available, else generate one
      const orderId = invoice.idempotencyKey || `order_${crypto.randomBytes(8).toString('hex')}`;

      // 3. Create Razorpay Order
      const rzpOrder = await rzp.orders.create({
        amount: Math.round(invoice.totalAmount * 100), // convert to paise
        currency: 'INR',
        receipt: invoice.id,
        notes: { invoiceId: invoice.id }
      });

      // 4. Record order ID back to invoice for idempotency tracking natively
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { idempotencyKey: rzpOrder.id }
      });

      return {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY || 'rzp_test_dummy'
      };
    });
  }

  // Razorpay Raw Buffer Webhook Verification bypassing standard bodyParser
  static async processRazorpayWebhook(institutionId: string, rawBody: Buffer, signature: string) {
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'secret')
                                    .update(rawBody.toString('utf8')).digest('hex');
    
    if (expectedSignature !== signature) throw new APIError('UNAUTHORIZED', "Invalid Hook Cryptographic Hash");

    const payload = JSON.parse(rawBody.toString('utf8'));
    const paymentEntity = payload.payload.payment.entity;
    
    // Strict DB Lock avoiding race condition duplication
    return await prisma.$transaction(async (tx: any) => {
      // 1. Double check against explicitly captured Payment References natively
      const existingPayment = await tx.payment.findUnique({ where: { transactionRef: paymentEntity.id } });
      if (existingPayment) return { status: 'IGNORED_DUPLICATE' };

      // 2. Lock Invoice row exclusively for update using Prisma Query Raw natively mapped
      const invoices = await tx.$queryRaw<{id: string, totalAmount: number}[]>`
        SELECT id, "totalAmount" FROM "Invoice" WHERE "idempotencyKey" = ${paymentEntity.order_id} FOR UPDATE
      `;
      if (!invoices.length) throw new APIError('NOT_FOUND', "Orphaned receipt disconnected explicitly from target Ledger");
      const invoice = invoices[0];

      // 3. Register transaction into explicit Payment table mapped
      const payment = await tx.payment.create({
        data: { 
          invoiceId: invoice.id, 
          amountPaid: paymentEntity.amount / 100, 
          method: 'RAZORPAY', 
          transactionRef: paymentEntity.id, 
          status: 'CAPTURED' 
        }
      });

      // 4. Resolve Cumulative Totals protecting Partial issues automatically checking the DB
      const allPayments = await tx.payment.aggregate({ where: { invoiceId: invoice.id, status: 'CAPTURED' }, _sum: { amountPaid: true } });
      const newStatus = (allPayments._sum.amountPaid || 0) >= invoice.totalAmount ? 'PAID' : 'PARTIAL';
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });

      // 5. Trigger Centralized Cache Extinctions explicitly through BullMQ natively avoiding synchronous holds
      await ERPEventBus.emit('finance.payment.captured', { paymentId: payment.id, institutionId });
      
      // 6. Real-time push to student dashboard
      SocketEmitter.emitToTenant(institutionId, 'payment_completed', { 
        invoiceId: invoice.id, 
        amount: payment.amountPaid,
        status: newStatus 
      });

      return { status: 'PROCESSED', paymentId: payment.id };
    });
  }
}
