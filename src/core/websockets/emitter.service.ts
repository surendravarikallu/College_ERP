import { Server } from 'socket.io';

export class SocketEmitter {
  private static io: Server | null = null;

  static setIo(io: Server) {
    this.io = io;
  }

  static emitToTenant(institutionId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`tenant:${institutionId}`).emit(event, data);
    }
  }

  static emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  static emitToRoom(room: string, event: string, data: any) {
     if (this.io) {
       this.io.to(room).emit(event, data);
     }
  }
}
