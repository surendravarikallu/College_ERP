import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const institutions = await prisma.institution.findMany();
  console.log('Institutions:', institutions);

  const departments = await prisma.department.findMany({ include: { institution: true } });
  console.log('Departments:', departments);

  const courses = await prisma.course.findMany({ include: { department: true } });
  console.log('Courses:', courses);

  const batches = await prisma.batch.findMany({ include: { course: true } });
  console.log('Batches:', batches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
