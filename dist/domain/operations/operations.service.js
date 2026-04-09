"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = exports.TransportService = exports.LibraryService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
const api_error_1 = require("../../core/common/exceptions/api.error");
class LibraryService {
    // ===== BOOKS / COPIES =====
    static async addCopy(data) {
        return prisma_client_1.prisma.libraryCopy.create({ data: { bookId: data.bookId, status: data.status || 'AVAILABLE' } });
    }
    static async listCopies(filters) {
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 25, 100);
        const where = {};
        if (filters.status)
            where.status = filters.status;
        const [copies, total] = await Promise.all([
            prisma_client_1.prisma.libraryCopy.findMany({ where, skip: (page - 1) * limit, take: limit, include: { transactions: { orderBy: { issueDate: 'desc' }, take: 1 } } }),
            prisma_client_1.prisma.libraryCopy.count({ where }),
        ]);
        return { copies, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async updateCopyStatus(id, status) {
        return prisma_client_1.prisma.libraryCopy.update({ where: { id }, data: { status } });
    }
    // ===== TRANSACTIONS =====
    static async issueBook(data) {
        const copy = await prisma_client_1.prisma.libraryCopy.findUnique({ where: { id: data.copyId } });
        if (!copy)
            throw new api_error_1.APIError('NOT_FOUND', 'Book copy not found.');
        if (copy.status !== 'AVAILABLE')
            throw new api_error_1.APIError('CONFLICT', 'Book copy is not available for issue.');
        return prisma_client_1.prisma.$transaction(async (tx) => {
            const txn = await tx.libraryTransaction.create({
                data: { copyId: data.copyId, userId: data.userId, issueDate: new Date(), dueDate: new Date(data.dueDate) }
            });
            await tx.libraryCopy.update({ where: { id: data.copyId }, data: { status: 'ISSUED' } });
            return txn;
        });
    }
    static async returnBook(transactionId) {
        const txn = await prisma_client_1.prisma.libraryTransaction.findUnique({ where: { id: transactionId } });
        if (!txn)
            throw new api_error_1.APIError('NOT_FOUND', 'Transaction not found.');
        if (txn.returnDate)
            throw new api_error_1.APIError('CONFLICT', 'Book already returned.');
        const now = new Date();
        const overdueDays = Math.max(0, Math.floor((now.getTime() - txn.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        const fineAmount = overdueDays * 5; // ₹5 per day late fine
        return prisma_client_1.prisma.$transaction(async (tx) => {
            await tx.libraryTransaction.update({ where: { id: transactionId }, data: { returnDate: now, fineAmount } });
            await tx.libraryCopy.update({ where: { id: txn.copyId }, data: { status: 'AVAILABLE' } });
            return { returned: true, overdueDays, fineAmount };
        });
    }
    static async listTransactions(filters) {
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 25, 100);
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.overdue) {
            where.returnDate = null;
            where.dueDate = { lt: new Date() };
        }
        const [transactions, total] = await Promise.all([
            prisma_client_1.prisma.libraryTransaction.findMany({ where, skip: (page - 1) * limit, take: limit, include: { copy: true }, orderBy: { issueDate: 'desc' } }),
            prisma_client_1.prisma.libraryTransaction.count({ where }),
        ]);
        return { transactions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getStats() {
        const [totalCopies, available, issued, lost, activeTransactions, overdue] = await Promise.all([
            prisma_client_1.prisma.libraryCopy.count(),
            prisma_client_1.prisma.libraryCopy.count({ where: { status: 'AVAILABLE' } }),
            prisma_client_1.prisma.libraryCopy.count({ where: { status: 'ISSUED' } }),
            prisma_client_1.prisma.libraryCopy.count({ where: { status: 'LOST' } }),
            prisma_client_1.prisma.libraryTransaction.count({ where: { returnDate: null } }),
            prisma_client_1.prisma.libraryTransaction.count({ where: { returnDate: null, dueDate: { lt: new Date() } } }),
        ]);
        return { totalCopies, available, issued, lost, activeTransactions, overdue };
    }
}
exports.LibraryService = LibraryService;
class TransportService {
    static async listRoutes() {
        return prisma_client_1.prisma.route.findMany({ include: { routeStops: true, driverAllocations: { include: { vehicle: true } } } });
    }
    static async createRoute(data) {
        return prisma_client_1.prisma.$transaction(async (tx) => {
            const route = await tx.route.create({ data: { name: data.name } });
            for (const stopName of data.stops) {
                await tx.routeStop.create({ data: { routeId: route.id, name: stopName } });
            }
            return route;
        });
    }
    static async listVehicles() {
        return prisma_client_1.prisma.vehicle.findMany({ include: { driverAllocations: { include: { route: true } } } });
    }
    static async createVehicle(data) {
        return prisma_client_1.prisma.vehicle.create({ data });
    }
    static async assignDriver(data) {
        return prisma_client_1.prisma.driverAllocation.create({ data });
    }
    static async issuePass(data) {
        const existing = await prisma_client_1.prisma.studentTransportPass.findFirst({ where: { studentId: data.studentId } });
        if (existing)
            throw new api_error_1.APIError('CONFLICT', 'Student already has an active pass.');
        return prisma_client_1.prisma.studentTransportPass.create({ data });
    }
    static async listPasses(filters) {
        return prisma_client_1.prisma.studentTransportPass.findMany({
            where: filters.routeStopId ? { routeStopId: filters.routeStopId } : {},
            include: { student: true, routeStop: { include: { route: true } } }
        });
    }
    static async revokePass(passId) {
        return prisma_client_1.prisma.studentTransportPass.delete({ where: { id: passId } });
    }
    static async getStats() {
        const [totalRoutes, totalVehicles, totalPasses] = await Promise.all([
            prisma_client_1.prisma.route.count(),
            prisma_client_1.prisma.vehicle.count(),
            prisma_client_1.prisma.studentTransportPass.count(),
        ]);
        return { totalRoutes, totalVehicles, totalPasses };
    }
}
exports.TransportService = TransportService;
class InventoryService {
    static async createAsset(data) {
        return prisma_client_1.prisma.inventoryAsset.create({ data: { name: data.name, status: 'AVAILABLE' } });
    }
    static async listAssets(filters) {
        const page = filters.page || 1;
        const limit = Math.min(filters.limit || 25, 100);
        const where = {};
        if (filters.status)
            where.status = filters.status;
        const [assets, total] = await Promise.all([
            prisma_client_1.prisma.inventoryAsset.findMany({ where, skip: (page - 1) * limit, take: limit, include: { allocations: { orderBy: { dateIssued: 'desc' }, take: 1 } } }),
            prisma_client_1.prisma.inventoryAsset.count({ where }),
        ]);
        return { assets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async allocateAsset(data) {
        const asset = await prisma_client_1.prisma.inventoryAsset.findUnique({ where: { id: data.assetId } });
        if (!asset)
            throw new api_error_1.APIError('NOT_FOUND', 'Asset not found.');
        if (asset.status !== 'AVAILABLE')
            throw new api_error_1.APIError('CONFLICT', 'Asset is not available.');
        return prisma_client_1.prisma.$transaction(async (tx) => {
            const alloc = await tx.inventoryAllocation.create({ data: { assetId: data.assetId, allocatedTo: data.allocatedTo, dateIssued: new Date() } });
            await tx.inventoryAsset.update({ where: { id: data.assetId }, data: { status: 'DEPLOYED' } });
            return alloc;
        });
    }
    static async returnAsset(allocationId) {
        const alloc = await prisma_client_1.prisma.inventoryAllocation.findUnique({ where: { id: allocationId } });
        if (!alloc)
            throw new api_error_1.APIError('NOT_FOUND', 'Allocation not found.');
        if (alloc.dateReturned)
            throw new api_error_1.APIError('CONFLICT', 'Already returned.');
        return prisma_client_1.prisma.$transaction(async (tx) => {
            await tx.inventoryAllocation.update({ where: { id: allocationId }, data: { dateReturned: new Date() } });
            await tx.inventoryAsset.update({ where: { id: alloc.assetId }, data: { status: 'AVAILABLE' } });
            return { returned: true };
        });
    }
    static async updateAssetStatus(id, status) {
        return prisma_client_1.prisma.inventoryAsset.update({ where: { id }, data: { status } });
    }
    static async getStats() {
        const [total, available, deployed, maintenance, damaged] = await Promise.all([
            prisma_client_1.prisma.inventoryAsset.count(),
            prisma_client_1.prisma.inventoryAsset.count({ where: { status: 'AVAILABLE' } }),
            prisma_client_1.prisma.inventoryAsset.count({ where: { status: 'DEPLOYED' } }),
            prisma_client_1.prisma.inventoryAsset.count({ where: { status: 'MAINTENANCE' } }),
            prisma_client_1.prisma.inventoryAsset.count({ where: { status: 'DAMAGED' } }),
        ]);
        return { total, available, deployed, maintenance, damaged };
    }
}
exports.InventoryService = InventoryService;
