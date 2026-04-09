"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamCellService = void 0;
const client_1 = require("@prisma/client");
const api_error_1 = require("../../core/common/exceptions/api.error");
const crypto_1 = __importDefault(require("crypto"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const emitter_service_1 = require("../../core/websockets/emitter.service");
// Use a dedicated client instance to ensure new model types are resolved
const db = new client_1.PrismaClient();
// Configurable evaluation deviation threshold (percentage)
const DEVIATION_THRESHOLD = 15;
function gradeToPoints(grade) {
    const map = { 'O': 10, 'A+': 9, 'A': 8.5, 'B+': 8, 'B': 7, 'C': 6, 'D': 5, 'F': 0 };
    return map[grade] ?? 0;
}
class ExamCellService {
    // ——— Script Generation ———
    static async generateScripts(examScheduleId) {
        const exam = await db.examSchedule.findUnique({
            where: { id: examScheduleId },
            include: { subject: { include: { course: { include: { batches: { include: { students: true } } } } } } }
        });
        if (!exam)
            throw new api_error_1.APIError('NOT_FOUND', 'Exam schedule not found.');
        const students = exam.subject.course.batches.flatMap((b) => b.students);
        if (students.length === 0)
            throw new api_error_1.APIError('BAD_REQUEST', 'No students enrolled for this exam.');
        const scripts = await db.$transaction(students.map((student) => db.answerScript.upsert({
            where: { examScheduleId_studentId: { examScheduleId, studentId: student.id } },
            update: {},
            create: {
                examScheduleId,
                studentId: student.id,
                maskedId: `SCR-${crypto_1.default.randomBytes(4).toString('hex').toUpperCase()}`,
                status: 'PENDING',
            },
        })));
        return { generated: scripts.length };
    }
    // ——— Script Allocation ———
    static async allocateScripts(examScheduleId, primaryEvaluatorId, secondaryEvaluatorId) {
        const scripts = await db.answerScript.findMany({
            where: { examScheduleId, status: 'PENDING' },
        });
        if (scripts.length === 0)
            throw new api_error_1.APIError('BAD_REQUEST', 'No pending scripts to allocate.');
        const allocations = await db.$transaction(async (tx) => {
            const results = [];
            for (const script of scripts) {
                const primary = await tx.scriptAllocation.create({
                    data: { scriptId: script.id, evaluatorId: primaryEvaluatorId, isPrimary: true, status: 'ASSIGNED' },
                });
                results.push(primary);
                if (secondaryEvaluatorId) {
                    const secondary = await tx.scriptAllocation.create({
                        data: { scriptId: script.id, evaluatorId: secondaryEvaluatorId, isPrimary: false, status: 'ASSIGNED' },
                    });
                    results.push(secondary);
                }
                await tx.answerScript.update({ where: { id: script.id }, data: { status: 'ALLOCATED' } });
            }
            return results;
        });
        return { allocated: scripts.length, allocations: allocations.length };
    }
    // ——— Evaluation ———
    static async submitEvaluation(scriptId, evaluatorId, marksAwarded, feedback) {
        const script = await db.answerScript.findUnique({
            where: { id: scriptId },
            include: { evaluations: true, allocations: true },
        });
        if (!script)
            throw new api_error_1.APIError('NOT_FOUND', 'Answer script not found.');
        if (script.status === 'FINALIZED')
            throw new api_error_1.APIError('CONFLICT', 'Script already finalized.');
        const allocation = script.allocations.find((a) => a.evaluatorId === evaluatorId);
        if (!allocation)
            throw new api_error_1.APIError('FORBIDDEN', 'You are not assigned to evaluate this script.');
        const existing = script.evaluations.find((e) => e.evaluatorId === evaluatorId);
        if (existing)
            throw new api_error_1.APIError('CONFLICT', 'You have already evaluated this script.');
        const exam = await db.examSchedule.findFirst({
            where: { answerScripts: { some: { id: scriptId } } }
        });
        const maxMarks = exam?.maxMarks ?? 100;
        return await db.$transaction(async (tx) => {
            const evaluation = await tx.evaluationRecord.create({
                data: { scriptId, evaluatorId, marksAwarded, feedback },
            });
            await tx.scriptAllocation.update({ where: { id: allocation.id }, data: { status: 'COMPLETED' } });
            const allEvals = [...script.evaluations, evaluation];
            const totalAllocations = script.allocations.length;
            // Logic for Double Evaluation + Potential 3rd Evaluator
            if (allEvals.length >= totalAllocations && totalAllocations >= 2) {
                const marks = allEvals.map((e) => e.marksAwarded);
                const deviation = Math.abs(marks[0] - marks[1]);
                const deviationPercent = (deviation / maxMarks) * 100;
                if (deviationPercent <= DEVIATION_THRESHOLD || allEvals.length === 3) {
                    // If 3rd evaluation is done, take the average of the two closest marks or the 3rd mark if specifically regulated
                    // Standard practice: Avg of all or avg of closest. Here we take average of all for simplicity.
                    const avgMarks = allEvals.reduce((a, b) => a + b.marksAwarded, 0) / allEvals.length;
                    await tx.answerScript.update({
                        where: { id: scriptId },
                        data: { finalMarks: Math.round(avgMarks * 100) / 100, status: 'EVALUATED' },
                    });
                }
                else {
                    // Deviation detected (>15%) and only 2 evaluations done -> Flag for 3rd evaluation
                    await tx.answerScript.update({
                        where: { id: scriptId },
                        data: { status: 'ALLOCATED' }, // Keep as allocated, but wait for 3rd
                    });
                    // Note: Administrator must now assign a 3rd evaluator manually or via specialized logic
                }
            }
            else if (totalAllocations === 1) {
                await tx.answerScript.update({
                    where: { id: scriptId },
                    data: { finalMarks: marksAwarded, status: 'EVALUATED' },
                });
            }
            return evaluation;
        });
    }
    // ——— Moderation ———
    static async moderateScript(scriptId, moderatorId, moderatedMarks, reason) {
        const script = await db.answerScript.findUnique({ where: { id: scriptId } });
        if (!script)
            throw new api_error_1.APIError('NOT_FOUND', 'Script not found.');
        if (script.status === 'FINALIZED')
            throw new api_error_1.APIError('CONFLICT', 'Cannot moderate finalized script.');
        const originalMarks = script.finalMarks ?? 0;
        return await db.$transaction(async (tx) => {
            const moderation = await tx.moderationRecord.create({
                data: { scriptId, moderatorId, originalMarks, moderatedMarks, reason },
            });
            await tx.answerScript.update({
                where: { id: scriptId },
                data: { finalMarks: moderatedMarks, status: 'REVIEWED' },
            });
            return moderation;
        });
    }
    // ——— Finalize ———
    static async finalizeScript(scriptId) {
        const script = await db.answerScript.findUnique({ where: { id: scriptId } });
        if (!script)
            throw new api_error_1.APIError('NOT_FOUND', 'Script not found.');
        if (script.finalMarks === null)
            throw new api_error_1.APIError('BAD_REQUEST', 'Cannot finalize without marks.');
        return db.answerScript.update({
            where: { id: scriptId },
            data: { status: 'FINALIZED' },
        });
    }
    // ——— Result Processing Engine ———
    static async processResults(examScheduleId) {
        const exam = await db.examSchedule.findUnique({
            where: { id: examScheduleId },
            include: { answerScripts: { where: { status: 'FINALIZED' } } },
        });
        if (!exam)
            throw new api_error_1.APIError('NOT_FOUND', 'Exam schedule not found.');
        const gradingScale = await db.gradingScale.findMany({ orderBy: { minMarks: 'desc' } });
        const maxMarks = exam.maxMarks;
        const results = exam.answerScripts.map((script) => {
            const percentage = maxMarks > 0 ? ((script.finalMarks ?? 0) / maxMarks) * 100 : 0;
            const grade = gradingScale.find((g) => percentage >= g.minMarks && percentage <= g.maxMarks)?.grade || 'F';
            const isBacklog = grade === 'F';
            const gp = gradeToPoints(grade);
            return {
                scriptId: script.id,
                studentId: script.studentId,
                marks: script.finalMarks,
                percentage: Math.round(percentage * 100) / 100,
                grade,
                gradePoints: gp,
                isBacklog,
            };
        });
        const totalPoints = results.reduce((s, r) => s + r.gradePoints, 0);
        const sgpa = results.length > 0 ? Math.round((totalPoints / results.length) * 100) / 100 : 0;
        return {
            examScheduleId,
            totalScripts: results.length,
            sgpa,
            results,
            backlogs: results.filter((r) => r.isBacklog).length,
        };
    }
    // ——— Result Release Workflow ———
    static async createResultPublication(examScheduleId, publishedBy) {
        return db.resultPublication.create({
            data: { examScheduleId, publishedBy, status: 'DRAFT' },
        });
    }
    static async advancePublicationStatus(publicationId, targetStatus) {
        const pub = await db.resultPublication.findUnique({ where: { id: publicationId } });
        if (!pub)
            throw new api_error_1.APIError('NOT_FOUND', 'Publication not found.');
        const validTransitions = {
            'DRAFT': 'VERIFIED',
            'VERIFIED': 'APPROVED',
            'APPROVED': 'RELEASED',
        };
        if (validTransitions[pub.status] !== targetStatus) {
            throw new api_error_1.APIError('BAD_REQUEST', `Cannot transition from ${pub.status} to ${targetStatus}.`);
        }
        // Strict Rule: Cannot move to APPROVED unless ALL answer scripts are FINALIZED
        if (targetStatus === 'APPROVED') {
            const unfinalized = await db.answerScript.count({
                where: { examScheduleId: pub.examScheduleId, status: { not: 'FINALIZED' } }
            });
            if (unfinalized > 0)
                throw new api_error_1.APIError('BAD_REQUEST', `Cannot approve: ${unfinalized} scripts are not finalized.`);
        }
        const updated = await db.resultPublication.update({
            where: { id: publicationId },
            data: {
                status: targetStatus,
                publishedAt: targetStatus === 'RELEASED' ? new Date() : undefined,
            },
            include: { examSchedule: { include: { subject: { include: { course: { include: { department: true } } } } } } }
        });
        if (targetStatus === 'RELEASED') {
            const instId = updated.examSchedule.subject.course.department.institutionId;
            emitter_service_1.SocketEmitter.emitToTenant(instId, 'result_published', {
                examId: updated.examScheduleId,
                subject: updated.examSchedule.subject.name
            });
        }
        return updated;
    }
    // ——— Revaluation ———
    static async requestRevaluation(scriptId, invoiceId) {
        const script = await db.answerScript.findUnique({ where: { id: scriptId } });
        if (!script)
            throw new api_error_1.APIError('NOT_FOUND', 'Script not found.');
        if (script.status !== 'FINALIZED')
            throw new api_error_1.APIError('BAD_REQUEST', 'Can only request revaluation for finalized scripts.');
        if (script.finalMarks === null)
            throw new api_error_1.APIError('BAD_REQUEST', 'No marks recorded for this script.');
        const existing = await db.revaluationRequest.findFirst({
            where: { scriptId, status: { in: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'IN_PROCESS'] } },
        });
        if (existing)
            throw new api_error_1.APIError('CONFLICT', 'An active revaluation request already exists.');
        return db.revaluationRequest.create({
            data: {
                scriptId,
                invoiceId,
                originalMarks: script.finalMarks,
                status: invoiceId ? 'PAYMENT_VERIFIED' : 'PENDING_PAYMENT',
            },
        });
    }
    static async resolveRevaluation(revaluationId, newMarks) {
        const reval = await db.revaluationRequest.findUnique({ where: { id: revaluationId } });
        if (!reval)
            throw new api_error_1.APIError('NOT_FOUND', 'Revaluation request not found.');
        const status = newMarks !== null && newMarks !== reval.originalMarks ? 'MARKS_ALTERED' : 'NO_CHANGE';
        return db.$transaction(async (tx) => {
            const updated = await tx.revaluationRequest.update({
                where: { id: revaluationId },
                data: { newMarks, status, resolvedAt: new Date() },
            });
            if (status === 'MARKS_ALTERED' && newMarks !== null) {
                await tx.answerScript.update({
                    where: { id: reval.scriptId },
                    data: { finalMarks: newMarks },
                });
            }
            return updated;
        });
    }
    // ——— Dashboard Aggregation ———
    static async getExamCellDashboard() {
        const [totalScripts, pendingAllocation, evaluated, finalized, pendingRevals] = await Promise.all([
            db.answerScript.count(),
            db.answerScript.count({ where: { status: 'PENDING' } }),
            db.answerScript.count({ where: { status: 'EVALUATED' } }),
            db.answerScript.count({ where: { status: 'FINALIZED' } }),
            db.revaluationRequest.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'IN_PROCESS'] } } }),
        ]);
        return { totalScripts, pendingAllocation, evaluated, finalized, pendingRevals };
    }
    // ——— PDF Generation ———
    static async generateMarksMemo(studentId, examScheduleId) {
        const student = await db.studentProfile.findUnique({
            where: { id: studentId },
            include: {
                user: true,
                batch: { include: { course: true } },
                answerScripts: {
                    where: examScheduleId ? { examScheduleId, status: 'FINALIZED' } : { status: 'FINALIZED' },
                    include: { examSchedule: { include: { subject: true } } }
                }
            }
        });
        if (!student)
            throw new api_error_1.APIError('NOT_FOUND', 'Student not found.');
        if (student.answerScripts.length === 0)
            throw new api_error_1.APIError('BAD_REQUEST', 'No finalized scripts found for memo generation.');
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
            // Header
            doc.fontSize(20).text('ACADEMIC ARCHITECT ERP', { align: 'center' });
            doc.fontSize(14).text('Official Marks Statement', { align: 'center' });
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            // Student Info
            doc.fontSize(10);
            doc.text(`Student Name: ${student.firstName} ${student.lastName}`);
            doc.text(`Enrollment No: ${student.enrollmentNo}`);
            doc.text(`Course: ${student.batch?.course.name || 'N/A'}`);
            doc.text(`Batch: ${student.batch?.year || 'N/A'}`);
            doc.moveDown();
            // Table Header
            const tableTop = doc.y;
            doc.font('Helvetica-Bold');
            doc.text('Subject', 50, tableTop);
            doc.text('Code', 250, tableTop);
            doc.text('Max', 350, tableTop);
            doc.text('Marks', 400, tableTop);
            doc.text('Grade', 450, tableTop);
            doc.font('Helvetica').moveDown();
            // Table Body
            let totalMarks = 0;
            let totalMax = 0;
            student.answerScripts.forEach((script) => {
                const y = doc.y;
                const marks = script.finalMarks || 0;
                const max = script.examSchedule.maxMarks;
                const percent = (marks / max) * 100;
                const grade = percent >= 90 ? 'O' : percent >= 80 ? 'A+' : percent >= 70 ? 'A' : percent >= 60 ? 'B+' : 'B';
                doc.text(script.examSchedule.subject.name, 50, y);
                doc.text(script.examSchedule.subject.code, 250, y);
                doc.text(String(max), 350, y);
                doc.text(String(marks), 400, y);
                doc.text(grade, 450, y);
                doc.moveDown();
                totalMarks += marks;
                totalMax += max;
            });
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            doc.fontSize(12).text(`Aggregate Percentage: ${((totalMarks / totalMax) * 100).toFixed(2)}%`, { align: 'right' });
            // Footer
            doc.fontSize(8).text('Generated by Autonomous Exam Cell System', 50, 750, { align: 'center' });
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.end();
        });
    }
}
exports.ExamCellService = ExamCellService;
