import { prisma } from '../src/core/database/prisma.client';
import { FinanceService } from '../src/domain/finance/finance.service';
import fs from 'fs';
import path from 'path';

async function testReceipts() {
  try {
    const invoice = await prisma.feeInvoice.findFirst({
      where: { status: 'SUCCESS' },
      select: { id: true }
    });

    if (!invoice) {
        console.log('No paid invoice found. Please ensure there is at least one SUCCESS invoice in the DB.');
        return;
    }

    console.log(`Using invoice ID: ${invoice.id}`);

    // Test Staff Version (2 copies)
    const staffBuffer = await FinanceService.generateReceipt(invoice.id, true);
    const staffPath = path.join(process.cwd(), 'client', 'public', 'test_staff_receipt.pdf');
    fs.writeFileSync(staffPath, staffBuffer);
    console.log(`✅ Staff receipt generated: ${staffPath}`);

    // Test Student Version (1 copy)
    const studBuffer = await FinanceService.generateReceipt(invoice.id, false);
    const studPath = path.join(process.cwd(), 'client', 'public', 'test_student_receipt.pdf');
    fs.writeFileSync(studPath, studBuffer);
    console.log(`✅ Student receipt generated: ${studPath}`);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testReceipts();
