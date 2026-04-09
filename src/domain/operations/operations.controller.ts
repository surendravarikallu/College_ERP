import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { LibraryService, TransportService, InventoryService } from './operations.service';
import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class OperationsController {

  // ===== HOSTEL =====
  static async allocateBed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const result = await prisma.$transaction(async (tx: any) => {
        const rooms = await tx.$queryRaw<any[]>`SELECT id, capacity FROM "HostelRoom" WHERE id = ${data.roomId} FOR UPDATE`;
        if (!rooms.length) throw new APIError('NOT_FOUND', 'Room not found.');
        const activeBeds = await tx.bedAllocation.count({ where: { roomId: rooms[0].id, status: 'ACTIVE' } });
        if (activeBeds >= rooms[0].capacity) throw new APIError('CONFLICT', 'Room is full.');
        const dup = await tx.bedAllocation.findFirst({ where: { studentId: data.studentId, status: 'ACTIVE' } });
        if (dup) throw new APIError('CONFLICT', 'Student already has an active bed.');
        const alloc = await tx.bedAllocation.create({ data: { ...data, status: 'ACTIVE' } });
        await tx.hostelHistoryLog.create({ data: { studentId: data.studentId, roomId: data.roomId, action: 'CHECK_IN', date: new Date() } });
        return alloc;
      });
      res.status(201).json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  static async deallocateBed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const alloc = await prisma.bedAllocation.findUnique({ where: { id: req.params.id } });
      if (!alloc) throw new APIError('NOT_FOUND', 'Allocation not found.');
      await prisma.$transaction(async (tx) => {
        await tx.bedAllocation.update({ where: { id: req.params.id }, data: { status: 'VACATED', allocatedTo: new Date() } });
        await tx.hostelHistoryLog.create({ data: { studentId: alloc.studentId, roomId: alloc.roomId, action: 'CHECK_OUT', date: new Date() } });
      });
      res.json({ success: true, data: { deallocated: true } });
    } catch (e) { next(e); }
  }

  static async listRooms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rooms = await prisma.hostelRoom.findMany({ include: { bedAllocations: { where: { status: 'ACTIVE' }, include: { student: true } } } });
      res.json({ success: true, data: rooms });
    } catch (e) { next(e); }
  }

  static async createRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const room = await prisma.hostelRoom.create({ data: { roomNo: req.body.roomNo, capacity: req.body.capacity } });
      res.status(201).json({ success: true, data: room });
    } catch (e) { next(e); }
  }

  static async getHostelStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [totalRooms, totalBeds, occupiedBeds] = await Promise.all([
        prisma.hostelRoom.count(),
        prisma.hostelRoom.aggregate({ _sum: { capacity: true } }),
        prisma.bedAllocation.count({ where: { status: 'ACTIVE' } }),
      ]);
      res.json({ success: true, data: { totalRooms, totalBeds: totalBeds._sum.capacity || 0, occupiedBeds, availableBeds: (totalBeds._sum.capacity || 0) - occupiedBeds } });
    } catch (e) { next(e); }
  }

  // ===== LIBRARY =====
  static async addCopy(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await LibraryService.addCopy(req.body) }); } catch (e) { next(e); }
  }
  static async listCopies(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await LibraryService.listCopies({ status: req.query.status as string, page: Number(req.query.page), limit: Number(req.query.limit) }) }); } catch (e) { next(e); }
  }
  static async issueBook(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await LibraryService.issueBook(req.body) }); } catch (e) { next(e); }
  }
  static async returnBook(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await LibraryService.returnBook(req.params.id) }); } catch (e) { next(e); }
  }
  static async listTransactions(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await LibraryService.listTransactions({ userId: req.query.userId as string, overdue: req.query.overdue === 'true', page: Number(req.query.page), limit: Number(req.query.limit) }) }); } catch (e) { next(e); }
  }
  static async getLibraryStats(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await LibraryService.getStats() }); } catch (e) { next(e); }
  }

  // ===== TRANSPORT =====
  static async listRoutes(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TransportService.listRoutes() }); } catch (e) { next(e); }
  }
  static async createRoute(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await TransportService.createRoute(req.body) }); } catch (e) { next(e); }
  }
  static async listVehicles(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TransportService.listVehicles() }); } catch (e) { next(e); }
  }
  static async createVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await TransportService.createVehicle(req.body) }); } catch (e) { next(e); }
  }
  static async assignDriver(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await TransportService.assignDriver(req.body) }); } catch (e) { next(e); }
  }
  static async issuePass(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await TransportService.issuePass(req.body) }); } catch (e) { next(e); }
  }
  static async listPasses(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TransportService.listPasses({ routeStopId: req.query.routeStopId as string }) }); } catch (e) { next(e); }
  }
  static async revokePass(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TransportService.revokePass(req.params.id) }); } catch (e) { next(e); }
  }
  static async getTransportStats(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TransportService.getStats() }); } catch (e) { next(e); }
  }

  // ===== INVENTORY =====
  static async createAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await InventoryService.createAsset(req.body) }); } catch (e) { next(e); }
  }
  static async listAssets(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await InventoryService.listAssets({ status: req.query.status as string, page: Number(req.query.page), limit: Number(req.query.limit) }) }); } catch (e) { next(e); }
  }
  static async allocateAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json({ success: true, data: await InventoryService.allocateAsset(req.body) }); } catch (e) { next(e); }
  }
  static async returnAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await InventoryService.returnAsset(req.params.id) }); } catch (e) { next(e); }
  }
  static async getInventoryStats(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await InventoryService.getStats() }); } catch (e) { next(e); }
  }
}
