import { Request, Response, NextFunction } from 'express';
import { ExamCellService } from './examCell.service';

export class ExamCellController {

  /** POST /exams/scripts/generate */
  static async generateScripts(req: Request, res: Response, next: NextFunction) {
    try {
      const { examScheduleId } = req.body;
      const result = await ExamCellService.generateScripts(examScheduleId);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/scripts/allocate */
  static async allocateScripts(req: Request, res: Response, next: NextFunction) {
    try {
      const { examScheduleId, primaryEvaluatorId, secondaryEvaluatorId } = req.body;
      const result = await ExamCellService.allocateScripts(examScheduleId, primaryEvaluatorId, secondaryEvaluatorId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/evaluation/submit */
  static async submitEvaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const { scriptId, evaluatorId, marksAwarded, feedback } = req.body;
      const result = await ExamCellService.submitEvaluation(scriptId, evaluatorId, marksAwarded, feedback);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/moderation/submit */
  static async moderateScript(req: Request, res: Response, next: NextFunction) {
    try {
      const { scriptId, moderatorId, moderatedMarks, reason } = req.body;
      const result = await ExamCellService.moderateScript(scriptId, moderatorId, moderatedMarks, reason);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/scripts/:scriptId/finalize */
  static async finalizeScript(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ExamCellService.finalizeScript(req.params.scriptId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/results/process */
  static async processResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { examScheduleId } = req.body;
      const result = await ExamCellService.processResults(examScheduleId);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/results/publication */
  static async createPublication(req: Request, res: Response, next: NextFunction) {
    try {
      const { examScheduleId, publishedBy } = req.body;
      const result = await ExamCellService.createResultPublication(examScheduleId, publishedBy);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** PUT /exams/results/publication/:id/advance */
  static async advancePublication(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetStatus } = req.body;
      const result = await ExamCellService.advancePublicationStatus(req.params.id, targetStatus);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** POST /exams/revaluation/request */
  static async requestRevaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const { scriptId, invoiceId } = req.body;
      const result = await ExamCellService.requestRevaluation(scriptId, invoiceId);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** PUT /exams/revaluation/:id/resolve */
  static async resolveRevaluation(req: Request, res: Response, next: NextFunction) {
    try {
      const { newMarks } = req.body;
      const result = await ExamCellService.resolveRevaluation(req.params.id, newMarks);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** GET /exams/dashboard */
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ExamCellService.getExamCellDashboard();
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  /** GET /exams/memo/:studentId */
  static async downloadMarksMemo(req: Request, res: Response, next: NextFunction) {
    try {
      const { examScheduleId } = req.query;
      const pdfBuffer = await ExamCellService.generateMarksMemo(req.params.studentId, examScheduleId as string);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=MarksMemo_${req.params.studentId}.pdf`);
      res.send(pdfBuffer);
    } catch (err) { next(err); }
  }
}
