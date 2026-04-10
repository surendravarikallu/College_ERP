import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create or verify the default institution
  const institution = await prisma.institution.upsert({
    where: { id: 'KITSG' },
    update: {},
    create: {
      id: 'KITSG',
      name: 'Kits Akshar Institute of Technology',
    },
  });
  console.log(`✅ Institution Created/Verified: ${institution.name} (ID: ${institution.id})`);

  // 2. Create the admin user with salted bcrypt hash
  const plainPassword = 'admin123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  const adminEmail = 'admin';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      institutionId: institution.id,
      passwordHash,
    },
    create: {
      institutionId: institution.id,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin User created successfully with Salted Bcrypt Hash!');
  console.log('======================================================');
  console.log('🔐 LOGIN CREDENTIALS');
  console.log(`Institution ID : ${institution.id}`);
  console.log(`Email          : ${adminEmail}`);
  console.log(`Password       : ${plainPassword}`);
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
