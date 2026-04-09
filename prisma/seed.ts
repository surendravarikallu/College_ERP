import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create a Default Institution explicitly mapping the requested ID
  const institution = await prisma.institution.upsert({
    where: { id: 'KITSG' },
    update: {},
    create: {
      id: 'KITSG',
      name: 'Academic Architect University',
    },
  });

  console.log(`✅ Institution Created/Verified: ${institution.name} (ID: ${institution.id})`);

  // 2. Generate a secure Salted Hash for the Admin password
  const plainPassword = 'admin123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  // 3. Create the SUPERADMIN User natively attaching them to the custom ID
  const adminEmail = 'admin'; // Acting as unique username
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      institutionId: institution.id,
      passwordHash: passwordHash
    },
    create: {
      institutionId: institution.id,
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin User created successfully with Salted Bcrypt Hash!');
  console.log('======================================================');
  console.log(`🔐 LOGIN CREDENTIALS`);
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
