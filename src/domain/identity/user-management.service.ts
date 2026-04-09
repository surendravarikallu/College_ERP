import bcrypt from 'bcryptjs';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class UserManagementService {

  /**
   * Create a user with optional student/faculty profile in a single transaction.
   */
  static async createUser(tenantId: string, data: {
    email: string;
    password: string;
    role: string;
    firstName: string;
    lastName: string;
    // Student-specific
    enrollmentNo?: string;
    batchId?: string;
    // Faculty-specific
    departmentId?: string;
  }) {
    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new APIError('CONFLICT', `User with email ${email} already exists.`);

    const passwordHash = await bcrypt.hash(data.password.toLowerCase().trim(), 12);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          institutionId: tenantId,
          email,
          passwordHash,
          role: data.role as any,
          isActive: true,
        }
      });

      if (data.role === 'STUDENT' && data.enrollmentNo) {
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            institutionId: tenantId,
            firstName: data.firstName,
            lastName: data.lastName,
            enrollmentNo: data.enrollmentNo.toLowerCase().trim(),
            batchId: data.batchId || null,
          }
        });
      }

      if (['FACULTY', 'HOD', 'PRINCIPAL'].includes(data.role)) {
        await tx.facultyProfile.create({
          data: {
            userId: user.id,
            institutionId: tenantId,
            firstName: data.firstName,
            lastName: data.lastName,
            departmentId: data.departmentId || null,
          }
        });
      }

      return { id: user.id, email: user.email, role: user.role };
    });
  }

  /**
   * List users with profile data, paginated and filterable.
   */
  static async listUsers(tenantId: string, filters: { role?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: any = { institutionId: tenantId };
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search.toLowerCase(), mode: 'insensitive' } },
        { studentProfile: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { studentProfile: { enrollmentNo: { contains: filters.search.toLowerCase(), mode: 'insensitive' } } },
        { facultyProfile: { firstName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          studentProfile: { include: { batch: { include: { course: { include: { department: true } } } } } },
          facultyProfile: { include: { department: true } },
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        profile: u.studentProfile || u.facultyProfile || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  /**
   * Get a single user with full profile.
   */
  static async getUser(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, institutionId: tenantId },
      include: {
        studentProfile: { include: { batch: { include: { course: { include: { department: true } } } } } },
        facultyProfile: { include: { department: true } },
      }
    });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');
    return user;
  }

  /**
   * Update user details and profile.
   */
  static async updateUser(tenantId: string, userId: string, data: {
    isActive?: boolean;
    role?: string;
    firstName?: string;
    lastName?: string;
    batchId?: string;
    departmentId?: string;
  }) {
    const user = await prisma.user.findFirst({ where: { id: userId, institutionId: tenantId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');

    return prisma.$transaction(async (tx) => {
      if (data.isActive !== undefined || data.role) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            ...(data.role ? { role: data.role as any } : {}),
          }
        });
      }

      if (user.role === 'STUDENT' && (data.firstName || data.lastName || data.batchId)) {
        await tx.studentProfile.updateMany({
          where: { userId },
          data: {
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
            ...(data.batchId ? { batchId: data.batchId } : {}),
          }
        });
      }

      if (['FACULTY', 'HOD', 'PRINCIPAL'].includes(user.role) && (data.firstName || data.lastName || data.departmentId)) {
        await tx.facultyProfile.updateMany({
          where: { userId },
          data: {
            ...(data.firstName ? { firstName: data.firstName } : {}),
            ...(data.lastName ? { lastName: data.lastName } : {}),
            ...(data.departmentId ? { departmentId: data.departmentId } : {}),
          }
        });
      }

      return { success: true };
    });
  }

  /**
   * Admin-initiated password reset to a default value.
   */
  static async resetPassword(tenantId: string, userId: string, newPassword: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, institutionId: tenantId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');
    const hash = await bcrypt.hash(newPassword.toLowerCase().trim(), 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { success: true };
  }

  /**
   * User self-service password change.
   */
  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');

    const valid = await bcrypt.compare(oldPassword.toLowerCase().trim(), user.passwordHash);
    if (!valid) throw new APIError('UNAUTHORIZED', 'Current password is incorrect.');

    if (newPassword.length < 6) throw new APIError('BAD_REQUEST', 'New password must be at least 6 characters.');

    const hash = await bcrypt.hash(newPassword.toLowerCase().trim(), 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { success: true };
  }

  /**
   * Toggle user active status.
   */
  static async toggleActive(tenantId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, institutionId: tenantId } });
    if (!user) throw new APIError('NOT_FOUND', 'User not found.');
    const updated = await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
    return { id: updated.id, isActive: updated.isActive };
  }

  /**
   * Dashboard stats for admin user management page.
   */
  static async getUserStats(tenantId: string) {
    const [total, students, faculty, active, inactive] = await Promise.all([
      prisma.user.count({ where: { institutionId: tenantId } }),
      prisma.user.count({ where: { institutionId: tenantId, role: 'STUDENT' } }),
      prisma.user.count({ where: { institutionId: tenantId, role: { in: ['FACULTY', 'HOD', 'PRINCIPAL'] } } }),
      prisma.user.count({ where: { institutionId: tenantId, isActive: true } }),
      prisma.user.count({ where: { institutionId: tenantId, isActive: false } }),
    ]);
    return { total, students, faculty, staff: total - students - faculty, active, inactive };
  }
}
