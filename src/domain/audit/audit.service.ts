import { prisma } from '../../core/database/prisma.client';
import { Request } from 'express';

export class AuditService {
  /**
   * Log an audit event.
   */
  static async log(
    userId: string,
    action: string,
    resourceTable: string,
    resourceId?: string | null,
    oldValues?: any,
    newValues?: any,
    req?: Request
  ) {
    try {
      // Find user institution id
      let institutionId = 'DEFAULT';
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { institutionId: true } });
        if (user) institutionId = user.institutionId;
      }

      await prisma.auditLog.create({
        data: {
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          institutionId,
          userId,
          action,
          resourceTable,
          resourceId: resourceId || "SYSTEM",
          oldValues: oldValues || null,
          newValues: newValues || null,
          correlationId: req?.headers['x-correlation-id'] as string || null,
        },
      });
    } catch (err) {
      // Non-blocking: don't crash the main operation if audit logging fails
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  /**
   * Query audit logs with pagination and filters.
   */
  static async getAuditLogs(filters: {
    userId?: string;
    resourceTable?: string;
    action?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.resourceTable) where.resourceTable = filters.resourceTable;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { User: { select: { id: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
