import { prisma } from '../../core/database/prisma.client';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import PDFDocument from 'pdfkit';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || 'dummy_key',
  key_secret: process.env.RAZORPAY_SECRET || 'dummy_secret',
});

const INSTITUTION_NAME = process.env.INSTITUTION_NAME || 'Kits Akshar Institute of Technology';

export class FinanceService {

  /**
   * Create a fee structure (new models).
   */
  static async createFeeStructure(data: {
    name: string; feeType: string; amount: number;
    departmentId?: string; semester?: number;
    academicYear: string; dueDate?: string;
  }) {
    return prisma.feeStructureNew.create({
      data: {
        name: data.name,
        feeType: data.feeType,
        amount: data.amount,
        departmentId: data.departmentId,
        semester: data.semester,
        academicYear: data.academicYear,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  /**
   * List fee structures.
   */
  static async listFeeStructures(academicYear?: string) {
    const where: any = { isActive: true };
    if (academicYear) where.academicYear = academicYear;
    return prisma.feeStructureNew.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Generate invoices for students.
   */
  static async generateInvoices(feeStructureId: string, studentIds: string[]) {
    const feeStructure = await prisma.feeStructureNew.findUnique({ where: { id: feeStructureId } });
    if (!feeStructure) throw new APIError('NOT_FOUND', 'Fee structure not found.');

    const invoices = [];
    for (const studentId of studentIds) {
      // Skip if already has invoice for this fee structure
      const existing = await prisma.feeInvoice.findFirst({
        where: { studentId, feeStructureId },
      });
      if (existing) continue;

      // Apply scholarship if exists
      const scholarship = await prisma.scholarshipNew.findUnique({ where: { studentId } });
      const discount = scholarship?.isActive
        ? (scholarship.percentage ? feeStructure.amount * scholarship.percentage / 100 : scholarship.amount || 0)
        : 0;
      const finalAmount = Math.max(0, feeStructure.amount - discount);

      const invoiceNumber = `KITS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const invoice = await prisma.feeInvoice.create({
        data: {
          invoiceNumber,
          studentId,
          feeStructureId,
          amount: feeStructure.amount,
          discount,
          finalAmount,
          dueDate: feeStructure.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      invoices.push(invoice);
    }

    return { generated: invoices.length, invoices };
  }

  /**
   * Initiate Razorpay payment.
   */
  static async initiatePayment(invoiceId: string, studentId: string) {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });

    if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
    if (invoice.studentId !== studentId) throw new APIError('FORBIDDEN', 'This invoice does not belong to you.');
    if (invoice.status === 'SUCCESS') throw new APIError('CONFLICT', 'Invoice already paid.');

    const amountInPaise = Math.round(invoice.finalAmount * 100);
    if (amountInPaise <= 0) throw new APIError('BAD_REQUEST', 'Invoice amount is zero.');

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: invoice.id,
      notes: { invoiceId: invoice.id, studentId },
    });

    await prisma.paymentTransaction.create({
      data: {
        invoiceId: invoice.id,
        razorpayOrderId: rzpOrder.id,
        amount: invoice.finalAmount,
      },
    });

    return {
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY || 'rzp_test_dummy',
      studentName: invoice.student.name,
      institutionName: INSTITUTION_NAME,
    };
  }

  /**
   * Verify Razorpay webhook.
   */
  static async verifyWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) throw new APIError('INTERNAL_SERVER', 'Webhook secret not configured.');

    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(rawBody.toString('utf8')).digest('hex');

    if (expectedSignature !== signature) {
      throw new APIError('UNAUTHORIZED', 'Invalid webhook signature.');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const event = payload.event;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;

      return await prisma.$transaction(async (tx) => {
        const txn = await tx.paymentTransaction.findUnique({
          where: { razorpayOrderId: paymentEntity.order_id },
        });
        if (!txn) throw new APIError('NOT_FOUND', 'Transaction not found.');
        if (txn.status === 'SUCCESS') return { status: 'ALREADY_PROCESSED' };

        await tx.paymentTransaction.update({
          where: { id: txn.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: paymentEntity.id,
            webhookVerified: true,
          },
        });

        await tx.feeInvoice.update({
          where: { id: txn.invoiceId },
          data: { status: 'SUCCESS', paidAt: new Date() },
        });

        return { status: 'PROCESSED', invoiceId: txn.invoiceId };
      });
    }

    return { status: 'IGNORED', event };
  }

  /**
   * Get fee dues.
   */
  static async getFeeDues(studentId?: string) {
    const where: any = { status: 'PENDING' };
    if (studentId) where.studentId = studentId;

    return prisma.feeInvoice.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        feeStructure: { select: { name: true, feeType: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get student invoices.
   */
  static async getStudentInvoices(studentId: string) {
    return prisma.feeInvoice.findMany({
      where: { studentId },
      include: {
        feeStructure: { select: { name: true, feeType: true } },
        transactions: { select: { id: true, razorpayOrderId: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generate payment receipt PDF.
   */
  static async generateReceipt(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
        feeStructure: true,
        transactions: { where: { status: 'SUCCESS' }, take: 1 },
      },
    });

    if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
    if (invoice.status !== 'SUCCESS') throw new APIError('BAD_REQUEST', 'Invoice not yet paid.');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(18).text(INSTITUTION_NAME, { align: 'center' });
      doc.fontSize(12).text('Payment Receipt', { align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(10);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`);
      doc.text(`Student: ${invoice.student.name} (${invoice.student.rollNumber})`);
      doc.text(`Fee Type: ${invoice.feeStructure.name}`);
      doc.text(`Amount: INR ${invoice.finalAmount.toLocaleString()}`);

      const txn = invoice.transactions[0];
      if (txn) {
        doc.text(`Transaction ID: ${txn.razorpayOrderId}`);
        doc.text(`Paid On: ${txn.createdAt.toLocaleDateString()}`);
      }
      doc.moveDown(2);

      doc.fontSize(8).text('This is a computer-generated receipt.', { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.end();
    });
  }
}
