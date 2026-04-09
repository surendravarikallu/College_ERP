import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const institutionId = 'KITSG'; // Existing KITSG Institution
  const username = '23jk1a0535';
  const password = '23jk1a0535';
  const name = 'bodapati subbi rami reddy';
  const departmentName = 'Computer Science and Engineering';
  const courseName = 'B.Tech CSE';
  const year = 3;

  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Ensure Department
  const department = await prisma.department.upsert({
    where: { id: 'dept_cse_kitsg' }, // Unique ID to prevent duplication
    update: {},
    create: {
      id: 'dept_cse_kitsg',
      institutionId,
      name: departmentName,
    },
  });

  // 2. Ensure Course
  const course = await prisma.course.upsert({
    where: { id: 'course_cse_kitsg' },
    update: {},
    create: {
      id: 'course_cse_kitsg',
      departmentId: department.id,
      name: courseName,
    },
  });

  // 3. Ensure Batch
  const batch = await prisma.batch.upsert({
    where: { id: 'batch_cse_3rd_year_kitsg' },
    update: {},
    create: {
      id: 'batch_cse_3rd_year_kitsg',
      courseId: course.id,
      year: year,
    },
  });

  // 4. Create User
  const user = await prisma.user.upsert({
    where: { email: username },
    update: { passwordHash },
    create: {
      email: username,
      passwordHash: passwordHash,
      role: Role.STUDENT,
      institutionId: institutionId,
    }
  });

  // 5. Create Student Profile
  const student = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: {
        firstName: 'bodapati subbi rami',
        lastName: 'reddy',
        enrollmentNo: username,
        batchId: batch.id
    },
    create: {
      userId: user.id,
      institutionId,
      firstName: 'bodapati subbi rami',
      lastName: 'reddy',
      enrollmentNo: username,
      batchId: batch.id,
    },
  });

  console.log('Seeded Student Successful:');
  console.log('User ID:', user.id);
  console.log('Student ID:', student.id);
  console.log('Username:', username);
  console.log('Password:', password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
