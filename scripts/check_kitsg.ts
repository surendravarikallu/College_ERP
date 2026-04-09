import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInstitution() {
  try {
    const institutions = await prisma.institution.findMany();
    console.log('Institutions found:', JSON.stringify(institutions, null, 2));
    
    const kitsg = institutions.find(inst => inst.id === 'KITSG' || inst.name.includes('KITSG'));
    if (kitsg) {
      console.log('KITSG Found:', JSON.stringify(kitsg, null, 2));
    } else {
      console.log('KITSG not found in top levels.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstitution();
