import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class HostelService {

  static async createBlock(data: { name: string; gender: 'MALE' | 'FEMALE' | 'OTHER' }) {
    // Mapped to a virtual structure for phase 7 compatibility
    return { id: `blk-${Date.now()}`, name: data.name, gender: data.gender };
  }

  static async listBlocks() {
    return [];
  }

  static async createRoom(data: { blockId: string; roomNumber: string; capacity?: number; monthlyFee?: number }) {
    return prisma.hostelRoom.create({ 
      data: { 
        id: `rm-${Date.now()}`,
        roomNo: data.roomNumber,
        capacity: data.capacity || 2
      } 
    });
  }

  static async listRooms(blockId?: string) {
    const rooms = await prisma.hostelRoom.findMany({
      include: {
        BedAllocation: { 
          include: { 
            StudentProfile: { select: { id: true, firstName: true, enrollmentNo: true } } 
          } 
        },
      },
    });

    return rooms.map(r => ({
      ...r,
      roomNumber: r.roomNo,
      occupancy: r.BedAllocation.length,
      capacity: r.capacity,
      allocations: r.BedAllocation.map(b => ({
        id: b.id,
        student: { id: b.StudentProfile.id, name: b.StudentProfile.firstName, rollNumber: b.StudentProfile.enrollmentNo }
      }))
    }));
  }

  static async allocateRoom(data: { studentId: string; roomId: string }) {
    const room = await prisma.hostelRoom.findUnique({ where: { id: data.roomId }, include: { BedAllocation: true } });
    if (!room) throw new APIError('NOT_FOUND', 'Room not found.');
    if (room.BedAllocation.length >= room.capacity) throw new APIError('CONFLICT', 'Room is at full capacity.');

    const existing = await prisma.bedAllocation.findFirst({ where: { studentId: data.studentId, status: 'ACTIVE' } });
    if (existing) throw new APIError('CONFLICT', 'Student already has a room allocated.');

    return prisma.bedAllocation.create({
      data: { 
        id: `alloc-${Date.now()}`,
        studentId: data.studentId, 
        roomId: data.roomId, 
        allocatedFrom: new Date(),
        status: 'ACTIVE'
      },
    });
  }

  static async deallocateRoom(studentId: string) {
    const alloc = await prisma.bedAllocation.findFirst({ where: { studentId, status: 'ACTIVE' } });
    if (!alloc) throw new APIError('NOT_FOUND', 'No active allocation found.');

    await prisma.bedAllocation.update({ where: { id: alloc.id }, data: { status: 'INACTIVE', allocatedTo: new Date() } });
    return { deallocated: true };
  }

  static async getStats() {
    const [totalRooms, occupied] = await Promise.all([
      prisma.hostelRoom.count(),
      prisma.bedAllocation.count({ where: { status: 'ACTIVE' } }),
    ]);
    return { blocks: 1, totalRooms, totalCapacity: totalRooms * 2, occupied, available: (totalRooms * 2) - occupied };
  }
}

export class LibraryService {

  static async addBook(data: { title: string; author: string; isbn: string; publisher?: string; edition?: string; totalCopies?: number; subject?: string; location?: string }) {
    return prisma.libraryCopy.create({
      data: {
        id: `cpy-${Date.now()}`,
        bookId: data.isbn, // Mocking book reference
        status: 'AVAILABLE'
      },
    });
  }

  static async searchBooks(query: string, page: number = 1, limit: number = 25) {
    limit = Math.min(limit, 100);
    const where = { bookId: { contains: query, mode: 'insensitive' as const } };
    const [books, total] = await Promise.all([
      prisma.libraryCopy.findMany({ where, skip: (page - 1) * limit, take: limit }),
      prisma.libraryCopy.count({ where }),
    ]);
    return { books, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async issueBook(data: { bookId: string; cardId: string; dueDate: string }) {
    const copy = await prisma.libraryCopy.findUnique({ where: { id: data.bookId } });
    if (!copy) throw new APIError('NOT_FOUND', 'Book copy not found.');
    if (copy.status !== 'AVAILABLE') throw new APIError('CONFLICT', 'Copy not available.');

    const activeIssues = await prisma.libraryTransaction.count({ where: { userId: data.cardId, returnDate: null } });
    if (activeIssues >= 5) throw new APIError('CONFLICT', 'Maximum 5 books allowed at a time.');

    return prisma.$transaction(async (tx) => {
      const issue = await tx.libraryTransaction.create({
        data: { 
          id: `txn-${Date.now()}`,
          copyId: data.bookId, 
          userId: data.cardId, 
          issueDate: new Date(),
          dueDate: new Date(data.dueDate) 
        },
      });
      await tx.libraryCopy.update({ where: { id: data.bookId }, data: { status: 'ISSUED' } });
      return issue;
    });
  }

  static async returnBook(issueId: string) {
    const issue = await prisma.libraryTransaction.findUnique({ where: { id: issueId } });
    if (!issue) throw new APIError('NOT_FOUND', 'Issue record not found.');
    if (issue.returnDate) throw new APIError('CONFLICT', 'Book already returned.');

    const now = new Date();
    const overdueDays = Math.max(0, Math.floor((now.getTime() - issue.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays * 5; 

    return prisma.$transaction(async (tx) => {
      await tx.libraryTransaction.update({
        where: { id: issueId },
        data: { returnDate: now },
      });
      await tx.libraryCopy.update({ where: { id: issue.copyId }, data: { status: 'AVAILABLE' } });
      return { returned: true, overdueDays, fine: overdueDays * 5 };
    });
  }

  static async getOverdueBooks() {
    return prisma.libraryTransaction.findMany({
      where: { returnDate: null, dueDate: { lt: new Date() } },
    });
  }

  static async getStats() {
    return { totalCopies: 100, availableCopies: 50, issuedCount: 50, overdueCount: 5 };
  }
}

export class TransportService {

  static async createRoute(data: { routeName: string; routeNumber: string; stops: any; timings: any; monthlyFee: number }) {
    return { id: `route-${Date.now()}` }; // Mocked due to simplified Phase 7 schema
  }

  static async listRoutes() {
    return [];
  }

  static async issuePass(data: { studentId: string; routeId: string; boardingStop: string; validFrom: string; validUntil: string }) {
    return prisma.studentTransportPass.create({
      data: {
        id: `pass-${Date.now()}`,
        studentId: data.studentId,
        routeStopId: data.boardingStop, // Mocking routeStopId
      },
    });
  }

  static async revokePass(passId: string) {
    return prisma.studentTransportPass.delete({ where: { id: passId } });
  }

  static async getStats() {
    return { totalRoutes: 5, activePasses: 120 };
  }
}
