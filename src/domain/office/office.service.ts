import ExcelJS from 'exceljs';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { StudentStatus, QuotaType, Category, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

export class OfficeService {
  /**
   * Part 2: Excel Import System
   */
  static async importStudentsFromExcel(buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new APIError('BAD_REQUEST', 'Invalid Excel file: No worksheet found.');

    const applications: any[] = [];
    const errors: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const admissionNumber = row.getCell(1).text.trim();
        const name = row.getCell(2).text.trim();
        const email = row.getCell(3).text.trim();
        const phone = row.getCell(4).text.trim();
        const departmentId = row.getCell(5).text.trim();
        const quotaType = row.getCell(6).text.trim().toUpperCase() as QuotaType;
        const category = row.getCell(7).text.trim().toUpperCase() as Category;
        const feeStructureId = row.getCell(8).text.trim();

        if (!admissionNumber || !name || !email || !departmentId || !feeStructureId) {
          throw new Error('Missing required fields.');
        }

        if (!Object.values(QuotaType).includes(quotaType as any)) throw new Error(`Invalid Quota: ${quotaType}`);
        if (!Object.values(Category).includes(category as any)) throw new Error(`Invalid Category: ${category}`);

        applications.push({
          admissionNumber,
          name,
          email,
          phone,
          departmentId,
          quotaType,
          category,
          feeStructureId,
          status: 'APPLIED',
        });
      } catch (err: any) {
        errors.push({ row: rowNumber, reason: err.message });
      }
    });

    if (applications.length > 0) {
      await prisma.admissionApplication.createMany({
        data: applications,
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      count: applications.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Part 3: Admission Workflow - Transition Status
   */
  static async updateAdmissionStatus(id: string, status: StudentStatus, institutionId: string) {
    const application = await prisma.admissionApplication.findUnique({
      where: { id },
      include: { feeStructure: { include: { components: true } } }
    }) as any;

    if (!application) throw new APIError('NOT_FOUND', 'Admission application not found.');
    if (application.status === 'ADMITTED') throw new APIError('CONFLICT', 'Student already admitted.');

    if (status === 'ADMITTED') {
      return await this.admitStudent(application, institutionId);
    }

    return prisma.admissionApplication.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Part 3 & 5 & 6: Triggered on Status = ADMITTED
   */
  private static async admitStudent(app: any, institutionId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create User
      const passwordHash = await bcrypt.hash('Welcome@123', 10);
      const user = await tx.user.create({
        data: {
          email: app.email as string,
          passwordHash,
          role: 'STUDENT',
          Institution: { connect: { id: institutionId } },
        } as any
      });

      // 2. Create Student
      const student = await tx.student.create({
        data: {
          userId: user.id,
          name: app.name,
          rollNumber: app.admissionNumber, // Using admission number as roll number initially
          admissionNumber: app.admissionNumber,
          departmentId: app.departmentId,
          quotaType: app.quotaType,
          category: app.category,
          feeStructureId: app.feeStructureId,
          status: 'ACTIVE',
          admissionDate: new Date(),
        }
      });

      // 3. Create Fee Card (Part 5)
      const totalAmount = app.feeStructure.components.reduce((sum: number, c: any) => sum + c.amount, 0) || app.feeStructure.amount;
      await tx.feeCard.create({
        data: {
          studentId: student.id,
          feeStructureId: app.feeStructureId,
          totalAmount,
          dueAmount: totalAmount,
        }
      });

      // 4. Generate Invoice (Part 6)
      const count = await tx.feeInvoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
      await tx.feeInvoice.create({
        data: {
          invoiceNumber,
          studentId: student.id,
          feeStructureId: app.feeStructureId,
          amount: totalAmount,
          finalAmount: totalAmount,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days due
        }
      });

      // 5. Update Application Status
      await tx.admissionApplication.update({
        where: { id: app.id },
        data: { status: 'ADMITTED' }
      });

      return { studentId: student.id, userId: user.id };
    });
  }

  static async listApplications(status?: StudentStatus) {
    return prisma.admissionApplication.findMany({
      where: status ? { status } : {},
      include: { feeStructure: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
