import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateInstitution() {
  try {
    const updated = await prisma.institution.update({
      where: { id: 'KITSG' },
      data: { name: 'Kits Akshar Institute of Technology' }
    });
    console.log('Successfully updated institution name:', JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('Error updating institution:', err);
  } finally {
    await prisma.$disconnect();
  }
}

updateInstitution();
