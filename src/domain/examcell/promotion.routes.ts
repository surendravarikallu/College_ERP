// @ts-nocheck
import { Router, Request, Response } from 'express';
import { api } from './examcell.api';
import { getEligibleStudents, promoteStudents, demoteStudents, detainStudents, applyLeave, getNominalRolls, updateStudentStatus } from './promotionService';
import { z } from 'zod';
import jwt from "jsonwebtoken";

import { SESSION_SECRET } from './config';

const JWT_SECRET = SESSION_SECRET;

// Auth Middleware (Local copy or better to export from routes.ts, but let's keep it self-contained if needed or just use a helper)
function requireAuth(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function requireAdmin(req: Request, res: Response, next: any) {
  requireAuth(req, res, () => {
    if (!(req as any).user?.isAdmin) return res.status(403).json({ message: 'Access denied. Admin only.' });
    next();
  });
}

const router = Router();

// Eligibility endpoint
router.post('/promotion/eligible', requireAuth, async (req: Request, res: Response) => {
    try {
        const input = api.promotion?.eligible?.input?.parse(req.body) ?? {};
        const students = await getEligibleStudents(input);
        res.json({ students });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Promote endpoint
router.post('/promotion/promote', requireAdmin, async (req: Request, res: Response) => {
    try {
        const input = api.promotion?.promote?.input?.parse(req.body);
        const { studentIds, target, reason } = input;
        await promoteStudents(studentIds, target, reason);
        res.json({ message: 'Students promoted successfully' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Demote endpoint
router.post('/promotion/demote', requireAdmin, async (req: Request, res: Response) => {
    try {
        const input = api.promotion?.demote?.input?.parse(req.body);
        const { studentIds, reason } = input;
        await demoteStudents(studentIds, reason);
        res.json({ message: 'Students demoted successfully' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Detain endpoint
router.post('/promotion/detain', requireAdmin, async (req: Request, res: Response) => {
    try {
        const input = api.promotion?.detain?.input?.parse(req.body);
        const { studentIds, target, reason } = input as any;
        await detainStudents(studentIds, target, reason);
        res.json({ message: 'Students detained successfully' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Leave endpoint
router.post('/promotion/leave', requireAdmin, async (req: Request, res: Response) => {
    try {
        const input = api.promotion?.leave?.input?.parse(req.body);
        const { studentIds, reason } = input;
        await applyLeave(studentIds, reason);
        res.json({ message: 'Leave applied successfully' });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Nominal Rolls endpoint
router.get('/nominal-rolls', requireAuth, async (req: Request, res: Response) => {
    try {
        const batch = req.query.batch as string;
        const branch = req.query.branch as string;
        const semester = req.query.semester as string;
        const academicYear = req.query.academicYear as string;
        const section = req.query.section as string;

        const rolls = await getNominalRolls(batch, branch, semester, academicYear, section);
        res.json({ nominalRolls: rolls });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update single student status (from Nominal Rolls dropdown)
router.patch('/students/:id/status', requireAdmin, async (req: Request, res: Response) => {
    try {
        const studentId = Number(req.params.id);
        const { status, reason, academicYear, semester } = req.body;
        const validStatuses = ['ACTIVE', 'DETAINED', 'LEFT', 'DEATH'];
        if (!status || !validStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        await updateStudentStatus(studentId, status, reason || '', academicYear || '', semester || '');
        res.json({ message: 'Status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


export default router;





