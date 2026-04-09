"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("./attendance.service");
class AttendanceController {
    static async startSession(req, res, next) {
        try {
            // Reconstituting dynamic Institution UUID mappings via JWT natively injected
            const data = await attendance_service_1.AttendanceService.startLiveSession(req.user?.institutionId || req.body.institutionId, req.user?.id || 'FALLBACK_ID', req.body.timeSlotId);
            res.status(201).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async markRecord(req, res, next) {
        try {
            const data = await attendance_service_1.AttendanceService.markLiveSessionRecord(req.user?.institutionId || req.body.institutionId, req.params.sessionId, req.body.studentId, req.body.isPresent);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    static async closeSession(req, res, next) {
        try {
            const data = await attendance_service_1.AttendanceService.closeSession(req.user?.institutionId || req.body.institutionId, req.params.sessionId);
            res.status(200).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AttendanceController = AttendanceController;
