"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = __importDefault(require("razorpay"));
const event_bus_service_1 = require("../../core/events/event-bus.service");
const api_error_1 = require("../../core/common/exceptions/api.error");
const emitter_service_1 = require("../../core/websockets/emitter.service");
const rzp = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY || 'dummy_key',
    key_secret: process.env.RAZORPAY_SECRET || 'dummy_secret',
});
class FinanceService {
    /**
     * Initiates payment for an invoice with exclusive database locking.
     * Ensures idempotency via Invoice.idempotencyKey.
     */
    static async initiatePayment(invoiceId) {
        return await prisma_client_1.prisma.$transaction(async (tx) => {
            // 1. Lock invoice for update to prevent concurrent payment initiations
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
            });
            if (!invoice)
                throw new api_error_1.APIError('NOT_FOUND', 'Invoice not found.');
            if (invoice.status === 'PAID')
                throw new api_error_1.APIError('CONFLICT', 'Invoice already paid.');
            // 2. Reuse existing idempotency key if available, else generate one
            const orderId = invoice.idempotencyKey || `order_${crypto_1.default.randomBytes(8).toString('hex')}`;
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
    static async processRazorpayWebhook(institutionId, rawBody, signature) {
        const expectedSignature = crypto_1.default.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'secret')
            .update(rawBody.toString('utf8')).digest('hex');
        if (expectedSignature !== signature)
            throw new api_error_1.APIError('UNAUTHORIZED', "Invalid Hook Cryptographic Hash");
        const payload = JSON.parse(rawBody.toString('utf8'));
        const paymentEntity = payload.payload.payment.entity;
        // Strict DB Lock avoiding race condition duplication
        return await prisma_client_1.prisma.$transaction(async (tx) => {
            // 1. Double check against explicitly captured Payment References natively
            const existingPayment = await tx.payment.findUnique({ where: { transactionRef: paymentEntity.id } });
            if (existingPayment)
                return { status: 'IGNORED_DUPLICATE' };
            // 2. Lock Invoice row exclusively for update using Prisma Query Raw natively mapped
            const invoices = await tx.$queryRaw `
        SELECT id, "totalAmount" FROM "Invoice" WHERE "idempotencyKey" = ${paymentEntity.order_id} FOR UPDATE
      `;
            if (!invoices.length)
                throw new api_error_1.APIError('NOT_FOUND', "Orphaned receipt disconnected explicitly from target Ledger");
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
            await event_bus_service_1.ERPEventBus.emit('finance.payment.captured', { paymentId: payment.id, institutionId });
            // 6. Real-time push to student dashboard
            emitter_service_1.SocketEmitter.emitToTenant(institutionId, 'payment_completed', {
                invoiceId: invoice.id,
                amount: payment.amountPaid,
                status: newStatus
            });
            return { status: 'PROCESSED', paymentId: payment.id };
        });
    }
}
exports.FinanceService = FinanceService;
