import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { EmployeeType, LeaveStatus, PayslipStatus } from '@prisma/client';

export class HRService {
  /**
   * --- Employee Profile ---
   */
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

  static async getEmployeeProfile(facultyId: string) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: parseInt(facultyId) || 0 } as any,
      include: {
        employeeProfile: true,
        salaryStructure: true,
        leaveBalance: true
      } as any
    });
    if (!faculty) throw new APIError('NOT_FOUND', 'Faculty not found.');
    return faculty;
  }

  /**
   * --- Salary Structure ---
   */
  static async upsertSalaryStructure(facultyId: string, data: any, requestedBy: string, institutionId: string) {
    // Auto-calculate net salary
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

  /**
   * --- Leave Management ---
   */
  static async initializeLeaveBalance(facultyId: string, year: number) {
    const existing = await prisma.leaveBalance.findUnique({ where: { facultyId } });
    if (existing) return existing;

    return prisma.leaveBalance.create({
      data: { facultyId, year, casualLeaves: 12, sickLeaves: 12, earnedLeaves: 0 }
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

  /**
   * --- Payroll ---
   */
  static async generatePayslip(facultyId: string, month: number, year: number, requestedBy: string, institutionId: string) {
    const existing = await prisma.payslip.findUnique({
      where: { facultyId_month_year: { facultyId, month, year } }
    });
    if (existing) throw new APIError('CONFLICT', `Payslip for ${month}/${year} already generated.`);

    const structure = await prisma.salaryStructure.findUnique({ where: { facultyId } });
    if (!structure) throw new APIError('NOT_FOUND', 'Salary structure not found for faculty.');

    // Calculate Loss of Pay (LOP) based on leave days without balance (simple implementation)
    const lopDays = 0; // Advance logic would check attendance and leave balances
    const basicPay = structure.basicPay;
    const hra = structure.hra;
    const da = structure.da;
    const allowances = structure.allowances;
    
    let grossSalary = basicPay + hra + da + allowances;
    
    // Deduct LOP linearly
    if (lopDays > 0) {
      grossSalary = grossSalary * ((30 - lopDays) / 30);
    }

    const totalDeductions = structure.providentFund + structure.professionalTax + structure.deductions;
    const netSalary = grossSalary - totalDeductions;

    const payslip = await prisma.payslip.create({
      data: {
        facultyId,
        month,
        year,
        basicPay,
        hra,
        da,
        allowances,
        grossSalary,
        providentFund: structure.providentFund,
        professionalTax: structure.professionalTax,
        otherDeductions: structure.deductions,
        totalDeductions,
        netSalary,
        status: 'GENERATED' as PayslipStatus
      }
    });

    await AuditService.log(
      requestedBy,
      'PAYSLIP_GENERATED',
      'Payslip',
      payslip.id,
      null,
      { month, year, netSalary }
    );

    return payslip;
  }

  static async markPayslipPaid(payslipId: string, requestedBy: string, institutionId: string) {
    const payslip = await prisma.payslip.update({
      where: { id: payslipId },
      data: { status: 'PAID' as PayslipStatus, paidAt: new Date() }
    });

    await AuditService.log(
      requestedBy,
      'PAYSLIP_PAID',
      'Payslip',
      payslipId,
      null,
      { status: 'PAID' }
    );

    return payslip;
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
          // Save path to DB
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
