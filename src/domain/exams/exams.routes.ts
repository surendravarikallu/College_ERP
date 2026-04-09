import { Router } from 'express';
import { ExamCellController } from './examCell.controller';

const examsRouter = Router();

// ——— Legacy Exam Endpoints ———
examsRouter.post('/schedule', (req, res) => res.status(201).json({ success: true, data: [] }));
examsRouter.post('/marks/bulk-upload', (req, res) => res.status(200).json({ success: true, data: [] }));
examsRouter.put('/marks/publish/:scheduleId', (req, res) => res.status(200).json({ success: true, data: [] }));

// ——— Autonomous Exam Cell ———

// Script Management
examsRouter.post('/scripts/generate', ExamCellController.generateScripts);
examsRouter.post('/scripts/allocate', ExamCellController.allocateScripts);
examsRouter.post('/scripts/:scriptId/finalize', ExamCellController.finalizeScript);

// Evaluation
examsRouter.post('/evaluation/submit', ExamCellController.submitEvaluation);

// Moderation
examsRouter.post('/moderation/submit', ExamCellController.moderateScript);

// Result Processing & Publication
examsRouter.post('/results/process', ExamCellController.processResults);
examsRouter.post('/results/publication', ExamCellController.createPublication);
examsRouter.put('/results/publication/:id/advance', ExamCellController.advancePublication);

// Revaluation
examsRouter.post('/revaluation/request', ExamCellController.requestRevaluation);
examsRouter.put('/revaluation/:id/resolve', ExamCellController.resolveRevaluation);

// Dashboard & Memos
examsRouter.get('/dashboard', ExamCellController.getDashboard);
examsRouter.get('/memo/:studentId', ExamCellController.downloadMarksMemo);

export default examsRouter;
