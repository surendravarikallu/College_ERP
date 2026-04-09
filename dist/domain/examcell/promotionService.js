"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEligibleStudents = getEligibleStudents;
exports.promoteStudents = promoteStudents;
exports.demoteStudents = demoteStudents;
exports.detainStudents = detainStudents;
exports.applyLeave = applyLeave;
exports.updateStudentStatus = updateStudentStatus;
exports.getNominalRolls = getNominalRolls;
// @ts-nocheck
const examcell_db_1 = require("./examcell.db");
const examcell_schema_1 = require("./examcell.schema");
const drizzle_orm_1 = require("drizzle-orm");
const config_js_1 = require("./config.js");
/**
 * Helper to fetch cumulative data for students with filters.
 * Returns array of objects containing student, backlogCount, totalCredits, sgpa etc.
 */
async function fetchCumulativeData(filters = {}) {
    // Reuse storage logic by calling storage methods if needed.
    // For simplicity, we directly query similar to getCumulativeBacklogs.
    const studentConditions = [];
    if (filters.branch)
        studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.branch, filters.branch));
    if (filters.section)
        studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.section, filters.section));
    if (filters.batch) {
        const startYearMatch = filters.batch.match(/^20(\d{2})/);
        if (startYearMatch) {
            const yy = parseInt(startYearMatch[1]);
            const regularPrefix = `${yy}JK%`;
            const excludeLateralPrefix = `${yy}JK5%`;
            const lateralPrefix = `${yy + 1}JK5%`;
            studentConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(examcell_schema_1.students.batch, filters.batch), (0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `students.roll_number ILIKE ${regularPrefix}`, (0, drizzle_orm_1.sql) `students.roll_number NOT ILIKE ${excludeLateralPrefix}`), (0, drizzle_orm_1.sql) `students.roll_number ILIKE ${lateralPrefix}`));
        }
        else {
            studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.batch, filters.batch));
        }
    }
    const queryResult = await examcell_db_1.db.select({
        student: examcell_schema_1.students,
        result: examcell_schema_1.results,
        subject: examcell_schema_1.subjects,
        academicStatus: examcell_schema_1.studentAcademicStatus
    })
        .from(examcell_schema_1.students)
        .leftJoin(examcell_schema_1.results, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(examcell_schema_1.students.id, examcell_schema_1.results.studentId), (0, drizzle_orm_1.eq)(examcell_schema_1.results.isLatest, true)))
        .leftJoin(examcell_schema_1.subjects, (0, drizzle_orm_1.eq)(examcell_schema_1.results.subjectId, examcell_schema_1.subjects.id))
        .leftJoin(examcell_schema_1.studentAcademicStatus, (0, drizzle_orm_1.eq)(examcell_schema_1.students.id, examcell_schema_1.studentAcademicStatus.studentId))
        .where(studentConditions.length > 0 ? (0, drizzle_orm_1.and)(...studentConditions) : undefined)
        // Order by updated_at descending to get the latest status if there are multiple
        .orderBy((0, drizzle_orm_1.sql) `${examcell_schema_1.studentAcademicStatus.updatedAt} DESC`);
    const studentMap = new Map();
    const resultsByStudent = new Map();
    const latestStatusByStudent = new Map();
    for (const row of queryResult) {
        if (!studentMap.has(row.student.id)) {
            studentMap.set(row.student.id, row.student);
            resultsByStudent.set(row.student.id, []);
            if (row.academicStatus) {
                latestStatusByStudent.set(row.student.id, row.academicStatus);
            }
        }
        if (row.result && row.subject) {
            resultsByStudent.get(row.student.id).push({ ...row.result, subject: row.subject });
        }
    }
    const cumulativeData = [];
    for (const [id, student] of Array.from(studentMap.entries())) {
        const studentResults = resultsByStudent.get(id);
        const statusRecord = latestStatusByStudent.get(id);
        // Compute backlog count and total credits (simplified)
        let backlogCount = 0;
        let totalCredits = 0;
        for (const r of studentResults) {
            if (r.status === 'BACKLOG')
                backlogCount++;
            totalCredits += Number(r.creditsEarned || 0);
        }
        cumulativeData.push({
            student,
            backlogCount,
            totalCredits,
            status: statusRecord?.status || 'Active',
            statusAcademicYear: statusRecord?.academicYear,
            statusSemester: statusRecord?.semester
        });
    }
    // Sort ascending by rollNumber
    cumulativeData.sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber));
    return cumulativeData;
}
async function getEligibleStudents(filters = {}) {
    const maxBacklog = Number(config_js_1.env.PROMOTION_MAX_BACKLOG ?? 0);
    const minCredits = Number(config_js_1.env.PROMOTION_MIN_CREDITS ?? 0);
    const data = await fetchCumulativeData(filters);
    return data.map(d => ({
        ...d,
        isEligible: d.backlogCount <= maxBacklog && d.totalCredits >= minCredits,
    }));
}
/** Promote students to a target academic year/semester */
async function promoteStudents(studentIds, target, reason = '') {
    for (const id of studentIds) {
        await examcell_db_1.db.insert(examcell_schema_1.studentAcademicStatus).values({
            studentId: id,
            academicYear: target.academicYear,
            semester: target.semester,
            status: 'PROMOTED',
            reason,
        });
    }
}
/** Demote (rollback) promotion */
async function demoteStudents(studentIds, reason = '') {
    for (const id of studentIds) {
        await examcell_db_1.db.insert(examcell_schema_1.studentAcademicStatus).values({
            studentId: id,
            academicYear: '',
            semester: '',
            status: 'DEMOTED',
            reason,
        });
    }
}
/** Detain students */
async function detainStudents(studentIds, target, reason = '') {
    for (const id of studentIds) {
        await examcell_db_1.db.insert(examcell_schema_1.studentAcademicStatus).values({
            studentId: id,
            academicYear: target.academicYear,
            semester: target.semester,
            status: 'DETAINED',
            reason,
        });
    }
}
/** Apply leave (student left the program) */
async function applyLeave(studentIds, reason = '') {
    for (const id of studentIds) {
        await examcell_db_1.db.insert(examcell_schema_1.studentAcademicStatus).values({
            studentId: id,
            academicYear: '',
            semester: '',
            status: 'LEFT',
            reason,
        });
    }
}
/** Update a single student's status from the Nominal Rolls page */
async function updateStudentStatus(studentId, status, reason = '', academicYear = '', semester = '') {
    await examcell_db_1.db.insert(examcell_schema_1.studentAcademicStatus).values({
        studentId,
        academicYear,
        semester,
        status: status.toUpperCase(),
        reason,
    });
}
/**
 * Fetch Nominal Rolls data (Promotion History)
 * If semester is 'ALUMNI', fetches the ultimate historical status for the passed out batch.
 */
async function getNominalRolls(batch, branch, semester, academicYear, section) {
    const studentConditions = [];
    if (branch)
        studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.branch, branch));
    if (section)
        studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.section, section));
    if (batch) {
        const startYearMatch = batch.match(/^20(\d{2})/);
        if (startYearMatch) {
            const yy = parseInt(startYearMatch[1]);
            const regularPrefix = `${yy}JK%`;
            const excludeLateralPrefix = `${yy}JK5%`;
            const lateralPrefix = `${yy + 1}JK5%`;
            studentConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(examcell_schema_1.students.batch, batch), (0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `students.roll_number ILIKE ${regularPrefix}`, (0, drizzle_orm_1.sql) `students.roll_number NOT ILIKE ${excludeLateralPrefix}`), (0, drizzle_orm_1.sql) `students.roll_number ILIKE ${lateralPrefix}`));
        }
        else {
            studentConditions.push((0, drizzle_orm_1.eq)(examcell_schema_1.students.batch, batch));
        }
    }
    // Join students with all their historical statuses
    const queryResult = await examcell_db_1.db.select({
        student: examcell_schema_1.students,
        academicStatus: examcell_schema_1.studentAcademicStatus
    })
        .from(examcell_schema_1.students)
        .leftJoin(examcell_schema_1.studentAcademicStatus, (0, drizzle_orm_1.eq)(examcell_schema_1.students.id, examcell_schema_1.studentAcademicStatus.studentId))
        .where(studentConditions.length > 0 ? (0, drizzle_orm_1.and)(...studentConditions) : undefined)
        .orderBy((0, drizzle_orm_1.sql) `${examcell_schema_1.studentAcademicStatus.updatedAt} DESC`);
    const studentMap = new Map();
    const historyByStudent = new Map();
    for (const row of queryResult) {
        if (!studentMap.has(row.student.id)) {
            studentMap.set(row.student.id, row.student);
            historyByStudent.set(row.student.id, []);
        }
        if (row.academicStatus) {
            historyByStudent.get(row.student.id).push(row.academicStatus);
        }
    }
    const nominalRolls = [];
    for (const [id, student] of Array.from(studentMap.entries())) {
        const history = historyByStudent.get(id) || [];
        // Current status is always the absolute latest record
        let finalStatus = history.length > 0 ? history[0].status : 'Active';
        // Filter history for display if academicYear or semester provided
        let displayHistory = history;
        if (academicYear) {
            displayHistory = history.filter(h => h.academicYear === academicYear || h.academicYear === '');
        }
        // If ALUMNI, we just take the absolute latest status they ended up with.
        nominalRolls.push({
            student,
            currentStatus: finalStatus,
            history: displayHistory // Array of past logs for timeline display
        });
    }
    // Sort ascending by rollNumber
    nominalRolls.sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber));
    return nominalRolls;
}
