import { prisma } from '../../core/database/prisma.client';

export class NotificationService {

  static async create(data: {
    userId: string;
    studentId?: string;
    type: string;
    title: string;
    body: string;
    metadata?: any;
  }) {
    return prisma.notification.create({ 
      data: {
        id: `notif-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.body
      } 
    });
  }

  static async createBulk(notifications: Array<{
    userId: string;
    studentId?: string;
    type: string;
    title: string;
    body: string;
    metadata?: any;
  }>) {
    const formatted = notifications.map((n, i) => ({
        id: `notif-${Date.now()}-${i}`,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.body
    }));
    return prisma.notification.createMany({ data: formatted });
  }

  static async getNotifications(userId: string, page: number = 1, limit: number = 20) {
    limit = Math.min(limit, 100);
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    
    // Map message back to body for frontend compatibility
    const mapped = notifications.map(n => ({...n, body: n.message}));
    return { notifications: mapped, unreadCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
