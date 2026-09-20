import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- Simulating Payment Completion ---');

  // 1. Get a student
  const student = await prisma.student.findFirst();
  if (!student) {
    console.error('No students found in DB. Please create one first.');
    return;
  }
  console.log(`Using student: ${student.name} (${student.rollNumber})`);

  // 2. Get or create a fee structure
  let feeStructure = await prisma.feeStructureNew.findFirst();
  if (!feeStructure) {
    feeStructure = await prisma.feeStructureNew.create({
      data: {
        name: 'Tuition Fee 2025-26',
        feeType: 'TUITION',
        amount: 55000,
        academicYear: '2025-26',
        semester: 1
      }
    });
    console.log('Created new fee structure.');
  }

  // 3. Find a pending invoice or create one
  let invoice = await prisma.feeInvoice.findFirst({
    where: { studentId: student.id, status: 'PENDING' }
  });

  if (!invoice) {
    const count = await prisma.feeInvoice.count();
    invoice = await prisma.feeInvoice.create({
      data: {
        invoiceNumber: `TEST-PAY-${count + 1}`,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        amount: feeStructure.amount,
        finalAmount: feeStructure.amount,
        status: 'PENDING'
      }
    });
    console.log('Created new pending invoice.');
  }

  // 4. Simulate payment
  const amountToPay = invoice.finalAmount;
  await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: {
      status: 'SUCCESS',
      collectedAmount: amountToPay,
      paidAt: new Date()
    }
  });

  // 5. Create a transaction record
  await prisma.paymentTransaction.create({
    data: {
      invoiceId: invoice.id,
      razorpayOrderId: `order_mock_${Math.random().toString(36).substring(7)}`,
      razorpayPaymentId: `pay_mock_${Math.random().toString(36).substring(7)}`,
      amount: amountToPay,
      status: 'SUCCESS',
      webhookVerified: true
    }
  });

  console.log(`SUCCESS: Payment simulated for ₹${amountToPay}.`);
  console.log('Check your dashboard now - "Fee Collection" should have increased.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
