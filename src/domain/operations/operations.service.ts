import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';


export class TransportService {

  static async createRoute(data: { routeName: string; routeNumber: string; stops: any; timings: any; monthlyFee: number }) {
    const existing = await prisma.transportRouteNew.findUnique({ where: { routeNumber: data.routeNumber } });
    if (existing) throw new APIError('CONFLICT', 'Route number already exists.');

    return prisma.transportRouteNew.create({
      data: {
        routeName: data.routeName,
        routeNumber: data.routeNumber,
        stops: data.stops,
        timings: data.timings,
        monthlyFee: data.monthlyFee
      }
    });
  }

  static async listRoutes() {
    return prisma.transportRouteNew.findMany({
      orderBy: { routeNumber: 'asc' },
      include: {
        _count: { select: { passes: { where: { isActive: true } } } }
      }
    });
  }

  static async issuePass(data: { studentId: string; routeId: string; boardingStop: string; validFrom: string; validUntil: string }) {
    const route = await prisma.transportRouteNew.findUnique({ where: { id: data.routeId } });
    if (!route) throw new APIError('NOT_FOUND', 'Route not found.');

    const activePass = await prisma.transportPassNew.findFirst({
      where: { studentId: data.studentId, isActive: true }
    });
    if (activePass) throw new APIError('CONFLICT', 'Student already has an active transport pass.');

    return prisma.transportPassNew.create({
      data: {
        studentId: data.studentId,
        routeId: data.routeId,
        boardingStop: data.boardingStop,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil)
      }
    });
  }

  static async revokePass(passId: string) {
    const pass = await prisma.transportPassNew.findUnique({ where: { id: passId } });
    if (!pass) throw new APIError('NOT_FOUND', 'Transport pass not found.');

    return prisma.transportPassNew.update({
      where: { id: passId },
      data: { isActive: false, validUntil: new Date() }
    });
  }

  static async getStats() {
    const [totalRoutes, activePasses] = await Promise.all([
      prisma.transportRouteNew.count({ where: { isActive: true } }),
      prisma.transportPassNew.count({ where: { isActive: true } })
    ]);
    return { totalRoutes, activePasses };
  }
}
