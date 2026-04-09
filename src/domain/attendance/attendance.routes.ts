import { Router } from 'express';
import { AttendanceController } from './attendance.controller';

const attendanceRouter = Router();

attendanceRouter.post('/live/session', AttendanceController.startSession);
attendanceRouter.post('/live/:sessionId/mark', AttendanceController.markRecord);
attendanceRouter.post('/live/:sessionId/close', AttendanceController.closeSession);

export default attendanceRouter;
