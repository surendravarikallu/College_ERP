import { prisma } from '../../core/database/prisma.client';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

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
    components?: { name: string; amount: number }[];
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
        components: data.components ? {
          create: data.components.map(c => ({ name: c.name, amount: c.amount }))
        } : undefined,
      },
      include: { components: true },
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
  static async generateInvoices(data: { studentIds: string[]; feeStructureId: string; academicYear: string; semester: number }) {
    const { studentIds, feeStructureId } = data;
    const invoices: any[] = [];

    const feeStructure = await prisma.feeStructureNew.findUnique({ where: { id: feeStructureId } });
    if (!feeStructure) throw new APIError('NOT_FOUND', 'Fee structure not found.');

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

      const count = await prisma.feeInvoice.count();
      const invoiceNumber = `KITS-${new Date().getFullYear()}-${String(count + invoices.length + 1).padStart(6, '0')}`;

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
   * Generate payment receipt PDF (Exact Side-by-Side Visual Copy).
   */
  static async generateReceipt(invoiceId: string, isStaff: boolean = false): Promise<Buffer> {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: { include: { department: true } },
        feeStructure: true,
        transactions: { where: { status: 'SUCCESS' }, take: 1 },
      },
    });

    if (!invoice) throw new APIError('NOT_FOUND', 'Invoice not found.');
    if (invoice.status !== 'SUCCESS') throw new APIError('BAD_REQUEST', 'Invoice not yet paid.');

    // Fetch Total Due (Outstanding balance excluding this invoice)
    const pendingInvoices = await prisma.feeInvoice.findMany({
      where: {
        studentId: invoice.studentId,
        id: { not: invoiceId },
        status: 'PENDING'
      }
    });
    const totalDueValue = pendingInvoices.reduce((sum, inv) => sum + (inv.finalAmount - inv.collectedAmount), 0);

    const logoId = 'kits_logo.png'; // Converted from webp
    const logoPath = path.join(process.cwd(), 'client', 'public', logoId);
    const hasLogo = fs.existsSync(logoPath);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 20, size: 'A4' }); // Side-by-side fits on A4 Portrait
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const colWidth = 265;
      const leftX = 25;
      const rightX = 315;

      const drawReceiptColumn = (startX: number, copyType: string) => {
        let y = 30;
        const centerX = startX + colWidth / 2;
        const rightEdge = startX + colWidth;

        // --- PNG-Only Header Section (Compressed further) ---
        const bannerHeight = 38;
        try {
          if (hasLogo && (logoPath.toLowerCase().endsWith('.png') || logoPath.toLowerCase().endsWith('.jpg') || logoPath.toLowerCase().endsWith('.jpeg'))) {
            // Render the PNG Banner as the entire header
            doc.image(logoPath, startX + 5, y - 5, { width: colWidth - 10, height: bannerHeight, align: 'center' });
          } else {
            // Minimal Fallback if PNG is missing
            doc.rect(startX + 5, y, 50, 30).fill('#cc0000');
          }
        } catch (e) {
          console.error('Logo drawing failed:', e);
        }

        // Hard reset y - extreme compression
        y = 62;

        y += 5; // Minimal gap
        doc.moveTo(startX, y).lineTo(rightEdge, y).lineWidth(1).stroke('#000');
        y += 5;
        doc.fillColor('#000').fontSize(9).font('Helvetica-Bold')
          .text(`FEE RECEIPT(${copyType})`, startX, y, { width: colWidth, align: 'center' });
        y += 12;
        doc.moveTo(startX, y).lineTo(rightEdge, y).lineWidth(0.5).stroke('#000');
        y += 8;

        // --- Student & Info Rows (2 Columns) ---
        const drawInfoRow = (label: string, value: string, label2?: string, value2?: string) => {
          doc.fontSize(7).font('Helvetica-Bold').text(label, startX, y);
          doc.font('Helvetica').text(`: ${value}`, startX + 65, y);
          if (label2) {
            doc.font('Helvetica-Bold').text(label2, startX + 155, y);
            doc.font('Helvetica').text(`: ${value2}`, startX + 215, y);
          }
          y += 11;
        };

        const receiptDate = invoice.paidAt ? invoice.paidAt.toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        drawInfoRow('Rec No', invoice.invoiceNumber, 'Receipt Date', receiptDate);
        drawInfoRow('HT No', invoice.student.rollNumber);

        const getYearSem = (sem: number) => {
          const years = ['', 'I', 'II', 'III', 'IV'];
          const sems = ['', 'I', 'II'];
          const yearIndex = Math.ceil(sem / 2);
          const semIndex = sem % 2 === 0 ? 2 : 1;
          return `${years[yearIndex]} Year ${sems[semIndex]} Semester`;
        };
        drawInfoRow('Semester', getYearSem(invoice.student.semester || 1));
        drawInfoRow('Student Name', invoice.student.name.toUpperCase());
        drawInfoRow('Student Ph No', invoice.student.phone || '');
        drawInfoRow('Parent Name', invoice.student.guardianName || '');
        drawInfoRow('Program', 'B.TECH');
        drawInfoRow('Branch', invoice.student.department?.code || 'CSE');

        y += 5;

        // --- Table ---
        const tableY = y;
        const colPos = {
          sino: startX,
          acy: startX + 25,    // SI NO: 25
          type: startX + 60,   // Ac Year: 35
          part: startX + 95,   // Fee Type: 35
          amt: startX + 180,   // Fee Particulars: 85 (Expanded to fit long names)
          fine: startX + 225,  // Amt Width: 45
          total: startX + 245  // Fine: 20, Total: 20
        };

        // Header Row
        doc.rect(startX, tableY, colWidth, 15).fill('#f5f5f5').stroke('#000');
        doc.fillColor('#000').fontSize(7.5).font('Helvetica-Bold');
        doc.text('SI NO', colPos.sino, tableY + 4, { width: 25, align: 'center' });
        doc.text('Ac Year', colPos.acy, tableY + 4, { width: 35, align: 'center' });
        doc.text('Fee Type', colPos.type, tableY + 4, { width: 35, align: 'center' });
        doc.text('Fee Particulars', colPos.part, tableY + 4, { width: 85, align: 'left' });
        doc.text('Amount(Rs.)', colPos.amt, tableY + 4, { width: 45, align: 'center' });
        doc.text('Fine', colPos.fine, tableY + 4, { width: 20, align: 'center' });
        doc.text('Total', colPos.total, tableY + 4, { width: 20, align: 'center' });

        // Data Row 1 (Grid)
        let rowY = tableY + 15;
        for (let i = 0; i < 6; i++) { // Draw 6 empty grid rows
          doc.rect(startX, rowY, colWidth, 15).stroke();
          if (i === 0) {
            doc.font('Helvetica').fontSize(7);
            doc.text('1', colPos.sino, rowY + 4.5, { width: 25, align: 'center' });
            doc.text(invoice.academicYear || '2023-2024', colPos.acy, rowY + 4.5, { width: 35, align: 'center' });
            doc.text(invoice.feeStructure.feeType || 'Regular', colPos.type, rowY + 4.5, { width: 35, align: 'center' });
            doc.text(invoice.feeStructure.name, colPos.part, rowY + 4.5, { width: 85, align: 'left' });
            doc.font('Helvetica-Bold').fontSize(8).text(invoice.finalAmount.toString(), colPos.amt, rowY + 4, { width: 45, align: 'center' });
            doc.font('Helvetica').fontSize(7).text('0', colPos.fine, rowY + 4.5, { width: 20, align: 'center' });
            doc.text(invoice.finalAmount.toString(), colPos.total, rowY + 4.5, { width: 20, align: 'center' });
          }
          rowY += 15;
        }

        // Draw vertical lines for the table
        [colPos.acy, colPos.type, colPos.part, colPos.amt, colPos.fine, colPos.total].forEach(x => {
          doc.moveTo(x, tableY).lineTo(x, rowY).lineWidth(0.5).stroke();
        });

        // --- Footer Section ---
        y = rowY + 10;
        const txn = invoice.transactions[0];
        doc.fontSize(7).font('Helvetica-Bold').text('Mode of Payment:', startX, y);
        doc.font('Helvetica').text((txn?.metadata as any)?.method || 'Online', startX + 60, y);

        // Final Shift: Expanded Box width to 45 and adjusted centering
        doc.fontSize(8).font('Helvetica-Bold').text('GRAND TOTAL', startX + 160, y + 4);
        doc.rect(startX + 220, y - 2, 45, 18).stroke(); 
        doc.fontSize(8).text('Rs. ' + invoice.finalAmount.toString(), startX + 220, y + 4, { width: 45, align: 'center' });

        y += 11;
        doc.font('Helvetica-Bold').text('Trans_ID:', startX, y);
        doc.font('Helvetica').text(txn?.razorpayOrderId || 'N/A', startX + 60, y);
        y += 11;
        doc.font('Helvetica-Bold').text('ChequeNo/Date:', startX, y);
        y += 11;
        doc.font('Helvetica-Bold').text('Total In Words:', startX, y);
        doc.font('Helvetica').text(this.numberToWords(invoice.finalAmount), startX + 65, y);
        y += 11;
        doc.font('Helvetica-Bold').text('Narration:', startX, y);

        y += 20;
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#cc0000');
        doc.text('Note:- Parents are requested to preserve this receipt for future clarification in respect of fee paid. Fee once paid will not be refunded or transferred. Cheques subject to realization.',
          startX, y, { width: colWidth, lineGap: 2 });
        doc.fillColor('#000');

        y += 35;
        doc.fillColor('#000').fontSize(7).font('Helvetica-Bold');
        doc.text('Cashier', startX + 10, y);
        doc.text('Authorised Signatory', startX + 160, y);
      };

      // Conditional Layout: Staff gets side-by-side, Students get one copy.
      if (isStaff) {
        drawReceiptColumn(leftX, 'OFFICE COPY');

        // Vertical Perforation Line (A4 Portrait Center: 595.28 / 2 = 297.64)
        doc.moveTo(297.64, 20).lineTo(297.64, 800).dash(5, { space: 5 }).lineWidth(0.5).stroke('#cbd5e1');
        doc.undash();

        drawReceiptColumn(rightX, 'STUDENT COPY');
      } else {
        // Single Central Copy for Student (A4 width is 595.28)
        drawReceiptColumn((595.28 - colWidth) / 2, 'STUDENT COPY');
      }

      doc.end();
    });
  }
  /**
   * Generate next sequential receipt number for the institution.
   * Thread-safe via Prisma transaction + atomic increment.
   */
  static async getNextReceiptNumber(institutionId: string): Promise<{ receiptNo: number; receiptNumber: string }> {
    const counter = await prisma.$transaction(async (tx) => {
      const existing = await tx.feeReceiptCounter.findUnique({
        where: { institutionId },
      });

      if (existing) {
        return tx.feeReceiptCounter.update({
          where: { institutionId },
          data: { lastReceiptNo: { increment: 1 } },
        });
      } else {
        // Start from 1 for new institution
        return tx.feeReceiptCounter.create({
          data: { institutionId, lastReceiptNo: 1 },
        });
      }
    });

    return {
      receiptNo: counter.lastReceiptNo,
      receiptNumber: String(counter.lastReceiptNo),
    };
  }

  /**
   * Record an offline payment (Cash/Cheque/DD) by a cashier.
   * This is the core method matching the Bees "Regular Fees Collection" screen.
   */
  static async recordOfflinePayment(
    data: {
      studentId: string;
      feeInvoiceId: string;
      academicYear: string;
      feeParticulars: string;
      period: string;
      amount: number;
      fineAmount?: number;
      paymentMode: 'CASH' | 'CHEQUE' | 'DD' | 'ONLINE' | 'LEGACY_ONLINE' | 'NEFT' | 'UPI';
      chequeNo?: string;
      chequeDate?: string;
      bankName?: string;
      refNo?: string;
      transactionId?: string;
      narration?: string;
      excessAmount?: number;
      receiptDate?: string;
    },
    collectedBy: string,
    institutionId: string
  ) {
    // Validate invoice belongs to student
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: data.feeInvoiceId },
      include: { student: { include: { user: true, department: true } } },
    });
    if (!invoice) throw new APIError('NOT_FOUND', 'Fee invoice not found.');
    if (invoice.studentId !== data.studentId) throw new APIError('FORBIDDEN', 'Invoice does not belong to this student.');

    // Check amount does not exceed remaining due
    const currentDue = invoice.finalAmount - invoice.collectedAmount;
    if (data.amount > currentDue + 0.01) {
      throw new APIError('BAD_REQUEST', `Payment amount ₹${data.amount} exceeds due amount ₹${currentDue.toFixed(2)}.`);
    }

    const fineAmt = data.fineAmount || 0;
    const excessAmt = data.excessAmount || 0;
    const totalAmt = data.amount + fineAmt;
    const receiptDate = data.receiptDate ? new Date(data.receiptDate) : new Date();

    // Get next receipt number (atomic)
    const { receiptNo, receiptNumber } = await this.getNextReceiptNumber(institutionId);

    const receipt = await prisma.$transaction(async (tx) => {
      // Create the offline receipt
      const rec = await tx.offlinePaymentReceipt.create({
        data: {
          receiptNo,
          receiptNumber,
          institutionId,
          studentId: data.studentId,
          feeInvoiceId: data.feeInvoiceId,
          academicYear: data.academicYear,
          feeParticulars: data.feeParticulars,
          period: data.period,
          amount: data.amount,
          fineAmount: fineAmt,
          totalAmount: totalAmt,
          paymentMode: data.paymentMode as any,
          chequeNo: data.chequeNo,
          chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
          bankName: data.bankName,
          refNo: data.refNo,
          transactionId: data.transactionId,
          narration: data.narration,
          excessAmount: excessAmt,
          receiptDate,
          collectedBy,
        },
      });

      // Update invoice collected amount
      const newCollected = invoice.collectedAmount + data.amount;
      const newStatus = newCollected >= invoice.finalAmount - 0.01 ? 'SUCCESS' : 'PENDING';

      await tx.feeInvoice.update({
        where: { id: data.feeInvoiceId },
        data: {
          collectedAmount: newCollected,
          fineAmount: invoice.fineAmount + fineAmt,
          excessAmount: invoice.excessAmount + excessAmt,
          status: newStatus as any,
          paidAt: newStatus === 'SUCCESS' ? new Date() : undefined,
        },
      });

      return rec;
    });

    await AuditService.log(collectedBy, 'OFFLINE_PAYMENT_RECORDED', 'OfflinePaymentReceipt', receipt.id, null, {
      receiptNumber, amount: data.amount, paymentMode: data.paymentMode,
    });

    return receipt;
  }

  /**
   * Get student fee card — full multi-year view matching Bees Fee Card screenshot.
   * Groups invoices by academic year with collected/due per fee type.
   */
  static async getStudentFeeCard(studentId: string) {
    const [invoices, student] = await Promise.all([
      prisma.feeInvoice.findMany({
        where: { studentId },
        include: {
          feeStructure: { select: { name: true, feeType: true } },
          offlineReceipts: {
            where: { isDeleted: false },
            orderBy: { receiptDate: 'asc' },
            select: {
              receiptNumber: true,
              receiptDate: true,
              amount: true,
              fineAmount: true,
              paymentMode: true,
            },
          },
        },
        orderBy: { academicYear: 'desc' },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          department: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
    ]);

    if (!student) throw new APIError('NOT_FOUND', 'Student not found.');

    // Group by academic year
    const byYear: Record<string, {
      academicYear: string;
      invoices: any[];
      totalTarget: number;
      totalCollected: number;
      totalDue: number;
      totalFine: number;
    }> = {};

    for (const inv of invoices) {
      const year = inv.academicYear || 'Unknown';
      if (!byYear[year]) {
        byYear[year] = { academicYear: year, invoices: [], totalTarget: 0, totalCollected: 0, totalDue: 0, totalFine: 0 };
      }
      byYear[year].invoices.push(inv);
      byYear[year].totalTarget += inv.finalAmount;
      byYear[year].totalCollected += inv.collectedAmount;
      byYear[year].totalDue += Math.max(0, inv.finalAmount - inv.collectedAmount);
      byYear[year].totalFine += inv.fineAmount;
    }

    const grandTotal = {
      target: invoices.reduce((s, i) => s + i.finalAmount, 0),
      collected: invoices.reduce((s, i) => s + i.collectedAmount, 0),
      due: invoices.reduce((s, i) => s + Math.max(0, i.finalAmount - i.collectedAmount), 0),
      fine: invoices.reduce((s, i) => s + i.fineAmount, 0),
      count: invoices.length,
    };

    return {
      student,
      feeCard: Object.values(byYear).sort((a, b) => b.academicYear.localeCompare(a.academicYear)),
      grandTotal,
    };
  }

  /**
   * Get student payment history — all receipts, matching Payment Details screenshot.
   */
  static async getStudentPaymentHistory(studentId: string) {
    return prisma.offlinePaymentReceipt.findMany({
      where: { studentId, isDeleted: false },
      include: {
        feeInvoice: {
          include: { feeStructure: { select: { name: true } } },
        },
      },
      orderBy: { receiptDate: 'desc' },
    });
  }

  /**
   * Search student by Hall Ticket number (rollNumber).
   * Matches the "HT No" search in Bees Regular Fees Collection screen.
   */
  static async searchStudentByHT(htNo: string, institutionId: string) {
    const student = await prisma.student.findFirst({
      where: {
        rollNumber: { equals: htNo, mode: 'insensitive' },
        user: { institutionId },
      },
      include: {
        department: { select: { name: true, code: true } },
        user: { select: { email: true, institutionId: true } },
        feeInvoices: {
          include: {
            feeStructure: { select: { name: true, feeType: true } },
            offlineReceipts: {
              where: { isDeleted: false },
              orderBy: { receiptDate: 'desc' },
            },
          },
          orderBy: [{ academicYear: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!student) throw new APIError('NOT_FOUND', `No student found with HT No: ${htNo}`);

    const totalDue = student.feeInvoices.reduce((sum, inv) => {
      return sum + Math.max(0, inv.finalAmount - inv.collectedAmount);
    }, 0);

    return { student, totalDue };
  }

  /**
   * Soft-delete a receipt (Deleted Receipts feature in Bees).
   */
  static async deleteReceipt(receiptId: string, reason: string, deletedBy: string) {
    const receipt = await prisma.offlinePaymentReceipt.findUnique({
      where: { id: receiptId },
      include: { feeInvoice: true },
    });
    if (!receipt) throw new APIError('NOT_FOUND', 'Receipt not found.');
    if (receipt.isDeleted) throw new APIError('CONFLICT', 'Receipt already deleted.');

    await prisma.$transaction(async (tx) => {
      await tx.offlinePaymentReceipt.update({
        where: { id: receiptId },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy, deleteReason: reason },
      });

      // Reverse the collected amount on the invoice
      const invoice = receipt.feeInvoice;
      const newCollected = Math.max(0, invoice.collectedAmount - receipt.amount);
      await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          collectedAmount: newCollected,
          status: newCollected < invoice.finalAmount - 0.01 ? 'PENDING' : 'SUCCESS',
          paidAt: newCollected < invoice.finalAmount - 0.01 ? null : invoice.paidAt,
        },
      });
    });

    await AuditService.log(deletedBy, 'RECEIPT_DELETED', 'OfflinePaymentReceipt', receiptId, null, { reason });
    return { success: true };
  }

  /**
   * Get all receipts for admin collection report.
   */
  static async getCollectionReport(filters: {
    institutionId: string;
    fromDate?: string;
    toDate?: string;
    paymentMode?: string;
    departmentId?: string;
  }) {
    const where: any = {
      institutionId: filters.institutionId,
      isDeleted: false,
    };

    if (filters.fromDate) where.receiptDate = { ...where.receiptDate, gte: new Date(filters.fromDate) };
    if (filters.toDate) where.receiptDate = { ...where.receiptDate, lte: new Date(filters.toDate) };
    if (filters.paymentMode) where.paymentMode = filters.paymentMode;
    if (filters.departmentId) where.student = { departmentId: filters.departmentId };

    const receipts = await prisma.offlinePaymentReceipt.findMany({
      where,
      include: {
        student: {
          include: { department: { select: { name: true } } },
        },
        feeInvoice: {
          include: { feeStructure: { select: { name: true } } },
        },
      },
      orderBy: { receiptDate: 'desc' },
      take: 500,
    });

    const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);
    const totalFine = receipts.reduce((s, r) => s + r.fineAmount, 0);

    return { receipts, summary: { count: receipts.length, totalCollected, totalFine } };
  }

  /**
   * Helper: Convert number to Indian currency words
   */
  private static numberToWords(amount: number): string {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (numAsInput: number): string => {
      const numStr = numAsInput.toString();
      if (numStr.length > 9) return 'overflow';
      const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return '';
      let str = '';
      str += Number(n[1]) !== 0 ? (this.getWordByIndex(n, 1, a, b)) + 'crore ' : '';
      str += Number(n[2]) !== 0 ? (this.getWordByIndex(n, 2, a, b)) + 'lakh ' : '';
      str += Number(n[3]) !== 0 ? (this.getWordByIndex(n, 3, a, b)) + 'thousand ' : '';
      str += Number(n[4]) !== 0 ? (this.getWordByIndex(n, 4, a, b)) + 'hundred ' : '';
      str += Number(n[5]) !== 0 ? (str !== '' ? 'and ' : '') + (this.getWordByIndex(n, 5, a, b)) : '';
      return str;
    };

    const rawAmount = Math.floor(amount);
    const words = inWords(rawAmount);
    if (!words) return 'Zero Rupees Only';
    return words.trim().charAt(0).toUpperCase() + words.trim().slice(1) + ' Rupees Only';
  }

  private static getWordByIndex(n: RegExpMatchArray | null, index: number, a: string[], b: string[]): string {
    if (!n || !n[index]) return '';
    const val = Number(n[index]);
    if (val === 0) return '';
    return (a[val] || b[Number(n[index][0])] + ' ' + a[Number(n[index][1])]);
  }
}
