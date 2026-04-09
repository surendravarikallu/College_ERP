"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const examcell_api_1 = require("./examcell.api");
const promotionService_1 = require("./promotionService");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("./config");
const JWT_SECRET = config_1.SESSION_SECRET;
// Auth Middleware (Local copy or better to export from routes.ts, but let's keep it self-contained if needed or just use a helper)
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        next();
    });
}
const router = (0, express_1.Router)();
// Eligibility endpoint
router.post('/promotion/eligible', requireAuth, async (req, res) => {
    try {
        const input = examcell_api_1.api.promotion?.eligible?.input?.parse(req.body) ?? {};
        const students = await (0, promotionService_1.getEligibleStudents)(input);
        res.json({ students });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Promote endpoint
router.post('/promotion/promote', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.promotion?.promote?.input?.parse(req.body);
        const { studentIds, target, reason } = input;
        await (0, promotionService_1.promoteStudents)(studentIds, target, reason);
        res.json({ message: 'Students promoted successfully' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Demote endpoint
router.post('/promotion/demote', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.promotion?.demote?.input?.parse(req.body);
        const { studentIds, reason } = input;
        await (0, promotionService_1.demoteStudents)(studentIds, reason);
        res.json({ message: 'Students demoted successfully' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Detain endpoint
router.post('/promotion/detain', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.promotion?.detain?.input?.parse(req.body);
        const { studentIds, target, reason } = input;
        await (0, promotionService_1.detainStudents)(studentIds, target, reason);
        res.json({ message: 'Students detained successfully' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Leave endpoint
router.post('/promotion/leave', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.promotion?.leave?.input?.parse(req.body);
        const { studentIds, reason } = input;
        await (0, promotionService_1.applyLeave)(studentIds, reason);
        res.json({ message: 'Leave applied successfully' });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Nominal Rolls endpoint
router.get('/nominal-rolls', requireAuth, async (req, res) => {
    try {
        const batch = req.query.batch;
        const branch = req.query.branch;
        const semester = req.query.semester;
        const academicYear = req.query.academicYear;
        const section = req.query.section;
        const rolls = await (0, promotionService_1.getNominalRolls)(batch, branch, semester, academicYear, section);
        res.json({ nominalRolls: rolls });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update single student status (from Nominal Rolls dropdown)
router.patch('/students/:id/status', requireAdmin, async (req, res) => {
    try {
        const studentId = Number(req.params.id);
        const { status, reason, academicYear, semester } = req.body;
        const validStatuses = ['ACTIVE', 'DETAINED', 'LEFT', 'DEATH'];
        if (!status || !validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        await (0, promotionService_1.updateStudentStatus)(studentId, status, reason || '', academicYear || '', semester || '');
        res.json({ message: 'Status updated successfully' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
