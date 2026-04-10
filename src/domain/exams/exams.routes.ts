import { Router, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../../core/middlewares/auth.middleware';
import { MarksService } from './marks.service';

const examsRouter = Router();

// POST /api/v1/exams/sessions — Create exam session
examsRouter.post('/sessions', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await MarksService.createExamSession(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/exams/sessions — List exam sessions
examsRouter.get('/sessions', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { semester, academicYear } = req.query;
      const data = await MarksService.listExamSessions(
        semester ? parseInt(semester as string) : undefined,
        academicYear as string,
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/exams/marks — Enter marks
examsRouter.post('/marks', authenticateToken, requireRole('FACULTY', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { examSessionId, subjectId, records } = req.body;
      if (!examSessionId || !subjectId || !records?.length) {
        return res.status(400).json({ success: false, error: 'examSessionId, subjectId, and records are required' });
      }
      const data = await MarksService.enterMarks(req.user!.id, examSessionId, subjectId, records, req);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/exams/marks/:examSessionId — Get marks for a session
examsRouter.get('/marks/:examSessionId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { subjectId } = req.query;
      const data = await MarksService.getMarks(req.params.examSessionId, subjectId as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/exams/grades/compute — Compute grades
examsRouter.post('/grades/compute', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { studentId, semester, academicYear } = req.body;
      if (!studentId || !semester || !academicYear) {
        return res.status(400).json({ success: false, error: 'studentId, semester, and academicYear are required' });
      }
      const data = await MarksService.computeGrades(studentId, semester, academicYear);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// PATCH /api/v1/exams/sessions/:id/lock — Lock exam session
examsRouter.patch('/sessions/:id/lock', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await MarksService.lockExamSession(req.params.id, req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/exams/hall-tickets/:studentId — Generate hall ticket
examsRouter.post('/hall-tickets/:studentId', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { examSessionId } = req.body;
      if (!examSessionId) return res.status(400).json({ success: false, error: 'examSessionId is required' });
      const data = await MarksService.generateHallTicket(req.params.studentId, examSessionId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// GET /api/v1/exams/grades/student/:studentId — Get student grades
examsRouter.get('/grades/student/:studentId', authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await MarksService.getStudentGrades(req.params.studentId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

// POST /api/v1/exams/results/publish — Publish results
examsRouter.post('/results/publish', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN', 'EXAM_CELL'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { examSessionId } = req.body;
      if (!examSessionId) return res.status(400).json({ success: false, error: 'examSessionId is required' });
      const data = await MarksService.publishResults(examSessionId, req.user!.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
);

export default examsRouter;
