import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Adding ₹5000 Fee to Surendra ---');

  const student = await prisma.student.findFirst({
    where: { name: { contains: 'Surendra', mode: 'insensitive' } }
  });

  if (!student) {
    console.error('Student Surendra not found.');
    return;
  }

  // Create a fee structure for this test
  const feeStructure = await prisma.feeStructureNew.create({
    data: {
      name: 'Special Lab Fee',
      feeType: 'LAB',
      amount: 5000,
      academicYear: '2025-26',
      semester: 1
    }
  });

  // Create the invoice
  const count = await prisma.feeInvoice.count();
  const invoice = await prisma.feeInvoice.create({
    data: {
      invoiceNumber: `FEE-MAN-${count + 1}`,
      studentId: student.id,
      feeStructureId: feeStructure.id,
      amount: 5000,
      finalAmount: 5000,
      status: 'PENDING',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  console.log(`SUCCESS: Added ₹5000 fee (Invoice: ${invoice.invoiceNumber}) to ${student.name}.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
