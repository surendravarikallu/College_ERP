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
   * Create a fee structure.
   */
  static async createFeeStructure(data: {
    institutionId: string;
    name: string; feeType: string; amount: number;
    departmentId?: string; semester?: number;
    academicYear: string; dueDate?: string;
  }) {
    return prisma.feeStructure.create({
      data: {
        id: `fee-${Date.now()}`,
        institutionId: data.institutionId,
        name: data.name,
        amount: data.amount,
      },
    });
  }

  /**
   * List fee structures.
   */
  static async listFeeStructures(institutionId: string, academicYear?: string) {
    const where: any = { institutionId };
    return prisma.feeStructure.findMany({ where });
  }

  /**
   * Generate invoices for students.
   * Auto-generates KITS-{YEAR}-{...} idempotency keys.
   */
  static async generateInvoices(feeStructureId: string, studentIds: string[]) {
    const feeStructure = await prisma.feeStructure.findUnique({ where: { id: feeStructureId } });
    if (!feeStructure) throw new APIError('NOT_FOUND', 'Fee structure not found.');

    const invoices = [];
    for (const studentId of studentIds) {
      // Check for existing invoice
      const existing = await prisma.invoice.findFirst({
        where: { studentId, status: { in: ['DUE', 'PAID'] }, InvoiceLineItem: { some: { feeStructureId } } },
      });
      if (existing) continue;

      // Apply scholarship if exists
      const scholarship = await prisma.scholarship.findUnique({ where: { studentId } });
      const discount = scholarship?.isActive ? (scholarship.percentage ? feeStructure.amount * scholarship.percentage / 100 : scholarship.amount || 0) : 0;
      const finalAmount = Math.max(0, feeStructure.amount - discount);

      const invoiceId = `inv-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      const invoice = await prisma.invoice.create({
        data: {
          id: invoiceId,
          studentId,
          totalAmount: finalAmount,
          idempotencyKey: `KITS-INV-${studentId}-${feeStructureId}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          InvoiceLineItem: {
            create: {
              id: `ili-${Date.now()}`,
              feeStructureId,
              amount: finalAmount
            }
          }
        },
      });
      invoices.push(invoice);
    }

    return { generated: invoices.length, invoices };
  }

  /**
   * Initiate Razorpay payment for an invoice.
   */
  static async initiatePayment(invoiceId: string, studentId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { StudentProfile: true },
    });

    if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
    if (invoice.studentId !== studentId) throw new APIError('FORBIDDEN', 'This invoice does not belong to you.');
    if (invoice.status === 'PAID') throw new APIError('CONFLICT', 'Invoice already paid.');

    const amountInPaise = Math.round(invoice.totalAmount * 100);
    // Even if amount is 0, Razorpay needs at least 100 paise, but if it is 0, we can bypass
    if (amountInPaise <= 0) {
      throw new APIError('BAD_REQUEST', 'Invoice amount is zero, manual clearance required.');
    }

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: invoice.id,
      notes: { invoiceId: invoice.id, studentId },
    });

    await prisma.payment.create({
      data: {
        id: `pay-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        invoiceId: invoice.id,
        transactionRef: rzpOrder.id,
        amountPaid: invoice.totalAmount,
        method: 'RAZORPAY',
        status: 'PENDING'
      },
    });

    return {
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY || 'rzp_test_dummy',
      studentName: invoice.StudentProfile.firstName,
      institutionName: INSTITUTION_NAME,
    };
  }

  /**
   * Verify and process Razorpay webhook.
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
        const txn = await tx.payment.findUnique({
          where: { transactionRef: paymentEntity.order_id },
        });
        if (!txn) throw new APIError('NOT_FOUND', 'Transaction not found.');
        if (txn.status === 'CAPTURED') return { status: 'ALREADY_PROCESSED' };

        await tx.payment.update({
          where: { id: txn.id },
          data: {
            status: 'CAPTURED',
          },
        });

        await tx.invoice.update({
          where: { id: txn.invoiceId },
          data: { status: 'PAID' }, // No paidAt field in new schema
        });

        return { status: 'PROCESSED', invoiceId: txn.invoiceId };
      });
    }

    return { status: 'IGNORED', event };
  }

  /**
   * Get fee dues for a student or all students.
   */
  static async getFeeDues(studentId?: string) {
    const where: any = { status: 'DUE' };
    if (studentId) where.studentId = studentId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        StudentProfile: { select: { id: true, firstName: true, enrollmentNo: true } },
        InvoiceLineItem: { include: { FeeStructure: { select: { name: true } } } },
      },
    });

    return invoices.map(inv => ({
      ...inv,
      student: { name: inv.StudentProfile.firstName, rollNumber: inv.StudentProfile.enrollmentNo },
      feeStructure: { name: inv.InvoiceLineItem[0]?.FeeStructure.name || 'Custom Fee', feeType: 'FEE' },
      isOverdue: inv.dueDate ? inv.dueDate < new Date() : false,
      amount: inv.totalAmount,
      finalAmount: inv.totalAmount
    }));
  }

  /**
   * Get invoices for a student.
   */
  static async getStudentInvoices(studentId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      include: {
        InvoiceLineItem: { include: { FeeStructure: { select: { name: true } } } },
        Payment: { select: { id: true, transactionRef: true, status: true, createdAt: true } },
      },
    });

    return invoices.map(inv => ({
      ...inv,
      feeStructure: { name: inv.InvoiceLineItem[0]?.FeeStructure.name || 'Custom Fee', feeType: 'FEE' },
      transactions: inv.Payment,
      amount: inv.totalAmount,
      finalAmount: inv.totalAmount
    }));
  }

  /**
   * Generate payment receipt PDF.
   */
  static async generateReceipt(invoiceId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        StudentProfile: true,
        InvoiceLineItem: { include: { FeeStructure: true } },
        Payment: { where: { status: 'CAPTURED' }, take: 1 },
      },
    });

    if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
    if (invoice.status !== 'PAID') throw new APIError('BAD_REQUEST', 'Invoice not yet paid.');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(18).text(INSTITUTION_NAME, { align: 'center' });
      doc.fontSize(12).text('Payment Receipt', { align: 'center' });
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Invoice details
      doc.fontSize(10);
      doc.text(`Invoice No: ${invoice.idempotencyKey || invoice.id}`);
      doc.text(`Student: ${(invoice as any).StudentProfile.firstName} (${(invoice as any).StudentProfile.enrollmentNo})`);
      doc.text(`Fee Type: ${(invoice as any).InvoiceLineItem[0]?.FeeStructure.name || 'Custom Fee'}`);
      doc.text(`Amount: INR ${invoice.totalAmount.toLocaleString()}`);
      
      const p = (invoice as any).Payment[0];
      if (p) {
        doc.text(`Transaction ID: ${p.transactionRef}`);
        doc.text(`Paid On: ${p.createdAt?.toLocaleDateString()}`);
      }
      doc.moveDown(2);

      doc.fontSize(8).text('This is a computer-generated receipt.', { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.end();
    });
  }
}
