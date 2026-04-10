import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Database...\n');

  // ── 0. Create Default Institution ──
  const inst = await prisma.institution.create({
    data: {
      name: 'Kits Akshar Institute of Technology',
    },
  });
  console.log(`✅ Institution: ${inst.name} created`);

  // ── 1. Create Default Department ──
  const dept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: { institutionId: inst.id },
    create: { name: 'Computer Science & Engineering', code: 'CSE', institutionId: inst.id },
  });
  console.log(`✅ Department: ${dept.name} (${dept.code})`);

  // ── 2. Create Super Admin User ──
  const plainPassword = 'admin123';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin' },
    update: { passwordHash, institutionId: inst.id },
    create: {
      email: 'admin',
      passwordHash,
      role: 'SUPERADMIN',
      isActive: true,
      institutionId: inst.id,
    },
  });
  console.log(`✅ Super Admin user created (id: ${admin.id})`);

  // ── 3. Create a sample Faculty ──
  const facultyUser = await prisma.user.upsert({
    where: { email: 'faculty@kitsakshar.edu.in' },
    update: { passwordHash, institutionId: inst.id },
    create: {
      email: 'faculty@kitsakshar.edu.in',
      passwordHash,
      role: 'FACULTY',
      isActive: true,
      institutionId: inst.id,
    },
  });

  await prisma.facultyProfile.upsert({
    where: { userId: facultyUser.id },
    update: { institutionId: inst.id },
    create: {
      userId: facultyUser.id,
      institutionId: inst.id,
      firstName: 'Sample',
      lastName: 'Faculty',
      departmentId: dept.id,
    },
  });
  console.log(`✅ Sample Faculty created`);

  // ── 4. Create a sample Student ──
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@kitsakshar.edu.in' },
    update: { passwordHash, institutionId: inst.id },
    create: {
      email: 'student@kitsakshar.edu.in',
      passwordHash,
      role: 'STUDENT',
      isActive: true,
      institutionId: inst.id,
    },
  });

  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: { institutionId: inst.id },
    create: {
      userId: studentUser.id,
      institutionId: inst.id,
      enrollmentNo: '22CS001',
      firstName: 'Sample',
      lastName: 'Student',
    },
  });
  console.log(`✅ Sample Student created`);

  // ── Summary ──
  console.log('\n══════════════════════════════════════════');
  console.log('🔐 LOGIN CREDENTIALS');
  console.log('──────────────────────────────────────────');
  console.log(`Admin    → email: admin          / password: ${plainPassword}`);
  console.log(`Faculty  → email: faculty@kitsakshar.edu.in / password: ${plainPassword}`);
  console.log(`Student  → email: student@kitsakshar.edu.in / password: ${plainPassword}`);
  console.log('══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
