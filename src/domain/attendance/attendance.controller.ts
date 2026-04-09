import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';

export class AttendanceController {

  static async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      // Reconstituting dynamic Institution UUID mappings via JWT natively injected
      const data = await AttendanceService.startLiveSession(
         req.user?.institutionId || req.body.institutionId, 
         req.user?.id || 'FALLBACK_ID', 
         req.body.timeSlotId
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async markRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.markLiveSessionRecord(
         req.user?.institutionId || req.body.institutionId,
         req.params.sessionId,
         req.body.studentId,
         req.body.isPresent
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async closeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AttendanceService.closeSession(
         req.user?.institutionId || req.body.institutionId,
         req.params.sessionId
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}
