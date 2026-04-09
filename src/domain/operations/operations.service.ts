import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class LibraryService {

  // ===== BOOKS / COPIES =====
  static async addCopy(data: { bookId: string; status?: string }) {
    return prisma.libraryCopy.create({ data: { bookId: data.bookId, status: data.status || 'AVAILABLE' } });
  }

  static async listCopies(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [copies, total] = await Promise.all([
      prisma.libraryCopy.findMany({ where, skip: (page - 1) * limit, take: limit, include: { transactions: { orderBy: { issueDate: 'desc' }, take: 1 } } }),
      prisma.libraryCopy.count({ where }),
    ]);
    return { copies, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async updateCopyStatus(id: string, status: string) {
    return prisma.libraryCopy.update({ where: { id }, data: { status } });
  }

  // ===== TRANSACTIONS =====
  static async issueBook(data: { copyId: string; userId: string; dueDate: string }) {
    const copy = await prisma.libraryCopy.findUnique({ where: { id: data.copyId } });
    if (!copy) throw new APIError('NOT_FOUND', 'Book copy not found.');
    if (copy.status !== 'AVAILABLE') throw new APIError('CONFLICT', 'Book copy is not available for issue.');

    return prisma.$transaction(async (tx) => {
      const txn = await tx.libraryTransaction.create({
        data: { copyId: data.copyId, userId: data.userId, issueDate: new Date(), dueDate: new Date(data.dueDate) }
      });
      await tx.libraryCopy.update({ where: { id: data.copyId }, data: { status: 'ISSUED' } });
      return txn;
    });
  }

  static async returnBook(transactionId: string) {
    const txn = await prisma.libraryTransaction.findUnique({ where: { id: transactionId } });
    if (!txn) throw new APIError('NOT_FOUND', 'Transaction not found.');
    if (txn.returnDate) throw new APIError('CONFLICT', 'Book already returned.');

    const now = new Date();
    const overdueDays = Math.max(0, Math.floor((now.getTime() - txn.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const fineAmount = overdueDays * 5; // ₹5 per day late fine

    return prisma.$transaction(async (tx) => {
      await tx.libraryTransaction.update({ where: { id: transactionId }, data: { returnDate: now, fineAmount } });
      await tx.libraryCopy.update({ where: { id: txn.copyId }, data: { status: 'AVAILABLE' } });
      return { returned: true, overdueDays, fineAmount };
    });
  }

  static async listTransactions(filters: { userId?: string; overdue?: boolean; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.overdue) { where.returnDate = null; where.dueDate = { lt: new Date() }; }

    const [transactions, total] = await Promise.all([
      prisma.libraryTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, include: { copy: true }, orderBy: { issueDate: 'desc' } }),
      prisma.libraryTransaction.count({ where }),
    ]);
    return { transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getStats() {
    const [totalCopies, available, issued, lost, activeTransactions, overdue] = await Promise.all([
      prisma.libraryCopy.count(),
      prisma.libraryCopy.count({ where: { status: 'AVAILABLE' } }),
      prisma.libraryCopy.count({ where: { status: 'ISSUED' } }),
      prisma.libraryCopy.count({ where: { status: 'LOST' } }),
      prisma.libraryTransaction.count({ where: { returnDate: null } }),
      prisma.libraryTransaction.count({ where: { returnDate: null, dueDate: { lt: new Date() } } }),
    ]);
    return { totalCopies, available, issued, lost, activeTransactions, overdue };
  }
}

export class TransportService {

  static async listRoutes() {
    return prisma.route.findMany({ include: { routeStops: true, driverAllocations: { include: { vehicle: true } } } });
  }

  static async createRoute(data: { name: string; stops: string[] }) {
    return prisma.$transaction(async (tx) => {
      const route = await tx.route.create({ data: { name: data.name } });
      for (const stopName of data.stops) {
        await tx.routeStop.create({ data: { routeId: route.id, name: stopName } });
      }
      return route;
    });
  }

  static async listVehicles() {
    return prisma.vehicle.findMany({ include: { driverAllocations: { include: { route: true } } } });
  }

  static async createVehicle(data: { registrationNo: string; capacity: number }) {
    return prisma.vehicle.create({ data });
  }

  static async assignDriver(data: { vehicleId: string; routeId: string }) {
    return prisma.driverAllocation.create({ data });
  }

  static async issuePass(data: { studentId: string; routeStopId: string }) {
    const existing = await prisma.studentTransportPass.findFirst({ where: { studentId: data.studentId } });
    if (existing) throw new APIError('CONFLICT', 'Student already has an active pass.');
    return prisma.studentTransportPass.create({ data });
  }

  static async listPasses(filters: { routeStopId?: string }) {
    return prisma.studentTransportPass.findMany({
      where: filters.routeStopId ? { routeStopId: filters.routeStopId } : {},
      include: { student: true, routeStop: { include: { route: true } } }
    });
  }

  static async revokePass(passId: string) {
    return prisma.studentTransportPass.delete({ where: { id: passId } });
  }

  static async getStats() {
    const [totalRoutes, totalVehicles, totalPasses] = await Promise.all([
      prisma.route.count(),
      prisma.vehicle.count(),
      prisma.studentTransportPass.count(),
    ]);
    return { totalRoutes, totalVehicles, totalPasses };
  }
}

export class InventoryService {

  static async createAsset(data: { name: string }) {
    return prisma.inventoryAsset.create({ data: { name: data.name, status: 'AVAILABLE' } });
  }

  static async listAssets(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [assets, total] = await Promise.all([
      prisma.inventoryAsset.findMany({ where, skip: (page - 1) * limit, take: limit, include: { allocations: { orderBy: { dateIssued: 'desc' }, take: 1 } } }),
      prisma.inventoryAsset.count({ where }),
    ]);
    return { assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async allocateAsset(data: { assetId: string; allocatedTo: string }) {
    const asset = await prisma.inventoryAsset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new APIError('NOT_FOUND', 'Asset not found.');
    if (asset.status !== 'AVAILABLE') throw new APIError('CONFLICT', 'Asset is not available.');

    return prisma.$transaction(async (tx) => {
      const alloc = await tx.inventoryAllocation.create({ data: { assetId: data.assetId, allocatedTo: data.allocatedTo, dateIssued: new Date() } });
      await tx.inventoryAsset.update({ where: { id: data.assetId }, data: { status: 'DEPLOYED' } });
      return alloc;
    });
  }

  static async returnAsset(allocationId: string) {
    const alloc = await prisma.inventoryAllocation.findUnique({ where: { id: allocationId } });
    if (!alloc) throw new APIError('NOT_FOUND', 'Allocation not found.');
    if (alloc.dateReturned) throw new APIError('CONFLICT', 'Already returned.');

    return prisma.$transaction(async (tx) => {
      await tx.inventoryAllocation.update({ where: { id: allocationId }, data: { dateReturned: new Date() } });
      await tx.inventoryAsset.update({ where: { id: alloc.assetId }, data: { status: 'AVAILABLE' } });
      return { returned: true };
    });
  }

  static async updateAssetStatus(id: string, status: string) {
    return prisma.inventoryAsset.update({ where: { id }, data: { status } });
  }

  static async getStats() {
    const [total, available, deployed, maintenance, damaged] = await Promise.all([
      prisma.inventoryAsset.count(),
      prisma.inventoryAsset.count({ where: { status: 'AVAILABLE' } }),
      prisma.inventoryAsset.count({ where: { status: 'DEPLOYED' } }),
      prisma.inventoryAsset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.inventoryAsset.count({ where: { status: 'DAMAGED' } }),
    ]);
    return { total, available, deployed, maintenance, damaged };
  }
}
