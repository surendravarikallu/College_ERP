import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  console.log('🌱 Seeding KITS Akshar ERP...\n');

  // 1. Institution
  const institution = await prisma.institution.upsert({
    where: { id: 'KITSG' },
    update: { name: 'Kits Akshar Institute of Technology' },
    create: { id: 'KITSG', name: 'Kits Akshar Institute of Technology' },
  });
  const iid = institution.id;

  // 2. Admin user
  await prisma.user.upsert({
    where: { email: 'admin@kits.edu' },
    update: {},
    create: {
      id: (await import('crypto')).randomUUID(),
      email: 'admin@kits.edu',
      passwordHash: await hash('Admin@123'),
      role: 'SUPER_ADMIN',
      institutionId: iid,
      isActive: true,
    },
  });
  console.log('✅ Admin: admin@kits.edu / Admin@123');

  // 3. Departments
  const deptDefs = [
    { id: 'DEPT-CSE', code: 'CSE', name: 'Computer Science & Engineering' },
    { id: 'DEPT-ECE', code: 'ECE', name: 'Electronics & Communication Engineering' },
    { id: 'DEPT-EEE', code: 'EEE', name: 'Electrical & Electronics Engineering' },
    { id: 'DEPT-MECH', code: 'MECH', name: 'Mechanical Engineering' },
    { id: 'DEPT-MCA', code: 'MCA', name: 'Master of Computer Applications' },
  ];
  const deptMap: Record<string, string> = {};
  for (const d of deptDefs) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: { id: d.id, code: d.code, name: d.name, institutionId: iid },
    });
    deptMap[d.code] = dept.id;
  }
  console.log('✅ Departments:', deptDefs.map(d => d.code).join(', '));

  // 4. CSE Subjects (semesters 1–4)
  const subjects = [
    { code: 'CS101', name: 'Programming in C', sem: 1, credits: 4 },
    { code: 'CS102', name: 'Mathematics I', sem: 1, credits: 4 },
    { code: 'CS103', name: 'Engineering Physics', sem: 1, credits: 3 },
    { code: 'CS104L', name: 'C Programming Lab', sem: 1, credits: 2, isLab: true },
    { code: 'CS201', name: 'Data Structures', sem: 2, credits: 4 },
    { code: 'CS202', name: 'Object Oriented Programming', sem: 2, credits: 4 },
    { code: 'CS203', name: 'Mathematics II', sem: 2, credits: 4 },
    { code: 'CS204L', name: 'OOPS Lab', sem: 2, credits: 2, isLab: true },
    { code: 'CS301', name: 'Design & Analysis of Algorithms', sem: 3, credits: 4 },
    { code: 'CS302', name: 'Database Management Systems', sem: 3, credits: 4 },
    { code: 'CS303', name: 'Operating Systems', sem: 3, credits: 4 },
    { code: 'CS304L', name: 'DBMS Lab', sem: 3, credits: 2, isLab: true },
    { code: 'CS401', name: 'Computer Networks', sem: 4, credits: 4 },
    { code: 'CS402', name: 'Web Technologies', sem: 4, credits: 3 },
  ];
  for (const s of subjects) {
    await prisma.newSubject.upsert({
      where: { code: s.code },
      update: {},
      create: {
        code: s.code, name: s.name, semester: s.sem, credits: s.credits,
        departmentId: deptMap['CSE'], isLab: s.isLab || false, regulation: 'R20',
      },
    });
  }
  console.log(`✅ CSE Subjects: ${subjects.length}`);

  // 5. Faculty (5 CSE faculty)
  const facultyDefs = [
    { email: 'dr.rao@kits.edu', name: 'Dr. V. Srinivasa Rao', empId: 'EMP001', designation: 'Professor', basic: 75000 },
    { email: 'mr.kumar@kits.edu', name: 'Mr. K. Ramesh Kumar', empId: 'EMP002', designation: 'Associate Professor', basic: 60000 },
    { email: 'ms.priya@kits.edu', name: 'Ms. P. Lakshmi Priya', empId: 'EMP003', designation: 'Assistant Professor', basic: 50000 },
    { email: 'dr.sharma@kits.edu', name: 'Dr. A. Sharma', empId: 'EMP004', designation: 'Associate Professor', basic: 65000 },
    { email: 'mr.reddy@kits.edu', name: 'Mr. B. Narasimha Reddy', empId: 'EMP005', designation: 'Assistant Professor', basic: 50000 },
  ];
  const facultyIds: string[] = [];
  for (const f of facultyDefs) {
    const fUser = await prisma.user.upsert({
      where: { email: f.email },
      update: {},
      create: { 
        id: (await import('crypto')).randomUUID(),
        email: f.email, 
        passwordHash: await hash('Faculty@123'), 
        role: 'FACULTY', 
        institutionId: iid, 
        isActive: true 
      },
    });
    const faculty = await (prisma.faculty as any).upsert({
      where: { employeeId: f.empId },
      update: {},
      create: { userId: fUser.id, name: f.name, employeeId: f.empId, departmentId: deptMap['CSE'], designation: f.designation, isActive: true },
    });
    facultyIds.push(faculty.id);

    // Salary structure
    await prisma.salaryStructure.upsert({
      where: { facultyId: faculty.id },
      update: {},
      create: {
        facultyId: faculty.id, basicPay: f.basic,
        hra: Math.round(f.basic * 0.2), da: Math.round(f.basic * 0.1),
        allowances: 5000, providentFund: Math.round(f.basic * 0.12),
        professionalTax: 200, deductions: 0, netSalary: 0,
      },
    });

    // Leave balance
    await prisma.leaveBalance.upsert({
      where: { facultyId: faculty.id },
      update: {},
      create: { facultyId: faculty.id, year: 2024, casualLeaves: 12, sickLeaves: 12, earnedLeaves: 0 },
    });
  }
  console.log(`✅ Faculty: ${facultyDefs.length} (Login: dr.rao@kits.edu / Faculty@123)`);

  // 6. Course & Batch
  await prisma.course.upsert({
    where: { id: 'COURSE-CSE' },
    update: {},
    create: { id: 'COURSE-CSE', name: 'B.Tech CSE', departmentId: deptMap['CSE'] },
  }).catch(() => {});

  const batch = await prisma.batch.upsert({
    where: { id: 'BATCH-CSE-22' },
    update: {},
    create: { id: 'BATCH-CSE-22', year: 2022, courseId: 'COURSE-CSE', isActive: true },
  }).catch(async () => {
    return prisma.batch.upsert({
      where: { id: 'BATCH-CSE-22' },
      update: {},
      create: { id: 'BATCH-CSE-22', year: 2022, courseId: 'COURSE-CSE', isActive: true },
    });
  });
  const batchId = batch?.id || 'BATCH-CSE-22';

  // 7. Students (20 students)
  const names = [
    'Arjun Reddy', 'Priya Sharma', 'Rahul Kumar', 'Ananya Singh', 'Karthik Rao',
    'Divya Patel', 'Suresh Nair', 'Meghana Iyer', 'Vikram Desai', 'Pooja Verma',
    'Aditya Gupta', 'Sravani Raju', 'Harish Bhat', 'Kavitha Chandra', 'Nithin Shetty',
    'Swathi Naidu', 'Rajesh Pillai', 'Deepika Mohan', 'Sunil Krishnan', 'Lavanya Subbu',
  ];
  for (let i = 0; i < names.length; i++) {
    const roll = `22CSE${String(i + 1).padStart(3, '0')}`;
    const email = `${roll.toLowerCase()}@kits.edu`;
    const sUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { 
        id: (await import('crypto')).randomUUID(),
        email, 
        passwordHash: await hash('Student@123'), 
        role: 'STUDENT', 
        institutionId: iid, 
        isActive: true 
      },
    });
    await prisma.student.upsert({
      where: { rollNumber: roll },
      update: {},
      create: { userId: sUser.id, name: names[i], rollNumber: roll, departmentId: deptMap['CSE'], batchId, semester: 3, isActive: true },
    });
  }
  console.log('✅ Students: 20 (22CSE001–22CSE020, Login: 22cse001@kits.edu / Student@123)');

  // 8. Faculty-subject mappings
  const sem3Subjects = await prisma.newSubject.findMany({
    where: { departmentId: deptMap['CSE'], semester: 3 },
  });
  for (let i = 0; i < sem3Subjects.length && i < facultyIds.length; i++) {
    await prisma.facultySubjectMapping.upsert({
      where: {
        facultyId_subjectId_semester_academicYear: {
          facultyId: facultyIds[i], subjectId: sem3Subjects[i].id,
          semester: 3, academicYear: '2024-25',
        },
      },
      update: {},
      create: {
        facultyId: facultyIds[i], subjectId: sem3Subjects[i].id,
        batchId, semester: 3, academicYear: '2024-25', isActive: true,
      },
    });
  }
  console.log('✅ Faculty-subject mappings created');

  // 9. Fee structure
  await prisma.feeStructureNew.upsert({
    where: { id: 'FEE-2024-TUT' },
    update: {},
    create: {
      id: 'FEE-2024-TUT', name: 'Tuition Fee Sem 3',
      feeType: 'TUITION', amount: 75000, academicYear: '2024-25',
      dueDate: new Date('2024-11-30'), isActive: true,
    },
  });

  // 10. Exam session
  await prisma.examSession.upsert({
    where: { id: 'EXAM-MID1-2024' },
    update: {},
    create: {
      id: 'EXAM-MID1-2024', name: 'Mid-1 Examinations Nov 2024',
      examType: 'MID1', semester: 3, academicYear: '2024-25',
      startDate: new Date('2024-11-01'), endDate: new Date('2024-11-07'),
      isLocked: false,
    },
  });

  // 11. Library books
  const books = [
    { isbn: '978-0-13-468599-1', title: 'Introduction to Algorithms', author: 'Cormen et al.', copies: 5 },
    { isbn: '978-0-13-110362-7', title: 'The C Programming Language', author: 'Kernighan & Ritchie', copies: 8 },
    { isbn: '978-0-596-51774-8', title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', copies: 4 },
    { isbn: '978-0-13-235088-4', title: 'Clean Code', author: 'Robert C. Martin', copies: 6 },
    { isbn: '978-0-13-468001-9', title: 'Computer Networks', author: 'Andrew Tanenbaum', copies: 7 },
  ];
  for (const b of books) {
    await prisma.libraryBook.upsert({
      where: { isbn: b.isbn },
      update: {},
      create: { isbn: b.isbn, title: b.title, author: b.author, totalCopies: b.copies, availableCopies: b.copies, isActive: true },
    });
  }
  console.log('✅ Library books: 5');

  // 12. Settings
  const defaultSettings = [
    { key: 'academicYear', value: '2024-2025' },
    { key: 'currentSemester', value: 'ODD' },
    { key: 'attendanceThreshold', value: '75' },
    { key: 'emailNotifications', value: 'true' },
    { key: 'autoLockMarks', value: 'true' },
    { key: 'institutionName', value: 'Kits Akshar Institute of Technology' },
  ];
  for (const s of defaultSettings) {
    const crypto = await import('crypto');
    await prisma.settings.upsert({
      where: { institutionId_key: { institutionId: iid, key: s.key } },
      update: {},
      create: { id: crypto.randomUUID(), institutionId: iid, key: s.key, value: s.value },
    });
  }
  console.log('✅ Default settings configured\n');

  console.log('═══════════════════════════════════════════════════');
  console.log('🎓  SEED COMPLETE — KITS Akshar ERP ready');
  console.log('═══════════════════════════════════════════════════');
  console.log('ADMIN:    admin@kits.edu          / Admin@123');
  console.log('FACULTY:  dr.rao@kits.edu         / Faculty@123');
  console.log('STUDENT:  22cse001@kits.edu       / Student@123');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
