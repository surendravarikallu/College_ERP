"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const examCell_controller_1 = require("./examCell.controller");
const examsRouter = (0, express_1.Router)();
// ——— Legacy Exam Endpoints ———
examsRouter.post('/schedule', (req, res) => res.status(201).json({ success: true, data: [] }));
examsRouter.post('/marks/bulk-upload', (req, res) => res.status(200).json({ success: true, data: [] }));
examsRouter.put('/marks/publish/:scheduleId', (req, res) => res.status(200).json({ success: true, data: [] }));
// ——— Autonomous Exam Cell ———
// Script Management
examsRouter.post('/scripts/generate', examCell_controller_1.ExamCellController.generateScripts);
examsRouter.post('/scripts/allocate', examCell_controller_1.ExamCellController.allocateScripts);
examsRouter.post('/scripts/:scriptId/finalize', examCell_controller_1.ExamCellController.finalizeScript);
// Evaluation
examsRouter.post('/evaluation/submit', examCell_controller_1.ExamCellController.submitEvaluation);
// Moderation
examsRouter.post('/moderation/submit', examCell_controller_1.ExamCellController.moderateScript);
// Result Processing & Publication
examsRouter.post('/results/process', examCell_controller_1.ExamCellController.processResults);
examsRouter.post('/results/publication', examCell_controller_1.ExamCellController.createPublication);
examsRouter.put('/results/publication/:id/advance', examCell_controller_1.ExamCellController.advancePublication);
// Revaluation
examsRouter.post('/revaluation/request', examCell_controller_1.ExamCellController.requestRevaluation);
examsRouter.put('/revaluation/:id/resolve', examCell_controller_1.ExamCellController.resolveRevaluation);
// Dashboard & Memos
examsRouter.get('/dashboard', examCell_controller_1.ExamCellController.getDashboard);
examsRouter.get('/memo/:studentId', examCell_controller_1.ExamCellController.downloadMarksMemo);
exports.default = examsRouter;
