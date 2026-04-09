"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamCellController = void 0;
const examCell_service_1 = require("./examCell.service");
class ExamCellController {
    /** POST /exams/scripts/generate */
    static async generateScripts(req, res, next) {
        try {
            const { examScheduleId } = req.body;
            const result = await examCell_service_1.ExamCellService.generateScripts(examScheduleId);
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/scripts/allocate */
    static async allocateScripts(req, res, next) {
        try {
            const { examScheduleId, primaryEvaluatorId, secondaryEvaluatorId } = req.body;
            const result = await examCell_service_1.ExamCellService.allocateScripts(examScheduleId, primaryEvaluatorId, secondaryEvaluatorId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/evaluation/submit */
    static async submitEvaluation(req, res, next) {
        try {
            const { scriptId, evaluatorId, marksAwarded, feedback } = req.body;
            const result = await examCell_service_1.ExamCellService.submitEvaluation(scriptId, evaluatorId, marksAwarded, feedback);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/moderation/submit */
    static async moderateScript(req, res, next) {
        try {
            const { scriptId, moderatorId, moderatedMarks, reason } = req.body;
            const result = await examCell_service_1.ExamCellService.moderateScript(scriptId, moderatorId, moderatedMarks, reason);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/scripts/:scriptId/finalize */
    static async finalizeScript(req, res, next) {
        try {
            const result = await examCell_service_1.ExamCellService.finalizeScript(req.params.scriptId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/results/process */
    static async processResults(req, res, next) {
        try {
            const { examScheduleId } = req.body;
            const result = await examCell_service_1.ExamCellService.processResults(examScheduleId);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/results/publication */
    static async createPublication(req, res, next) {
        try {
            const { examScheduleId, publishedBy } = req.body;
            const result = await examCell_service_1.ExamCellService.createResultPublication(examScheduleId, publishedBy);
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** PUT /exams/results/publication/:id/advance */
    static async advancePublication(req, res, next) {
        try {
            const { targetStatus } = req.body;
            const result = await examCell_service_1.ExamCellService.advancePublicationStatus(req.params.id, targetStatus);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** POST /exams/revaluation/request */
    static async requestRevaluation(req, res, next) {
        try {
            const { scriptId, invoiceId } = req.body;
            const result = await examCell_service_1.ExamCellService.requestRevaluation(scriptId, invoiceId);
            res.status(201).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** PUT /exams/revaluation/:id/resolve */
    static async resolveRevaluation(req, res, next) {
        try {
            const { newMarks } = req.body;
            const result = await examCell_service_1.ExamCellService.resolveRevaluation(req.params.id, newMarks);
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** GET /exams/dashboard */
    static async getDashboard(req, res, next) {
        try {
            const result = await examCell_service_1.ExamCellService.getExamCellDashboard();
            res.status(200).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /** GET /exams/memo/:studentId */
    static async downloadMarksMemo(req, res, next) {
        try {
            const { examScheduleId } = req.query;
            const pdfBuffer = await examCell_service_1.ExamCellService.generateMarksMemo(req.params.studentId, examScheduleId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=MarksMemo_${req.params.studentId}.pdf`);
            res.send(pdfBuffer);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ExamCellController = ExamCellController;
