import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class HostelService {

  static async createBlock(data: { name: string; gender: 'MALE' | 'FEMALE' | 'OTHER' }) {
    return prisma.hostelBlock.create({
      data: { name: data.name, gender: data.gender as any },
    });
  }

  static async listBlocks() {
    return prisma.hostelBlock.findMany({
      where: { isActive: true },
      include: { rooms: { select: { id: true, roomNumber: true, capacity: true, occupancy: true } } },
    });
  }

  static async createRoom(data: { blockId: string; roomNumber: string; capacity?: number; monthlyFee?: number }) {
    const block = await prisma.hostelBlock.findUnique({ where: { id: data.blockId } });
    if (!block) throw new APIError('NOT_FOUND', 'Block not found.');

    return prisma.hostelRoomNew.create({
      data: {
        blockId: data.blockId,
        roomNumber: data.roomNumber,
        capacity: data.capacity || 2,
        monthlyFee: data.monthlyFee || 0,
      },
    });
  }

  static async listRooms(blockId?: string) {
    const where: any = { isActive: true };
    if (blockId) where.blockId = blockId;

    return prisma.hostelRoomNew.findMany({
      where,
      include: {
        block: { select: { name: true, gender: true } },
        allocations: {
          where: { isActive: true },
          include: { student: { select: { id: true, name: true, rollNumber: true } } },
        },
      },
    });
  }

  static async allocateRoom(data: { studentId: string; roomId: string }) {
    const room = await prisma.hostelRoomNew.findUnique({ where: { id: data.roomId } });
    if (!room) throw new APIError('NOT_FOUND', 'Room not found.');
    if (room.occupancy >= room.capacity) throw new APIError('CONFLICT', 'Room is at full capacity.');

    const existing = await prisma.hostelAllocation.findFirst({
      where: { studentId: data.studentId, isActive: true },
    });
    if (existing) throw new APIError('CONFLICT', 'Student already has a room allocated.');

    const allocation = await prisma.hostelAllocation.create({
      data: {
        studentId: data.studentId,
        roomId: data.roomId,
        fromDate: new Date(),
      },
    });

    // Update occupancy
    await prisma.hostelRoomNew.update({
      where: { id: data.roomId },
      data: { occupancy: { increment: 1 } },
    });

    return allocation;
  }

  static async deallocateRoom(studentId: string) {
    const alloc = await prisma.hostelAllocation.findFirst({
      where: { studentId, isActive: true },
    });
    if (!alloc) throw new APIError('NOT_FOUND', 'No active allocation found.');

    await prisma.hostelAllocation.update({
      where: { id: alloc.id },
      data: { isActive: false, toDate: new Date() },
    });

    await prisma.hostelRoomNew.update({
      where: { id: alloc.roomId },
      data: { occupancy: { decrement: 1 } },
    });

    return { deallocated: true };
  }

  static async getStats() {
    const blocks = await prisma.hostelBlock.count({ where: { isActive: true } });
    const totalRooms = await prisma.hostelRoomNew.count({ where: { isActive: true } });
    const totalCapacity = (await prisma.hostelRoomNew.aggregate({ where: { isActive: true }, _sum: { capacity: true } }))._sum.capacity || 0;
    const occupied = await prisma.hostelAllocation.count({ where: { isActive: true } });

    return { blocks, totalRooms, totalCapacity, occupied, available: totalCapacity - occupied };
  }
}
