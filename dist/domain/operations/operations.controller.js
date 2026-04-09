"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsController = void 0;
const operations_service_1 = require("./operations.service");
const prisma_client_1 = require("../../core/database/prisma.client");
const api_error_1 = require("../../core/common/exceptions/api.error");
class OperationsController {
    // ===== HOSTEL =====
    static async allocateBed(req, res, next) {
        try {
            const data = req.body;
            const result = await prisma_client_1.prisma.$transaction(async (tx) => {
                const rooms = await tx.$queryRaw `SELECT id, capacity FROM "HostelRoom" WHERE id = ${data.roomId} FOR UPDATE`;
                if (!rooms.length)
                    throw new api_error_1.APIError('NOT_FOUND', 'Room not found.');
                const activeBeds = await tx.bedAllocation.count({ where: { roomId: rooms[0].id, status: 'ACTIVE' } });
                if (activeBeds >= rooms[0].capacity)
                    throw new api_error_1.APIError('CONFLICT', 'Room is full.');
                const dup = await tx.bedAllocation.findFirst({ where: { studentId: data.studentId, status: 'ACTIVE' } });
                if (dup)
                    throw new api_error_1.APIError('CONFLICT', 'Student already has an active bed.');
                const alloc = await tx.bedAllocation.create({ data: { ...data, status: 'ACTIVE' } });
                await tx.hostelHistoryLog.create({ data: { studentId: data.studentId, roomId: data.roomId, action: 'CHECK_IN', date: new Date() } });
                return alloc;
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (e) {
            next(e);
        }
    }
    static async deallocateBed(req, res, next) {
        try {
            const alloc = await prisma_client_1.prisma.bedAllocation.findUnique({ where: { id: req.params.id } });
            if (!alloc)
                throw new api_error_1.APIError('NOT_FOUND', 'Allocation not found.');
            await prisma_client_1.prisma.$transaction(async (tx) => {
                await tx.bedAllocation.update({ where: { id: req.params.id }, data: { status: 'VACATED', allocatedTo: new Date() } });
                await tx.hostelHistoryLog.create({ data: { studentId: alloc.studentId, roomId: alloc.roomId, action: 'CHECK_OUT', date: new Date() } });
            });
            res.json({ success: true, data: { deallocated: true } });
        }
        catch (e) {
            next(e);
        }
    }
    static async listRooms(req, res, next) {
        try {
            const rooms = await prisma_client_1.prisma.hostelRoom.findMany({ include: { bedAllocations: { where: { status: 'ACTIVE' }, include: { student: true } } } });
            res.json({ success: true, data: rooms });
        }
        catch (e) {
            next(e);
        }
    }
    static async createRoom(req, res, next) {
        try {
            const room = await prisma_client_1.prisma.hostelRoom.create({ data: { roomNo: req.body.roomNo, capacity: req.body.capacity } });
            res.status(201).json({ success: true, data: room });
        }
        catch (e) {
            next(e);
        }
    }
    static async getHostelStats(req, res, next) {
        try {
            const [totalRooms, totalBeds, occupiedBeds] = await Promise.all([
                prisma_client_1.prisma.hostelRoom.count(),
                prisma_client_1.prisma.hostelRoom.aggregate({ _sum: { capacity: true } }),
                prisma_client_1.prisma.bedAllocation.count({ where: { status: 'ACTIVE' } }),
            ]);
            res.json({ success: true, data: { totalRooms, totalBeds: totalBeds._sum.capacity || 0, occupiedBeds, availableBeds: (totalBeds._sum.capacity || 0) - occupiedBeds } });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== LIBRARY =====
    static async addCopy(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.LibraryService.addCopy(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listCopies(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.LibraryService.listCopies({ status: req.query.status, page: Number(req.query.page), limit: Number(req.query.limit) }) });
        }
        catch (e) {
            next(e);
        }
    }
    static async issueBook(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.LibraryService.issueBook(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async returnBook(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.LibraryService.returnBook(req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listTransactions(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.LibraryService.listTransactions({ userId: req.query.userId, overdue: req.query.overdue === 'true', page: Number(req.query.page), limit: Number(req.query.limit) }) });
        }
        catch (e) {
            next(e);
        }
    }
    static async getLibraryStats(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.LibraryService.getStats() });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== TRANSPORT =====
    static async listRoutes(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.TransportService.listRoutes() });
        }
        catch (e) {
            next(e);
        }
    }
    static async createRoute(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.TransportService.createRoute(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listVehicles(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.TransportService.listVehicles() });
        }
        catch (e) {
            next(e);
        }
    }
    static async createVehicle(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.TransportService.createVehicle(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async assignDriver(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.TransportService.assignDriver(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async issuePass(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.TransportService.issuePass(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listPasses(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.TransportService.listPasses({ routeStopId: req.query.routeStopId }) });
        }
        catch (e) {
            next(e);
        }
    }
    static async revokePass(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.TransportService.revokePass(req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async getTransportStats(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.TransportService.getStats() });
        }
        catch (e) {
            next(e);
        }
    }
    // ===== INVENTORY =====
    static async createAsset(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.InventoryService.createAsset(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async listAssets(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.InventoryService.listAssets({ status: req.query.status, page: Number(req.query.page), limit: Number(req.query.limit) }) });
        }
        catch (e) {
            next(e);
        }
    }
    static async allocateAsset(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await operations_service_1.InventoryService.allocateAsset(req.body) });
        }
        catch (e) {
            next(e);
        }
    }
    static async returnAsset(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.InventoryService.returnAsset(req.params.id) });
        }
        catch (e) {
            next(e);
        }
    }
    static async getInventoryStats(req, res, next) {
        try {
            res.json({ success: true, data: await operations_service_1.InventoryService.getStats() });
        }
        catch (e) {
            next(e);
        }
    }
}
exports.OperationsController = OperationsController;
