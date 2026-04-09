// @ts-nocheck
import { db } from './examcell.db';
import { students, results, subjects, studentAcademicStatus } from './examcell.schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { env } from './config.js';

/**
 * Helper to fetch cumulative data for students with filters.
 * Returns array of objects containing student, backlogCount, totalCredits, sgpa etc.
 */
async function fetchCumulativeData(filters: any = {}) {
    // Reuse storage logic by calling storage methods if needed.
    // For simplicity, we directly query similar to getCumulativeBacklogs.
    const studentConditions: any[] = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));
    if (filters.batch) {
        const startYearMatch = filters.batch.match(/^20(\d{2})/);
        if (startYearMatch) {
            const yy = parseInt(startYearMatch[1]);
            const regularPrefix = `${yy}JK%`;
            const excludeLateralPrefix = `${yy}JK5%`;
            const lateralPrefix = `${yy + 1}JK5%`;
            studentConditions.push(
                or(
                    eq(students.batch, filters.batch),
                    and(
                        sql`students.roll_number ILIKE ${regularPrefix}`,
                        sql`students.roll_number NOT ILIKE ${excludeLateralPrefix}`
                    ),
                    sql`students.roll_number ILIKE ${lateralPrefix}`
                )
            );
        } else {
            studentConditions.push(eq(students.batch, filters.batch));
        }
    }

    const queryResult = await db.select({
        student: students,
        result: results,
        subject: subjects,
        academicStatus: studentAcademicStatus
    })
        .from(students)
        .leftJoin(results, and(eq(students.id, results.studentId), eq(results.isLatest, true)))
        .leftJoin(subjects, eq(results.subjectId, subjects.id))
        .leftJoin(studentAcademicStatus, eq(students.id, studentAcademicStatus.studentId))
        .where(studentConditions.length > 0 ? and(...studentConditions) : undefined)
        // Order by updated_at descending to get the latest status if there are multiple
        .orderBy(sql`${studentAcademicStatus.updatedAt} DESC`);

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();
    const latestStatusByStudent = new Map<number, typeof studentAcademicStatus.$inferSelect>();

    for (const row of queryResult) {
        if (!studentMap.has(row.student.id)) {
            studentMap.set(row.student.id, row.student);
            resultsByStudent.set(row.student.id, []);
            if (row.academicStatus) {
                latestStatusByStudent.set(row.student.id, row.academicStatus);
            }
        }
        if (row.result && row.subject) {
            resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
        }
    }

    const cumulativeData: any[] = [];
    for (const [id, student] of Array.from(studentMap.entries())) {
        const studentResults = resultsByStudent.get(id)!;
        const statusRecord = latestStatusByStudent.get(id);

        // Compute backlog count and total credits (simplified)
        let backlogCount = 0;
        let totalCredits = 0;
        for (const r of studentResults) {
            if (r.status === 'BACKLOG') backlogCount++;
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

export async function getEligibleStudents(filters: any = {}): Promise<any[]> {
    const maxBacklog = Number(env.PROMOTION_MAX_BACKLOG ?? 0);
    const minCredits = Number(env.PROMOTION_MIN_CREDITS ?? 0);
    const data = await fetchCumulativeData(filters);
    return data.map(d => ({
        ...d,
        isEligible: d.backlogCount <= maxBacklog && d.totalCredits >= minCredits,
    }));
}

/** Promote students to a target academic year/semester */
export async function promoteStudents(studentIds: number[], target: { academicYear: string; semester: string }, reason: string = ''): Promise<void> {
    for (const id of studentIds) {
        await db.insert(studentAcademicStatus).values({
            studentId: id,
            academicYear: target.academicYear,
            semester: target.semester,
            status: 'PROMOTED',
            reason,
        });
    }
}

/** Demote (rollback) promotion */
export async function demoteStudents(studentIds: number[], reason: string = ''): Promise<void> {
    for (const id of studentIds) {
        await db.insert(studentAcademicStatus).values({
            studentId: id,
            academicYear: '',
            semester: '',
            status: 'DEMOTED',
            reason,
        });
    }
}

/** Detain students */
export async function detainStudents(studentIds: number[], target: { academicYear: string; semester: string }, reason: string = ''): Promise<void> {
    for (const id of studentIds) {
        await db.insert(studentAcademicStatus).values({
            studentId: id,
            academicYear: target.academicYear,
            semester: target.semester,
            status: 'DETAINED',
            reason,
        });
    }
}

/** Apply leave (student left the program) */
export async function applyLeave(studentIds: number[], reason: string = ''): Promise<void> {
    for (const id of studentIds) {
        await db.insert(studentAcademicStatus).values({
            studentId: id,
            academicYear: '',
            semester: '',
            status: 'LEFT',
            reason,
        });
    }
}

/** Update a single student's status from the Nominal Rolls page */
export async function updateStudentStatus(
    studentId: number,
    status: string,
    reason: string = '',
    academicYear: string = '',
    semester: string = ''
): Promise<void> {
    await db.insert(studentAcademicStatus).values({
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
export async function getNominalRolls(batch: string, branch: string, semester?: string, academicYear?: string, section?: string) {
    const studentConditions: any[] = [];
    if (branch) studentConditions.push(eq(students.branch, branch));
    if (section) studentConditions.push(eq(students.section, section));
    if (batch) {
        const startYearMatch = batch.match(/^20(\d{2})/);
        if (startYearMatch) {
            const yy = parseInt(startYearMatch[1]);
            const regularPrefix = `${yy}JK%`;
            const excludeLateralPrefix = `${yy}JK5%`;
            const lateralPrefix = `${yy + 1}JK5%`;
            studentConditions.push(
                or(
                    eq(students.batch, batch),
                    and(
                        sql`students.roll_number ILIKE ${regularPrefix}`,
                        sql`students.roll_number NOT ILIKE ${excludeLateralPrefix}`
                    ),
                    sql`students.roll_number ILIKE ${lateralPrefix}`
                )
            );
        } else {
            studentConditions.push(eq(students.batch, batch));
        }
    }


    // Join students with all their historical statuses
    const queryResult = await db.select({
        student: students,
        academicStatus: studentAcademicStatus
    })
        .from(students)
        .leftJoin(studentAcademicStatus, eq(students.id, studentAcademicStatus.studentId))
        .where(
            studentConditions.length > 0 ? and(...studentConditions) : undefined
        )
        .orderBy(sql`${studentAcademicStatus.updatedAt} DESC`);

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const historyByStudent = new Map<number, (typeof studentAcademicStatus.$inferSelect)[]>();

    for (const row of queryResult) {
        if (!studentMap.has(row.student.id)) {
            studentMap.set(row.student.id, row.student);
            historyByStudent.set(row.student.id, []);
        }
        if (row.academicStatus) {
            historyByStudent.get(row.student.id)!.push(row.academicStatus);
        }
    }

    const nominalRolls: any[] = [];
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


