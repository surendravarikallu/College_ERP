import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { LeaveStatus, PayslipStatus } from '@prisma/client';

export class HRService {
  // ─── EMPLOYEE LIST ────────────────────────────────────────────────
  static async listEmployeeProfiles(filters?: {
    departmentId?: string;
    employeeType?: string;
  }) {
    const where: any = { isActive: true };
    if (filters?.departmentId) where.departmentId = filters.departmentId;

    return (prisma.faculty as any).findMany({
      where,
      include: {
        department: { select: { name: true, code: true } },
        user: { select: { email: true } },
        employeeProfile: true,
        salaryStructure: true,
        leaveBalance: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── EMPLOYEE PROFILE ────────────────────────────────────────────
  static async getEmployeeProfileByFacultyId(facultyId: string) {
    const faculty = await (prisma.faculty as any).findUnique({
      where: { id: facultyId },
      include: {
        department: true,
        user: { select: { email: true } },
        employeeProfile: true,
        salaryStructure: true,
        leaveBalance: true,
        payslips: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 12 },
      },
    });
    if (!faculty) throw new APIError('NOT_FOUND', 'Faculty not found.');
    return faculty;
  }

  static async upsertEmployeeProfile(facultyId: string, data: any, requestedBy: string, institutionId: string) {
    const profile = await prisma.employeeProfile.upsert({
      where: { facultyId },
      create: { ...data, facultyId },
      update: data,
    });

    await AuditService.log(
      requestedBy,
      'EMPLOYEE_PROFILE_UPDATED',
      'EmployeeProfile',
      profile.id,
      null,
      data
    );

    return profile;
  }

  // ─── SALARY STRUCTURE ────────────────────────────────────────────
  static async upsertSalaryStructure(facultyId: string, data: any, requestedBy: string, institutionId: string) {
    const gross = (data.basicPay || 0) + (data.hra || 0) + (data.da || 0) + (data.allowances || 0);
    const deductions = (data.deductions || 0) + (data.providentFund || 0) + (data.professionalTax || 0);
    const netSalary = gross - deductions;

    const structure = await prisma.salaryStructure.upsert({
      where: { facultyId },
      create: { ...data, netSalary, facultyId },
      update: { ...data, netSalary },
    });

    await AuditService.log(
      requestedBy,
      'SALARY_STRUCTURE_UPDATED',
      'SalaryStructure',
      structure.id,
      null,
      { ...data, netSalary }
    );

    return structure;
  }

  // ─── LEAVE MANAGEMENT ────────────────────────────────────────────
  static async initializeLeaveBalance(facultyId: string, year: number) {
    const existing = await prisma.leaveBalance.findUnique({ where: { facultyId } });
    if (existing) return existing;

    return prisma.leaveBalance.create({
      data: { facultyId, year, casualLeaves: 12, sickLeaves: 12, earnedLeaves: 0 }
    });
  }

  static async getLeaveApplications(filters?: { status?: string; facultyId?: string; departmentId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.facultyId) where.facultyId = filters.facultyId;
    if (filters?.departmentId) {
      where.faculty = { departmentId: filters.departmentId };
    }

    return prisma.leaveApplication.findMany({
      where,
      include: {
        faculty: {
          select: {
            name: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  static async applyForLeave(facultyId: string, data: { leaveType: string; startDate: string; endDate: string; days: number; reason: string }, requestedBy: string, institutionId: string) {
    const app = await prisma.leaveApplication.create({
      data: {
        facultyId,
        leaveType: data.leaveType,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days,
        reason: data.reason
      }
    });
    return app;
  }

  static async updateLeaveStatus(applicationId: string, status: LeaveStatus, remarks: string, requestedBy: string, institutionId: string) {
    const app = await prisma.leaveApplication.findUnique({ where: { id: applicationId } });
    if (!app) throw new APIError('NOT_FOUND', 'Leave application not found.');

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.leaveApplication.update({
        where: { id: applicationId },
        data: { status, remarks, approvedById: requestedBy }
      });

      if (status === 'LEAVE_APPROVED') {
        const balance = await tx.leaveBalance.findUnique({ where: { facultyId: app.facultyId } });
        if (balance) {
          const updates: any = {};
          if (app.leaveType === 'CASUAL') updates.casualLeaves = Math.max(0, balance.casualLeaves - app.days);
          else if (app.leaveType === 'SICK') updates.sickLeaves = Math.max(0, balance.sickLeaves - app.days);
          else if (app.leaveType === 'EARNED') updates.earnedLeaves = Math.max(0, balance.earnedLeaves - app.days);
          
          await tx.leaveBalance.update({ where: { id: balance.id }, data: updates });
        }
      }
      return u;
    });

    await AuditService.log(
      requestedBy,
      'LEAVE_STATUS_UPDATED',
      'LeaveApplication',
      applicationId,
      null,
      { status, remarks }
    );

    return updated;
  }

  // ─── PAYROLL ──────────────────────────────────────────────────────
  static async generatePayslip(facultyId: string, month: number, year: number, requestedBy: string, institutionId: string) {
    const existing = await prisma.payslip.findUnique({
      where: { facultyId_month_year: { facultyId, month, year } }
    });
    if (existing && existing.status === 'PAID') {
      throw new APIError('CONFLICT', `Payslip for ${month}/${year} is already paid.`);
    }
    if (existing) {
      // Allow regeneration of DRAFT/GENERATED payslips
      await prisma.payslip.delete({ where: { id: existing.id } });
    }
    return this.generatePayslipWithAttendance(facultyId, month, year, requestedBy, institutionId);
  }

  private static async generatePayslipWithAttendance(
    facultyId: string,
    month: number,
    year: number,
    requestedBy: string,
    institutionId: string
  ) {
    const structure = await prisma.salaryStructure.findUnique({ where: { facultyId } });
    if (!structure) throw new APIError('NOT_FOUND', `No salary structure for faculty ${facultyId}.`);

    // Calculate Loss of Pay (LOP) based on actual FacultyAttendance
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const attendanceRecords = await prisma.facultyAttendance.findMany({
      where: { facultyId, date: { gte: startDate, lte: endDate } },
    });

    const workingDays = attendanceRecords.length || 26; // default 26 if no records
    const presentDays = attendanceRecords.reduce((sum, r) => {
      if (r.status === 'PRESENT' || r.status === 'OD') return sum + 1;
      if (r.status === 'MEDICAL_LEAVE') return sum + 1; // medical leave = paid
      return sum; // ABSENT = no pay
    }, 0);

    const lopDays = attendanceRecords.length > 0 ? Math.max(0, workingDays - presentDays) : 0;
    const lopRatio = workingDays > 0 ? lopDays / workingDays : 0;

    const basicPay = Math.round(structure.basicPay * (1 - lopRatio) * 100) / 100;
    const hra = Math.round(structure.hra * (1 - lopRatio) * 100) / 100;
    const da = Math.round(structure.da * (1 - lopRatio) * 100) / 100;
    const allowances = structure.allowances;
    const grossSalary = Math.round((basicPay + hra + da + allowances) * 100) / 100;
    const totalDeductions = structure.providentFund + structure.professionalTax + structure.deductions;
    const netSalary = Math.round(Math.max(0, grossSalary - totalDeductions) * 100) / 100;

    const payslip = await prisma.payslip.create({
      data: {
        facultyId, month, year,
        basicPay, hra, da, allowances,
        grossSalary,
        providentFund: structure.providentFund,
        professionalTax: structure.professionalTax,
        otherDeductions: structure.deductions,
        totalDeductions,
        netSalary,
        status: 'DRAFT' as PayslipStatus,
      },
    });

    await AuditService.log(requestedBy, 'PAYSLIP_GENERATED', 'Payslip', payslip.id, null,
      { month, year, netSalary, presentDays, lopDays });

    return payslip;
  }

  static async generateBulkPayslips(month: number, year: number, departmentId: string | undefined, requestedBy: string, institutionId: string) {
    const where: any = { isActive: true };
    if (departmentId) where.departmentId = departmentId;

    const faculties = await (prisma.faculty as any).findMany({
      where,
      select: { id: true, name: true },
    });

    const results: any[] = [];
    for (const f of faculties) {
      try {
        const existing = await prisma.payslip.findUnique({
          where: { facultyId_month_year: { facultyId: f.id as string, month, year } },
        });
        if (existing && existing.status === 'PAID') {
          results.push({ facultyId: f.id, name: f.name, success: false, error: 'Already paid', payslipId: existing.id });
          continue;
        }

        const payslip = await this.generatePayslip(f.id as string, month, year, requestedBy, institutionId);
        results.push({ facultyId: f.id, name: f.name, success: true, payslipId: payslip.id, netSalary: payslip.netSalary });
      } catch (err: any) {
        results.push({ facultyId: f.id, name: f.name, success: false, error: err.message });
      }
    }

    return {
      month, year,
      total: faculties.length,
      generated: results.filter(r => r.success).length,
      skipped: results.filter(r => !r.success && r.error?.includes('already')).length,
      failed: results.filter(r => !r.success && !r.error?.includes('already')).length,
      results,
    };
  }

  static async approvePayslip(payslipId: string, requestedBy: string, institutionId: string) {
    const payslip = await prisma.payslip.findUnique({ where: { id: payslipId } });
    if (!payslip) throw new APIError('NOT_FOUND', 'Payslip not found.');
    if (payslip.status === 'PAID') throw new APIError('CONFLICT', 'Payslip already paid.');

    const updated = await prisma.payslip.update({
      where: { id: payslipId },
      data: { status: 'GENERATED' as PayslipStatus },
    });

    await AuditService.log(requestedBy, 'PAYSLIP_APPROVED', 'Payslip', payslipId);
    return updated;
  }

  static async markPayslipPaid(payslipId: string, requestedBy: string, institutionId: string) {
    const payslip = await prisma.payslip.update({
      where: { id: payslipId },
      data: { status: 'PAID' as PayslipStatus, paidAt: new Date() }
    });

    await AuditService.log(requestedBy, 'PAYSLIP_PAID', 'Payslip', payslipId, null, { status: 'PAID' });
    return payslip;
  }

  static async getPayslipById(payslipId: string) {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        faculty: {
          include: {
            department: { select: { name: true } },
            employeeProfile: true,
          }
        }
      }
    });
    if (!payslip) throw new APIError('NOT_FOUND', 'Payslip not found.');
    return payslip;
  }

  static async getPayslipHistory(facultyId?: string, year?: number) {
    const where: any = {};
    if (facultyId) where.facultyId = facultyId;
    if (year) where.year = year;

    return prisma.payslip.findMany({
      where,
      include: {
        faculty: { select: { name: true, employeeId: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 200,
    });
  }

  static async generatePayslipPDF(payslipId: string): Promise<string> {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        faculty: { include: { department: true, employeeProfile: true } }
      }
    });
    if (!payslip) throw new APIError('NOT_FOUND', 'Payslip not found.');

    const uploadDir = path.join(process.cwd(), 'uploads', 'payslips');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `payslip_${payslip.faculty.employeeId}_${payslip.month}_${payslip.year}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('KITS AKSHAR INSTITUTE OF TECHNOLOGY', { align: 'center' });
        doc.fontSize(12).text(`Payslip for Month: ${payslip.month}/${payslip.year}`, { align: 'center' });
        doc.moveDown();

        // Employee details
        doc.fontSize(10).text(`Employee Name: ${payslip.faculty.name}`);
        doc.text(`Employee ID: ${payslip.faculty.employeeId}`);
        doc.text(`Department: ${payslip.faculty.department.name}`);
        if (payslip.faculty.employeeProfile?.bankName) {
          doc.text(`Bank A/C: ${payslip.faculty.employeeProfile.accountNumber} (${payslip.faculty.employeeProfile.bankName})`);
        }
        doc.moveDown();

        // Earnings
        doc.fontSize(12).text('Earnings', { underline: true });
        doc.fontSize(10).text(`Basic Pay: ${payslip.basicPay}`);
        doc.text(`HRA: ${payslip.hra}`);
        doc.text(`DA: ${payslip.da}`);
        doc.text(`Allowances: ${payslip.allowances}`);
        doc.text(`Gross Salary: ${payslip.grossSalary}`);
        doc.moveDown();

        // Deductions
        doc.fontSize(12).text('Deductions', { underline: true });
        doc.fontSize(10).text(`Provident Fund: ${payslip.providentFund}`);
        doc.text(`Professional Tax: ${payslip.professionalTax}`);
        doc.text(`Other Deductions: ${payslip.otherDeductions}`);
        doc.text(`Total Deductions: ${payslip.totalDeductions}`);
        doc.moveDown();

        // Net
        doc.fontSize(14).text(`Net Salary: ${payslip.netSalary}`, { underline: true });
        
        doc.end();
        
        stream.on('finish', async () => {
          const relativePath = `/uploads/payslips/${fileName}`;
          await prisma.payslip.update({
            where: { id: payslip.id },
            data: { pdfPath: relativePath }
          });
          resolve(relativePath);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}
