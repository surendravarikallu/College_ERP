import { Router } from 'express';

import identityRoutes from './identity/identity.routes';
import attendanceRoutes from './attendance/attendance.routes';
import examsRoutes from './exams/exams.routes';
import financeRoutes from './finance/finance.routes';
import operationsRoutes from './operations/operations.routes';
import academicsRoutes from './academics/academics.routes';
import analyticsRoutes from './analytics/analytics.routes';
import examcellRoutes from './examcell/examcell.routes';
import autonomousRoutes from './examcell/autonomous.routes';

const router = Router();

router.use('/identity', identityRoutes);
router.use('/academics', academicsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/exams', examsRoutes);
router.use('/finance', financeRoutes);
router.use('/operations', operationsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/examcell', examcellRoutes);
router.use('/examcell', autonomousRoutes);

router.get('/health', (req, res) => res.status(200).json({ status: 'UP', phase: 7 }));

export default router;
