"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("./attendance.controller");
const attendanceRouter = (0, express_1.Router)();
attendanceRouter.post('/live/session', attendance_controller_1.AttendanceController.startSession);
attendanceRouter.post('/live/:sessionId/mark', attendance_controller_1.AttendanceController.markRecord);
attendanceRouter.post('/live/:sessionId/close', attendance_controller_1.AttendanceController.closeSession);
exports.default = attendanceRouter;
