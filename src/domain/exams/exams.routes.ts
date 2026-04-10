import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../../core/middlewares/auth.middleware';
import { MarksService } from './marks.service';

const examsRouter = Router();

// POST /api/exams/sessions — create exam session
examsRouter.post('/sessions', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'EXAM_CELL']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.createExamSession(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/exams/sessions — list sessions
examsRouter.get('/sessions', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { semester, academicYear } = req.query;
    const result = await MarksService.listExamSessions(undefined);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/exams/marks/enter — enter marks
examsRouter.post('/marks/enter', authenticate, authorize(['FACULTY', 'HOD', 'EXAM_CELL']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { examSessionId, subjectId, records } = req.body;
    if (!examSessionId || !subjectId || !records) {
      return res.status(400).json({ success: false, error: 'examSessionId, subjectId, and records[] required' });
    }
    const result = await MarksService.enterMarks(req.user!.id, examSessionId, subjectId, records, req);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/exams/marks/:sessionId/:subjectId
examsRouter.get('/marks/:sessionId/:subjectId', authenticate, authorize(['FACULTY', 'HOD', 'EXAM_CELL', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.getMarks(req.params.sessionId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/exams/sessions/:id/lock
examsRouter.post('/sessions/:id/lock', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'EXAM_CELL']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.lockExamSession(req.params.id, req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/exams/hall-ticket/:studentId/:sessionId
examsRouter.get('/hall-ticket/:studentId/:sessionId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.generateHallTicket(req.params.studentId, req.params.sessionId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/exams/detained/:sessionId
examsRouter.get('/detained/:sessionId', authenticate, authorize(['EXAM_CELL', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.getDetainedStudents(req.params.sessionId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/exams/sessions/:id/publish
examsRouter.post('/sessions/:id/publish', authenticate, authorize(['EXAM_CELL', 'ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.publishResults(req.params.id, req.user!.id);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/exams/grades/:studentId
examsRouter.get('/grades/:studentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await MarksService.getStudentGrades(req.params.studentId);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
});

export default examsRouter;
