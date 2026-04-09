"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEmitter = void 0;
class SocketEmitter {
    static io = null;
    static setIo(io) {
        this.io = io;
    }
    static emitToTenant(institutionId, event, data) {
        if (this.io) {
            this.io.to(`tenant:${institutionId}`).emit(event, data);
        }
    }
    static emitToUser(userId, event, data) {
        if (this.io) {
            this.io.to(`user:${userId}`).emit(event, data);
        }
    }
    static emitToRoom(room, event, data) {
        if (this.io) {
            this.io.to(room).emit(event, data);
        }
    }
}
exports.SocketEmitter = SocketEmitter;
