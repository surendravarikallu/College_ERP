import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';
import { AuditService } from '../audit/audit.service';
import bcrypt from 'bcrypt';

export class AdminService {
  /**
   * --- Users Administration ---
   */
  static async listUsers(
    institutionId: string,
    filters: { role?: string; search?: string; page?: number; limit?: number }
  ) {
    const { role, search, page = 1, limit = 50 } = filters;
    const where: any = { institutionId };
    
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { 
          StudentProfile: { 
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { enrollmentNo: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        {
          FacultyProfile: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
            ]
          }
        }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          StudentProfile: { select: { firstName: true, lastName: true, enrollmentNo: true } },
          FacultyProfile: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Normalize profile data for the frontend
    const normalizedUsers = users.map(u => ({
      ...u,
      profile: u.StudentProfile || u.FacultyProfile || null,
    }));

    return {
      users: normalizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createUser(data: {
    email: string;
    password: string;
    role: string;
    firstName: string;
    lastName: string;
    enrollmentNo?: string;
    departmentId?: string;
    batchId?: string;
  }, requestedBy: string, institutionId: string) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new APIError('CONFLICT', 'A user with this email already exists.');

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Validate departmentId for roles that require it
    if (['FACULTY', 'HOD', 'PRINCIPAL'].includes(data.role)) {
      if (!data.departmentId) {
        throw new APIError('BAD_REQUEST', 'Department is required for Faculty / HOD / Principal roles.');
      }
      const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!dept) {
        throw new APIError('NOT_FOUND', 'Selected department does not exist.');
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: require('crypto').randomUUID(),
          institutionId,
          email: data.email,
          passwordHash,
          role: data.role as any,
          isActive: true,
        }
      });

      // Create profile based on role
      if (data.role === 'STUDENT') {
        await tx.student.create({
          data: {
            userId: newUser.id,
            name: `${data.firstName} ${data.lastName}`,
            rollNumber: data.enrollmentNo || `STU-${Date.now()}`,
            departmentId: data.departmentId || '',
            batchId: data.batchId || null,
          }
        });
        await tx.studentProfile.create({
          data: {
            id: require('crypto').randomUUID(),
            userId: newUser.id,
            institutionId,
            firstName: data.firstName,
            lastName: data.lastName,
            enrollmentNo: data.enrollmentNo || `STU-${Date.now()}`,
            batchId: data.batchId || null,
          }
        });
      } else if (['FACULTY', 'HOD', 'PRINCIPAL'].includes(data.role)) {
        const empId = `FAC-${Date.now().toString().slice(-6)}`;
        await (tx.faculty as any).create({
          data: {
            userId: newUser.id,
            name: `${data.firstName} ${data.lastName}`,
            employeeId: empId,
            departmentId: data.departmentId || '',
          }
        });
        await tx.facultyProfile.create({
          data: {
            id: require('crypto').randomUUID(),
            userId: newUser.id,
            institutionId,
            firstName: data.firstName,
            lastName: data.lastName,
            departmentId: data.departmentId || null,
          }
        });
      }

      return newUser;
    });

    await AuditService.log(requestedBy, 'USER_CREATED', 'User', user.id, null, { email: data.email, role: data.role });
    return user;
  }

  static async getUserStats(institutionId: string) {
    const [total, students, faculty, staff, active, inactive] = await Promise.all([
      prisma.user.count({ where: { institutionId } }),
      prisma.user.count({ where: { institutionId, role: 'STUDENT' } }),
      prisma.user.count({ where: { institutionId, role: { in: ['FACULTY', 'HOD', 'PRINCIPAL'] } } }),
      prisma.user.count({ where: { institutionId, role: 'STAFF' } }),
      prisma.user.count({ where: { institutionId, isActive: true } }),
      prisma.user.count({ where: { institutionId, isActive: false } }),
    ]);
    return { total, students, faculty, staff, active, inactive };
  }

  static async resetUserPassword(userId: string, newPassword: string, requestedBy: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await AuditService.log(requestedBy, 'PASSWORD_RESET', 'User', userId, null, { by: requestedBy });
    return { success: true };
  }

  static async updateUserStatus(userId: string, requestedBy: string, institutionId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, isActive: true }
    });

    await AuditService.log(
      requestedBy,
      isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      'User',
      userId,
      { isActive: user.isActive },
      { isActive }
    );

    return updated;
  }

  /**
   * --- Settings ---
   */
  static async getSettings(institutionId: string) {
    const rows = await prisma.settings.findMany({ where: { institutionId } });
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  }

  static async updateSettings(institutionId: string, data: Record<string, any>, requestedBy: string) {
    const ops = Object.entries(data).map(([key, value]) =>
      prisma.settings.upsert({
        where: { institutionId_key: { institutionId, key } },
        create: { id: require('crypto').randomUUID(), institutionId, key, value: String(value) },
        update: { value: String(value) },
      })
    );
    await prisma.$transaction(ops);
    await AuditService.log(requestedBy, 'SETTINGS_UPDATED', 'Settings', 'SYSTEM', null, data);
    return { success: true };
  }

  /**
   * --- Departments Administration ---
   */
  static async listDepartments(institutionId: string) {
    return prisma.department.findMany({
      where: { institutionId },
      include: {
        _count: {
          select: { students: true, facultyNew: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async createDepartment(data: { institutionId: string; name: string; code: string }, requestedBy: string) {
    const existing = await prisma.department.findFirst({
      where: { institutionId: data.institutionId, OR: [{ name: data.name }, { code: data.code }] }
    });
    if (existing) throw new APIError('CONFLICT', 'Department with this name or code already exists.');

    const dept = await prisma.department.create({
      data: {
        id: require('crypto').randomUUID(),
        institutionId: data.institutionId,
        name: data.name,
        code: data.code
      }
    });

    await AuditService.log(
      requestedBy,
      'DEPARTMENT_CREATED',
      'Department',
      dept.id,
      null,
      { name: dept.name, code: dept.code }
    );

    return dept;
  }

  /**
   * --- Subjects Administration ---
   */
  static async listSubjects(departmentId: string, semester?: number) {
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (semester) where.semester = semester;

    return prisma.newSubject.findMany({
      where,
      orderBy: [
        { semester: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  static async createSubject(data: { name: string; code: string; departmentId: string; semester: number; credits?: number; isLab?: boolean }, requestedBy: string, institutionId: string) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new APIError('NOT_FOUND', 'Department not found.');

    const subject = await prisma.newSubject.create({
      data
    });

    await AuditService.log(
      requestedBy,
      'SUBJECT_CREATED',
      'NewSubject',
      subject.id,
      null,
      data as any
    );

    return subject;
  }

  /**
   * --- Batches Administration ---
   */
  static async listBatches(courseId?: string) {
    const where: any = {};
    if (courseId) where.courseId = courseId;
    return prisma.batch.findMany({
      where,
      orderBy: { year: 'desc' }
    });
  }

  /**
   * --- Faculty-Subject Mapping ---
   */
  static async assignSubjectToFaculty(data: { facultyId: string; subjectId: string; batchId?: string; semester: number; academicYear: string }, requestedBy: string, institutionId: string) {
    const existing = await prisma.facultySubjectMapping.findUnique({
      where: {
        facultyId_subjectId_semester_academicYear: {
          facultyId: data.facultyId,
          subjectId: data.subjectId,
          semester: data.semester,
          academicYear: data.academicYear
        }
      }
    });

    if (existing) {
      if (existing.isActive) throw new APIError('CONFLICT', 'Faculty is already assigned to this subject this term.');
      // Reactivate
      const updated = await prisma.facultySubjectMapping.update({
        where: { id: existing.id },
        data: { isActive: true }
      });
      return updated;
    }

    const mapping = await prisma.facultySubjectMapping.create({
      data
    });

    await AuditService.log(
      requestedBy,
      'FACULTY_SUBJECT_ASSIGNED',
      'FacultySubjectMapping',
      mapping.id,
      null,
      data as any
    );

    return mapping;
  }

  static async getMySubjects(facultyId: string, academicYear: string, semester?: number) {
    const where: any = { facultyId, academicYear, isActive: true };
    if (semester) where.semester = semester;

    const mappings = await prisma.facultySubjectMapping.findMany({
      where,
      include: {
        subject: true
      }
    });

    return mappings.map(m => m.subject);
  }

  static async getStudentsBySubject(subjectId: string, batchId?: string) {
    const subject = await prisma.newSubject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new APIError('NOT_FOUND', 'Subject not found');

    const where: any = {
      departmentId: subject.departmentId,
      semester: subject.semester,
      isActive: true
    };
    if (batchId) where.batchId = batchId;

    return prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        rollNumber: true
      },
      orderBy: { rollNumber: 'asc' }
    });
  }
}
