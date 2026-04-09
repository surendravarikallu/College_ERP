// @ts-nocheck
import { ecDb as db } from "./examcell.db";
import { admins, students, subjects, results, studentAcademicStatus, studentPhotos, faculty, facultySubjectMap, globalSettings, midExams, midMarks, auditLogs, type Admin, type InsertAdmin, type Student, type InsertStudent, type Subject, type InsertSubject, type Result, type InsertResult, type StudentDetails, type Faculty, type InsertFaculty, type FacultySubjectMap, type InsertFacultySubjectMap, type GlobalSettings, type MidExam, type InsertMidExam, type MidMark, type InsertMidMark, type AuditLog, type InsertAuditLog } from "./examcell.schema";
import { eq, and, desc, asc, sql, ilike, inArray, or, not } from "drizzle-orm";

/**
 * Converts an academic year range like "2025-2026" into an SQL condition
 * matching all raw month-year values stored in the results table.
 * If the input isn't in YYYY-YYYY format, does an exact match.
 */

/**
 * For a given batch string (e.g. 2023-2027), returns an array of batches including its lateral entry batch.
 */
function expandBatch(batchStr?: string): string[] {
  if (!batchStr) return [];
  const match = batchStr.match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const startYear = parseInt(match[1]);
    const endYear = parseInt(match[2]);
    if (endYear - startYear === 4) {
      return [batchStr, `${startYear + 1}-${endYear}`];
    }
  }
  return [batchStr];
}

function academicYearCondition(column: any, acYear: string) {
  const match = acYear.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    // Not a range â€” do exact match (backward compat)
    return eq(column, acYear);
  }
  const startYear = parseInt(match[1]);
  const endYear = parseInt(match[2]);
  const months2ndHalf = ['June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months1stHalf = ['January', 'February', 'March', 'April', 'May'];

  const possibleValues = [
    ...months2ndHalf.map(m => `${m} ${startYear}`),
    ...months1stHalf.map(m => `${m} ${endYear}`),
    acYear, // also match the range itself if stored that way
  ];
  return inArray(column, possibleValues);
}

export interface IStorage {
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdmins(): Promise<Omit<Admin, 'password'>[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: number, admin: Partial<InsertAdmin>): Promise<Omit<Admin, 'password'> | undefined>;
  deleteAdmin(id: number): Promise<boolean>;
  getStudentByRoll(rollNumber: string): Promise<Student | undefined>;
  getStudent(id: number): Promise<StudentDetails | undefined>;
  updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudentCascading(id: number): Promise<void>;
  mergeStudentProfiles(sourceId: number, targetId: number): Promise<void>;
  getBatchTranscripts(branch: string, batch: string): Promise<StudentDetails[]>;
  searchStudents(query?: string, page?: number, limit?: number): Promise<{ data: Student[], total: number, page: number, totalPages: number }>;
  processResultsUpload(resultsData: any[], metadata: any): Promise<{ processed: number, skipped: number, errors: string[] }>;
  processStudentsUpload(studentsData: any[]): Promise<{ processed: number, errors: string[] }>;
  getBacklogs(filters?: any): Promise<any[]>;
  getCumulativeBacklogs(filters?: any): Promise<any[]>;
  getAnalytics(): Promise<any>;
  getDistinctBatches(): Promise<string[]>;
  getDistinctBranches(): Promise<string[]>;
  getDistinctAcademicYears(): Promise<string[]>;
  getDistinctPrograms(): Promise<string[]>;
  getDistinctSections(batch?: string, branch?: string): Promise<string[]>;
  upsertStudentPhoto(rollNumber: string, base64Data: string): Promise<boolean>;
  getStudentPhoto(studentId: number): Promise<string | null>;
  // Faculty
  getFaculty(): Promise<Faculty[]>;
  createFaculty(data: InsertFaculty): Promise<Faculty>;
  updateFaculty(id: number, data: Partial<InsertFaculty>): Promise<Faculty | undefined>;
  deleteFaculty(id: number): Promise<boolean>;
  // Faculty Mapping
  getFacultyMappings(filters?: any): Promise<any[]>;
  createFacultyMapping(data: InsertFacultySubjectMap): Promise<FacultySubjectMap>;
  deleteFacultyMapping(id: number): Promise<boolean>;
  // Consolidated Report
  getConsolidatedReport(filters: any): Promise<any>;

  // MID Marks
  getMidExam(filters: { academicYear: string, semester: string, branch: string, subjectCode: string, midType: string, batch: string }): Promise<import('./examcell.schema').MidExam | undefined>;
  createMidExam(data: import('./examcell.schema').InsertMidExam): Promise<import('./examcell.schema').MidExam>;
  getMidMarks(midExamId: number): Promise<import('./examcell.schema').MidMark[]>;
  upsertMidMark(data: import('./examcell.schema').InsertMidMark): Promise<import('./examcell.schema').MidMark>;
  bulkUpsertMidMarks(marks: import('./examcell.schema').InsertMidMark[]): Promise<void>;
  insertAuditLog(data: import('./examcell.schema').InsertAuditLog): Promise<import('./examcell.schema').AuditLog>;
  unlockMidMark(studentId: number, midExamId: number, adminId: number, reason: string): Promise<boolean>;
  finalFreezeExam(examId: number, adminId: number): Promise<boolean>;
  unfreezeExam(examId: number, adminId: number, reason: string): Promise<boolean>;
  // Global Settings
  getGlobalSettings(): Promise<GlobalSettings>;
  updateGlobalSettings(data: Partial<{ autoLockOnSave: boolean }>): Promise<GlobalSettings>;
}

export class DatabaseStorage implements IStorage {
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdmins(): Promise<Omit<Admin, 'password'>[]> {
    const allAdmins = await db.select({
      id: admins.id,
      username: admins.username,
      isAdmin: admins.isAdmin,
      canUpload: admins.canUpload,
      canManageSettings: admins.canManageSettings,
      canManageAcademics: admins.canManageAcademics,
      canManageInternalMarks: admins.canManageInternalMarks,
      canViewDashboard: admins.canViewDashboard,
      canViewStudents: admins.canViewStudents,
      canViewReports: admins.canViewReports,
      canFreezeMarks: admins.canFreezeMarks,
      loginType: admins.loginType,
      allowedIps: admins.allowedIps
    }).from(admins);
    return allAdmins;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  async updateAdmin(id: number, data: Partial<InsertAdmin>): Promise<Omit<Admin, 'password'> | undefined> {
    const [updatedAdmin] = await db.update(admins)
      .set(data)
      .where(eq(admins.id, id))
      .returning({
        id: admins.id,
        username: admins.username,
        isAdmin: admins.isAdmin,
        canUpload: admins.canUpload,
        canManageSettings: admins.canManageSettings,
        canManageAcademics: admins.canManageAcademics,
        canManageInternalMarks: admins.canManageInternalMarks,
        canViewDashboard: admins.canViewDashboard,
        canViewStudents: admins.canViewStudents,
        canViewReports: admins.canViewReports,
        canFreezeMarks: admins.canFreezeMarks,
        loginType: admins.loginType,
        allowedIps: admins.allowedIps
      });
    return updatedAdmin;
  }

  async deleteAdmin(id: number): Promise<boolean> {
    const [deleted] = await db.delete(admins).where(eq(admins.id, id)).returning();
    return !!deleted;
  }

  async getStudentByRoll(rollNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.rollNumber, rollNumber));
    return student;
  }

  async updateStudent(id: number, data: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db.update(students)
      .set(data)
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudentCascading(id: number): Promise<void> {
    // Delete all dependent records first
    await db.delete(results).where(eq(results.studentId, id));
    await db.delete(studentAcademicStatus).where(eq(studentAcademicStatus.studentId, id));
    await db.delete(studentPhotos).where(eq(studentPhotos.studentId, id));

    // Finally delete the student
    await db.delete(students).where(eq(students.id, id));
  }

  async mergeStudentProfiles(sourceId: number, targetId: number): Promise<void> {
    // Move all dependent records from sourceId to targetId
    await db.update(results).set({ studentId: targetId }).where(eq(results.studentId, sourceId));

    try { await db.delete(studentPhotos).where(eq(studentPhotos.studentId, targetId)); } catch (e) { }
    await db.update(studentPhotos).set({ studentId: targetId }).where(eq(studentPhotos.studentId, sourceId));

    await db.update(studentAcademicStatus).set({ studentId: targetId }).where(eq(studentAcademicStatus.studentId, sourceId));

    // Finally delete the source student
    await db.delete(students).where(eq(students.id, sourceId));
  }

  async searchStudents(
    query?: string,
    page: number = 1,
    limit: number = 50,
    filters?: { branch?: string; program?: string; batch?: string; section?: string }
  ): Promise<{ data: Student[], total: number, page: number, totalPages: number }> {
    const offset = (page - 1) * limit;

    const baseQuery = db.select().from(students);
    const countQuery = db.select({ count: sql<number>`cast(count(${students.id}) as int)` }).from(students);

    const orConditions: any[] = [];
    if (query) {
      orConditions.push(sql`${students.rollNumber} ILIKE ${'%' + query + '%'}`);
      orConditions.push(sql`${students.name} ILIKE ${'%' + query + '%'}`);
    }

    const andConditions: any[] = [];
    if (filters?.branch) andConditions.push(eq(students.branch, filters.branch));
    if (filters?.program) andConditions.push(eq(students.program, filters.program));
    if (filters?.batch) andConditions.push(inArray(students.batch, expandBatch(filters.batch)));
    if (filters?.section) andConditions.push(eq(students.section, filters.section));

    if (orConditions.length > 0) {
      andConditions.push(or(...orConditions));
    }

    if (andConditions.length > 0) {
      baseQuery.where(and(...andConditions));
      countQuery.where(and(...andConditions));
    }

    // Enforce ascending order as requested
    const data = await baseQuery.orderBy(asc(students.rollNumber)).limit(limit).offset(offset);
    const [{ count }] = await countQuery;

    const authIds = data.map(s => s.id);
    let dataWithStatus = data as any[];

    if (authIds.length > 0) {
      const statusRows = await db.select().from(studentAcademicStatus)
        .where(inArray(studentAcademicStatus.studentId, authIds))
        .orderBy(desc(studentAcademicStatus.updatedAt));

      const latestStatusMap = new Map<number, string>();
      for (const row of statusRows) {
        if (!latestStatusMap.has(row.studentId)) latestStatusMap.set(row.studentId, row.status);
      }

      dataWithStatus = data.map(s => ({
        ...s,
        status: latestStatusMap.get(s.id) || "Active"
      }));
    }

    return {
      data: dataWithStatus,
      total: count,
      page,
      totalPages: Math.ceil(count / limit) || 1
    };
  }

  async getDistinctBatches(): Promise<string[]> {
    const records = await db.selectDistinct({ batch: students.batch }).from(students).orderBy(desc(students.batch));

    // We want to return ONLY primary 4-year batches (e.g. 2023-2027) 
    // and exclude lateral groups (like 2024-2027 or 2023-2026) or malformed strings
    const validBatches = new Set<string>();

    records.forEach(r => {
      if (!r.batch) return;
      const match = r.batch.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const startYear = parseInt(match[1]);
        const endYear = parseInt(match[2]);

        // If it's a 3-year gap (lateral), map it to the enclosing 4-year cohort 
        // Example: 2024-2027 (Lateral) => translates to the 2023-2027 logical batch
        if (endYear - startYear === 3) {
          validBatches.add(`${startYear - 1}-${endYear}`);
        } else if (endYear - startYear === 4) {
          validBatches.add(r.batch);
        } else if (endYear - startYear === 2) {
          // Allow 2-year batches for MCA programs (e.g. 2022-2024)
          validBatches.add(r.batch);
        }
      }
    });

    // Make sure they are sorted descending by start year
    return Array.from(validBatches).sort((a, b) => b.localeCompare(a));
  }

  async getDistinctBranches(): Promise<string[]> {
    const records = await db.selectDistinct({ branch: students.branch }).from(students).orderBy(asc(students.branch));
    return records.map(r => r.branch).filter(Boolean);
  }

  async getDistinctAcademicYears(): Promise<string[]> {
    const records = await db.selectDistinct({ academicYear: results.academicYear }).from(results).orderBy(desc(results.academicYear));
    return records.map(r => r.academicYear).filter(Boolean);
  }

  async getDistinctPrograms(): Promise<string[]> {
    const records = await db.selectDistinct({ program: students.program }).from(students).orderBy(students.program);
    return Array.from(new Set(records.map(r => r.program).filter(Boolean))) as string[];
  }

  async getDistinctSections(batch?: string, branch?: string): Promise<string[]> {
    const conditions: any[] = [];
    if (branch) conditions.push(eq(students.branch, branch));
    if (batch) conditions.push(inArray(students.batch, expandBatch(batch)));
    const query = db.selectDistinct({ section: students.section }).from(students);
    if (conditions.length > 0) query.where(and(...conditions));
    const records = await query.orderBy(students.section);
    return Array.from(new Set(records.map(r => r.section).filter(Boolean))) as string[];
  }

  async getBatchTranscripts(branch: string, batch: string): Promise<any[]> {
    const batchStudents = await db.select().from(students)
      .where(and(eq(students.branch, branch), inArray(students.batch, expandBatch(batch))))
      .orderBy(asc(students.rollNumber));

    if (batchStudents.length === 0) return [];

    const hydrated = await Promise.all(batchStudents.map(s => this.getStudent(s.id)));

    // Fetch photos for all these students in one go
    const studentIds = batchStudents.map(s => s.id);
    const photos = await db.select().from(studentPhotos).where(inArray(studentPhotos.studentId, studentIds));
    const photoMap = new Map(photos.map(p => [p.studentId, p.photoData]));

    return hydrated
      .filter((s): s is StudentDetails => s !== undefined)
      .map(s => ({ ...s, photoUrl: photoMap.get(s.id) || null }));
  }

  async getStudent(id: number): Promise<StudentDetails | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    if (!student) return undefined;

    const allResults = await db.select().from(results).where(eq(results.studentId, id));
    const allSubjects = await db.select().from(subjects).where(
      inArray(subjects.id, allResults.map(r => r.subjectId).concat([-1]))
    );

    const statusRecords = await db.select().from(studentAcademicStatus)
      .where(eq(studentAcademicStatus.studentId, id))
      .orderBy(desc(studentAcademicStatus.updatedAt))
      .limit(1);
    const latestStatus = statusRecords.length > 0 ? statusRecords[0].status : "Active";
    const statusSemester = (statusRecords.length > 0 && statusRecords[0].academicYear && statusRecords[0].semester)
      ? `${statusRecords[0].academicYear} (${statusRecords[0].semester})`
      : undefined;

    const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

    let sgpaPerSemester: Record<string, { totalPoints: number, totalCredits: number }> = {};
    let totalCredits = 0;
    let totalCreditPoints = 0; // Î£(Ci Ã— Gi) across all semesters (for CGPA)
    let totalRegisteredCredits = 0; // Î£(Ci) across all semesters (for CGPA denominator)
    let backlogCount = 0;

    const resultsWithSubjects = allResults.map(r => {
      const subj = subjectMap.get(r.subjectId)!;

      if (r.isLatest) {
        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        // Count backlogs
        if (r.status === 'BACKLOG') {
          backlogCount++;
        } else {
          // Only passed subjects contribute to earned credits
          totalCredits += actualCredits;
        }

        // JNTU SGPA formula: SGPA = Î£(Ci Ã— Gi) / Î£(Ci) for ALL registered courses
        // Failed subjects: Gi = 0, but Ci still counts in denominator
        // Skip non-credit subjects (credits = 0) from GPA calculation entirely
        if (actualCredits > 0) {
          const subjectCredits = actualCredits;
          const gradePoints = r.status === 'BACKLOG' ? 0 : (r.gradePoints || 0);

          if (!sgpaPerSemester[r.semester]) {
            sgpaPerSemester[r.semester] = { totalPoints: 0, totalCredits: 0 };
          }
          // Numerator: Ci Ã— Gi
          sgpaPerSemester[r.semester].totalPoints += gradePoints * subjectCredits;
          // Denominator: Ci (all registered subjects)
          sgpaPerSemester[r.semester].totalCredits += subjectCredits;

          // Accumulate for CGPA
          totalCreditPoints += gradePoints * subjectCredits;
          totalRegisteredCredits += subjectCredits;
        }
      }
      return { ...r, subject: subj };
    });

    const finalSgpa: Record<string, number> = {};
    for (const [sem, data] of Object.entries(sgpaPerSemester)) {
      finalSgpa[sem] = data.totalCredits > 0 ? Number((data.totalPoints / data.totalCredits).toFixed(2)) : 0;
    }

    // CGPA = Î£(Ci Ã— Gi) over all semesters / Î£(Ci) over all semesters
    const cgpa = totalRegisteredCredits > 0 ? Number((totalCreditPoints / totalRegisteredCredits).toFixed(2)) : 0;

    return {
      ...student,
      results: resultsWithSubjects,
      sgpaPerSemester: finalSgpa,
      cgpa,
      totalCredits,
      backlogCount,
      status: latestStatus,
      statusSemester
    };
  }

  async upsertStudentPhoto(rollNumber: string, base64Data: string): Promise<boolean> {
    const student = await this.getStudentByRoll(rollNumber);
    if (!student) return false;

    await db.insert(studentPhotos).values({
      studentId: student.id,
      photoData: base64Data
    }).onConflictDoUpdate({
      target: studentPhotos.studentId,
      set: { photoData: base64Data }
    });

    return true;
  }

  async getStudentPhoto(studentId: number): Promise<string | null> {
    const [record] = await db.select().from(studentPhotos).where(eq(studentPhotos.studentId, studentId));
    return record?.photoData || null;
  }

  async processResultsUpload(resultsData: any[], metadata: { examType: string, academicYear: string, semester: string, branch: string, batch: string, regulation: string, program: string }): Promise<{ processed: number, skipped: number, errors: string[] }> {
    let processed = 0;
    let skipped = 0;
    let errors: string[] = [];

    // 0. Filter by active Batch using Roll Number prefix.
    // Regular students:  e.g. batch "2021-2025" â†’ prefix "21" (roll: 21JK1A0502)
    // Lateral entry:     e.g. batch "2021-2025" â†’ prefix "22" (roll: 22JK5A0501)
    //                    Lateral students join 1 year after batch start â†’ roll year = startYear + 1.
    //                    They are identified by '5' as the digit after the 2-letter institution code (22JK5...).
    let regularPrefix = "";
    let lateralPrefix = "";
    if (metadata.batch && metadata.batch.length >= 4) {
      const startYear = parseInt(metadata.batch.substring(0, 4), 10); // e.g. 2021
      regularPrefix = metadata.batch.substring(2, 4);                  // e.g. "21"
      if (!isNaN(startYear)) {
        lateralPrefix = String(startYear + 1).substring(2);            // e.g. "22"
      }
    }

    const isMatchingBatch = (rollStr: string): boolean => {
      if (!regularPrefix) return true; // no filter applied
      if (rollStr.startsWith(regularPrefix)) return true;
      // Lateral entry: prefix matches lateral year AND has '5' after the 2-letter institution code
      // e.g. 22JK5A0501 â†’ /^22[A-Z]{2}5/
      if (lateralPrefix && rollStr.startsWith(lateralPrefix) && new RegExp(`^${lateralPrefix}[A-Z]{2}5`, 'i').test(rollStr)) return true;
      return false;
    };

    const validResultsData = resultsData.filter(r => {
      const rollStr = (r.RollNumber || "").toString().trim();
      return isMatchingBatch(rollStr);
    });

    skipped = resultsData.length - validResultsData.length;

    if (validResultsData.length === 0) {
      return { processed: 0, skipped, errors: ["No records matched the selected batch prefix."] };
    }

    // 1. Get unique rolls and subjects
    const uniqueRolls = Array.from(new Set(validResultsData.map(r => r.RollNumber).filter(Boolean)));
    const uniqueSubjects = Array.from(new Set(validResultsData.map(r => r.SubjectCode).filter(Boolean)));

    if (uniqueRolls.length === 0 || uniqueSubjects.length === 0) {
      return { processed: 0, skipped, errors: ["No valid records found in data."] };
    }

    // 2. Fetch existing students
    const existingStudents = await db.select().from(students).where(inArray(students.rollNumber, uniqueRolls));
    const studentMap = new Map(existingStudents.map(s => [s.rollNumber, s]));

    // 3. Insert missing students
    const missingStudentsData = [];
    for (const r of uniqueRolls) {
      if (!studentMap.has(r)) {
        const row = resultsData.find(x => x.RollNumber === r);
        missingStudentsData.push({
          rollNumber: r,
          name: row?.StudentName || 'Unknown',
          branch: metadata.branch,
          batch: metadata.batch,
          regulation: row?.Regulation && row?.Regulation !== "Unknown" ? row.Regulation : metadata.regulation,
          program: metadata.program,
          section: 'A'
        });
      }
    }
    if (missingStudentsData.length > 0) {
      const chunks = [];
      for (let i = 0; i < missingStudentsData.length; i += 1000) {
        chunks.push(missingStudentsData.slice(i, i + 1000));
      }
      for (const chunk of chunks) {
        await db.insert(students).values(chunk).onConflictDoNothing({ target: students.rollNumber });
      }
      const allStudents = await db.select().from(students).where(inArray(students.rollNumber, uniqueRolls));
      for (const s of allStudents) {
        studentMap.set(s.rollNumber, s);
      }
    }

    // 3.5 Auto-heal existing student regulations if incorrect
    const studentsToUpdateReg = new Map();
    for (const r of resultsData) {
      const s = studentMap.get(r.RollNumber);
      if (s && r.Regulation && r.Regulation !== "Unknown" && s.regulation !== r.Regulation) {
        studentsToUpdateReg.set(s.id, r.Regulation);
        s.regulation = r.Regulation; // update map reference
      }
    }
    for (const [id, reg] of Array.from(studentsToUpdateReg.entries())) {
      await db.update(students).set({ regulation: reg }).where(eq(students.id, id));
    }

    // 4. Fetch existing subjects
    const existingSubjects = await db.select().from(subjects).where(inArray(subjects.subjectCode, uniqueSubjects));
    const subjectMap = new Map(existingSubjects.map(s => [s.subjectCode, s]));

    // 5. Insert missing subjects
    const missingSubjectsData = [];
    for (const c of uniqueSubjects) {
      if (!subjectMap.has(c)) {
        const row = validResultsData.find(x => x.SubjectCode === c);
        missingSubjectsData.push({
          subjectCode: c,
          subjectName: row?.SubjectName || 'Unknown Subject',
          credits: parseFloat(row?.Credits) || 0,
          semester: metadata.semester,
          branch: metadata.branch
        });
      }
    }
    if (missingSubjectsData.length > 0) {
      const chunks = [];
      for (let i = 0; i < missingSubjectsData.length; i += 1000) {
        chunks.push(missingSubjectsData.slice(i, i + 1000));
      }
      for (const chunk of chunks) {
        await db.insert(subjects).values(chunk).onConflictDoNothing({ target: subjects.subjectCode });
      }
      const allSubj = await db.select().from(subjects).where(inArray(subjects.subjectCode, uniqueSubjects));
      for (const s of allSubj) {
        subjectMap.set(s.subjectCode, s);
      }
    }

    // 5.5 Auto-heal truncated subject names and missing credits
    const subjectsToUpdateName = new Map();
    const subjectsToUpdateCredits = new Map();
    for (const r of validResultsData) {
      const s = subjectMap.get(r.SubjectCode);
      if (s) {
        if (r.SubjectName && r.SubjectName !== "Unknown Subject" && s.subjectName !== r.SubjectName) {
          // Sanitise: strip revaluation artefacts (e.g. "--- No", "No Change No") from the incoming name
          const cleanedName = r.SubjectName.replace(/\s*(?:-{2,3}\s*No|No\s*Change(?:\s*No)?)\s*$/i, "").trim();
          // Reject any name that still contains '---' â€” it's corrupted parser output
          if (!cleanedName.includes("---") && cleanedName && cleanedName.length > s.subjectName.length) {
            subjectsToUpdateName.set(s.id, cleanedName);
            s.subjectName = cleanedName; // update map reference
          }
        }

        // Auto-heal missing or lower credits
        const incomingCredits = parseFloat(r.Credits);
        if (!isNaN(incomingCredits) && incomingCredits > (s.credits || 0)) {
          subjectsToUpdateCredits.set(s.id, incomingCredits);
          s.credits = incomingCredits; // update map reference
        }
      }
    }
    for (const [id, name] of Array.from(subjectsToUpdateName.entries())) {
      await db.update(subjects).set({ subjectName: name }).where(eq(subjects.id, id));
    }
    for (const [id, credits] of Array.from(subjectsToUpdateCredits.entries())) {
      await db.update(subjects).set({ credits }).where(eq(subjects.id, id));
    }

    // 6. Pre-fetch all previous attempts for these students
    const studentIds = Array.from(studentMap.values()).map(s => s.id);
    let allExistingResults: typeof results.$inferSelect[] = [];
    if (studentIds.length > 0) {
      const chunks = [];
      for (let i = 0; i < studentIds.length; i += 500) {
        chunks.push(studentIds.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const resultsPerChunk = await db.select().from(results).where(inArray(results.studentId, chunk));
        allExistingResults.push(...resultsPerChunk);
      }
    }

    const previousAttemptsMap = new Map<string, typeof results.$inferSelect[]>();
    for (const r of allExistingResults) {
      const key = `${r.studentId}-${r.subjectId}`;
      if (!previousAttemptsMap.has(key)) previousAttemptsMap.set(key, []);
      previousAttemptsMap.get(key)!.push(r);
    }

    const resultsToInsert = [];
    const resultUpdatesForRevaluation = [];
    const resultUpdatesForAttempts = [];
    const resultIdsToUpdateLatest: number[] = [];

    // Track unique records inside this specific upload to prevent PDF-internal duplicate crashes
    // Key format: studentId-subjectId-examType-academicYear
    const seenUploadKeys = new Set<string>();

    // 7. Prepare results data sequentially in memory
    for (const row of validResultsData) {
      try {
        if (!row || !row.RollNumber || !row.SubjectCode) continue;

        const student = studentMap.get(row.RollNumber);
        const subject = subjectMap.get(row.SubjectCode);
        if (!student || !subject) continue;

        const key = `${student.id}-${subject.id}`;
        const previousAttempts = previousAttemptsMap.get(key) || [];
        previousAttempts.sort((a, b) => b.attemptNo - a.attemptNo);

        let grade = row.Grade?.toString().toUpperCase().trim() || 'UNKNOWN';
        const credits = parseFloat(row.Credits) || 0;
        let isBacklog = false;

        // Explicit fail grades
        if (['F', 'ABSENT', 'AB', 'FAIL', 'UNKNOWN'].includes(grade)) {
          isBacklog = true;
        } else if (grade.startsWith('CHANGE')) {
          // JNTU Revaluation - mark was changed. If credits earned > 0, they passed.
          isBacklog = credits === 0;
          if (isBacklog) {
            grade = 'F (REV)'; // Normalize misleading CHANGE back to F for UI and mark as reval
          } else {
            grade = 'CHANGE (REV)'; // Normalize variants like CHANGEREV and mark as reval
          }
        } else if (grade === 'COMPLE') {
          // Non-credit subject completed â€” always a pass
          isBacklog = false;
        }
        // All other valid grades (O, A+, A, B+, B, C, D, E, S) = PASS

        // â”€â”€ REGULAR_REVALUATION / SUPPLY_REVALUATION update existing attempts in-place â”€â”€
        if (metadata.examType === 'REGULAR_REVALUATION' || metadata.examType === 'SUPPLY_REVALUATION') {
          // Find the most recent applicable attempt to update
          // For REGULAR_REVALUATION: Update the REGULAR attempt
          // For SUPPLY_REVALUATION: Update the latest SUPPLY attempt
          const targetType = metadata.examType === 'REGULAR_REVALUATION' ? 'REGULAR' : 'SUPPLY';

          const targetAttempt = previousAttempts
            .filter(a => a.examType === targetType)
            .sort((a, b) => b.attemptNo - a.attemptNo)[0];

          if (targetAttempt && targetAttempt.id) {
            const baseTargetGrade = targetAttempt.grade.replace(' (REV)', '').trim();
            const rawGrade = row.Grade?.toString().toUpperCase().trim() || '';

            // â”€â”€ "No Change" revaluation correction â”€â”€
            // JNTU uses "CHANGE" grade with 0 credits for BOTH:
            //   (a) a failed revaluation where the student still fails â†’ F (REV)
            //   (b) a "no change" revaluation where the student already passed â†’ original grade (REV)
            // The heuristic `credits === 0 â†’ isBacklog = true` only works for case (a).
            // For case (b), the student's existing attempt is already PASS â€” we must restore that.
            if (rawGrade.startsWith('CHANGE') && credits === 0 && targetAttempt.status === 'PASS') {
              // "No change" on a passing student: keep original grade, keep PASS
              grade = baseTargetGrade;
              isBacklog = false;
            }

            // 1. Deduplicate identical revaluations in the same PDF
            const uploadUniqueKey = `REVAL-${student.id}-${subject.id}-${metadata.examType}-${metadata.academicYear}`;
            if (seenUploadKeys.has(uploadUniqueKey)) {
              continue;
            }
            seenUploadKeys.add(uploadUniqueKey);

            // Update if the grade actually changed, OR if the raw grade implies revaluation, OR if it simply lacks the (REV) tag
            if (baseTargetGrade !== grade || rawGrade.startsWith('CHANGE') || !targetAttempt.grade.includes('(REV)')) {
              const finalGrade = grade.includes('(REV)') ? grade : `${grade} (REV)`;

              // Safely handle academicYear - if the student already has another attempt of the same type exactly on the reval date, don't overwrite
              let newYear = metadata.academicYear;
              const yearCollision = previousAttempts.some(a => a.id !== targetAttempt.id && a.examType === targetType && a.academicYear === newYear);
              if (yearCollision) {
                newYear = targetAttempt.academicYear; // Retain original to prevent unique_result_idx crash
              }

              resultUpdatesForRevaluation.push({
                id: targetAttempt.id,
                grade: finalGrade,
                gradePoints: Math.max(parseInt(row.GradePoints) || 0, targetAttempt.gradePoints || 0), // Revals don't decrease points
                creditsEarned: isBacklog ? 0 : (credits > 0 ? credits : targetAttempt.creditsEarned ?? 0),
                // NEVER overwrite internal marks from revaluation â€” always preserve the original
                internalMarks: targetAttempt.internalMarks,
                status: isBacklog ? 'BACKLOG' : 'PASS',
                academicYear: newYear,
              });
              // Update the in-memory reference as well
              targetAttempt.grade = finalGrade;
              targetAttempt.status = isBacklog ? 'BACKLOG' : 'PASS';
              targetAttempt.academicYear = newYear;
              // internalMarks preserved â€” revaluation never changes internal marks
              processed++;
            }
          }
          // Revaluation never creates a new result row â€” skip to next row
          continue;
        }

        // â”€â”€ REGULAR / SUPPLY: normal attempt insertion logic â”€â”€

        // 1. Prevent duplicate attempts if same file is uploaded twice (DB check)
        const existingSameAttempt = previousAttempts.find(a =>
          a.examType === metadata.examType &&
          a.academicYear === metadata.academicYear &&
          a.semester === metadata.semester
        );

        if (existingSameAttempt) {
          continue; // Skip inserting duplicate
        }

        // 2. Prevent duplicate attempts if the current PDF file contains literal duplicates of the same row (In-memory check)
        const uploadUniqueKey = `${student.id}-${subject.id}-${metadata.examType}-${metadata.academicYear}`;
        if (seenUploadKeys.has(uploadUniqueKey)) {
          continue; // Skip inserting intra-file duplicate
        }
        seenUploadKeys.add(uploadUniqueKey);

        // Compute Attempt Number dynamically by placing the new attempt chronologically
        let attemptNo = 1;
        const allAttemptsChronological = [...previousAttempts, { academicYear: metadata.academicYear }]
          .sort((a, b) => {
            // Helper logic to parse dates like "January 2024"
            const dateA = new Date((a as any).academicYear);
            const dateB = new Date((b as any).academicYear);
            const timeA = isNaN(dateA.getTime()) ? new Date("2000-01-01").getTime() : dateA.getTime();
            const timeB = isNaN(dateB.getTime()) ? new Date("2000-01-01").getTime() : dateB.getTime();
            return timeA - timeB;
          });

        // Find the index of our newly inserted timeline marker to determine its Attempt Number
        attemptNo = allAttemptsChronological.findIndex(a => a.academicYear === metadata.academicYear) + 1;

        // Note: Because we are inserting a new attempt chronologically, previously inserted
        // attempts that occurred *after* this new date now have their attemptNo invalidated.
        // We push them into an array to batch-update them later.
        const subsequentAttempts = allAttemptsChronological.slice(attemptNo);
        for (let i = 0; i < subsequentAttempts.length; i++) {
          const olderAttempt = subsequentAttempts[i] as any;
          if (olderAttempt.id) { // It's an existing DB record, not our placeholder
            // The new attemptNo is its index in the chronological array + 1
            resultUpdatesForAttempts.push({ id: olderAttempt.id, attemptNo: attemptNo + i + 1 });
          }
        }

        // Determine if they already passed this subject in a prior attempt
        let alreadyPassed = false;
        for (const old of previousAttempts) {
          if (old.status === 'PASS') {
            alreadyPassed = true;
          }
        }

        let isLatestForNew = true;

        // If they already passed, a new failing attempt shouldn't revoke their PASS status.
        if (alreadyPassed && isBacklog) {
          isLatestForNew = false;
        }

        if (isLatestForNew && previousAttempts.length > 0) {
          const latestOld = previousAttempts.filter(x => x.isLatest);
          for (const old of latestOld) {
            old.isLatest = false;
            resultIdsToUpdateLatest.push(old.id);
          }
        }

        const newResult = {
          studentId: student.id,
          subjectId: subject.id,
          semester: metadata.semester,
          academicYear: metadata.academicYear,
          examType: metadata.examType,
          attemptNo,
          grade: grade,
          gradePoints: parseInt(row.GradePoints) || 0,
          creditsEarned: isBacklog ? 0 : (parseFloat(row.Credits) || 0),
          internalMarks: row.InternalMarks !== undefined ? row.InternalMarks : null,
          status: isBacklog ? 'BACKLOG' : 'PASS',
          isLatest: isLatestForNew
        };

        resultsToInsert.push(newResult);
        previousAttempts.push(newResult as any);
        previousAttemptsMap.set(key, previousAttempts);

        processed++;
      } catch (err: any) {
        errors.push(`Error building record for ${row.RollNumber}: ${err.message}`);
      }
    }

    // 8. Execute Batch Updates (isLatest flags)
    if (resultIdsToUpdateLatest.length > 0) {
      const chunks = [];
      for (let i = 0; i < resultIdsToUpdateLatest.length; i += 1000) {
        chunks.push(resultIdsToUpdateLatest.slice(i, i + 1000));
      }
      for (const chunk of chunks) {
        await db.update(results).set({ isLatest: false }).where(inArray(results.id, chunk));
      }
    }

    // 8.1 Shift subsequent attempt numbers when past data is uploaded out-of-order
    for (const upt of resultUpdatesForAttempts) {
      await db.update(results).set({ attemptNo: upt.attemptNo }).where(eq(results.id, upt.id));
    }

    // 8b. Revaluation grade in-place updates (small set â€” typically a few hundred max)
    for (const rev of resultUpdatesForRevaluation) {
      await db.update(results).set({
        grade: rev.grade,
        gradePoints: rev.gradePoints,
        creditsEarned: rev.creditsEarned,
        internalMarks: rev.internalMarks,
        status: rev.status,
        ...(rev.academicYear ? { academicYear: rev.academicYear } : {})
      }).where(eq(results.id, rev.id));
    }

    // 9. Execute Batch Inserts
    if (resultsToInsert.length > 0) {
      const chunks = [];
      for (let i = 0; i < resultsToInsert.length; i += 1000) {
        chunks.push(resultsToInsert.slice(i, i + 1000));
      }
      for (const chunk of chunks) {
        // use onConflictDoNothing to be extra safe against race conditions between read and write
        await db.insert(results).values(chunk).onConflictDoNothing();
      }
    }

    return { processed, skipped, errors };
  }

  async processStudentsUpload(studentsData: any[]): Promise<{ processed: number, errors: string[] }> {
    let processed = 0;
    let errors: string[] = [];

    const uniqueStudentsMap = new Map<string, any>();

    for (const row of studentsData) {
      const rawRollNum = row.RollNumber || row.Roll_Number || row.roll_number || row.rollNumber || row["Roll Number"] || row["Roll number"] || row["ROLL NUMBER"];
      if (!rawRollNum) continue;

      const rollNumber = rawRollNum.toString().trim().toUpperCase();
      const name = (row.Name || row.StudentName || row.name || row["Student Name"] || row["student name"] || "Unknown").toString().trim();
      let branch = (row.Branch || row.branch || "Unknown").toString().trim().toUpperCase();
      const batch = (row.Batch || row.batch || "Unknown").toString().trim();
      const regulation = (row.Regulation || row.Reg || row.regulation || "Unknown").toString().trim().toUpperCase();
      const program = (row.Program || row.program || (branch.toUpperCase().includes("MCA") ? "MCA" : "B.Tech")).toString().trim();
      const section = (row.Section || row.section || "A").toString().trim();

      // Normalize branches according to user request
      if (branch.includes("AIML") || branch.includes("AI&ML") || branch.includes("AI & ML") || branch === "CSE(AIML)") {
        branch = "CSE (AI&ML)";
      } else if (branch.includes("DS") || branch.includes("DATA SCIENCE") || branch === "CSE(DS)") {
        branch = "CSE (DS)";
      }

      if (!rollNumber) {
        errors.push("Skipped row with missing Roll Number.");
        continue;
      }

      uniqueStudentsMap.set(rollNumber, {
        rollNumber,
        name,
        branch,
        batch,
        regulation,
        program,
        section
      });
    }

    const studentsToUpsert = Array.from(uniqueStudentsMap.values());
    processed = studentsToUpsert.length;

    if (studentsToUpsert.length > 0) {
      const chunks = [];
      for (let i = 0; i < studentsToUpsert.length; i += 1000) {
        chunks.push(studentsToUpsert.slice(i, i + 1000));
      }

      // Execute all chunk inserts sequentially to protect DB pool
      for (const chunk of chunks) {
        await db.insert(students)
          .values(chunk)
          .onConflictDoUpdate({
            target: students.rollNumber,
            set: {
              name: sql`EXCLUDED.name`,
              branch: sql`EXCLUDED.branch`,
              batch: sql`EXCLUDED.batch`,
              regulation: sql`EXCLUDED.regulation`,
              program: sql`EXCLUDED.program`,
              section: sql`EXCLUDED.section`
            }
          });
      }
    }

    return { processed, errors };
  }

  async getBacklogs(filters: any = {}): Promise<any[]> {
    let conditions = [eq(results.isLatest, true), eq(results.status, 'BACKLOG')];
    if (filters.semester) conditions.push(eq(results.semester, filters.semester));
    // Note: batch filter is applied on students (see below), not on results

    // First, get all backlog rows matching result filters
    const backlogRows = await db.select({
      studentId: results.studentId,
      subjectId: results.subjectId,
      semester: results.semester,
      examType: results.examType
    }).from(results).where(and(...conditions));

    if (backlogRows.length === 0) return [];

    // Filter students by branch and/or batch
    let studentConditions: any[] = [inArray(students.id, Array.from(new Set(backlogRows.map(r => r.studentId))))];

    // Normalize branch name for strict lookup
    if (filters.branch) {
      let searchBranch = filters.branch;
      if (searchBranch === "CSE(AIML)" || searchBranch === "AIML" || searchBranch.includes("AI&ML")) {
        searchBranch = "CSE (AI&ML)";
      } else if (searchBranch === "CSE(DS)" || searchBranch === "DS" || searchBranch.includes("DATA SCIENCE")) {
        searchBranch = "CSE (DS)";
      }
      studentConditions.push(eq(students.branch, searchBranch));
    }
    if (filters.batch) {
      // Logic for lateral entries 
      // e.g. "2023-2027" regular -> yy=23. Associated Lateral batch is "2024-2027" -> lateralPrefix "24JK5%"
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = parseInt(startYearMatch[1]);
        const regularPrefix = `${yy}JK%`;
        const currentLateralPrefix = `${yy + 1}JK5%`;
        const previousLateralPrefix = `${yy}JK5%`;

        studentConditions.push(or(
          and(
            ilike(students.rollNumber, regularPrefix),
            not(ilike(students.rollNumber, previousLateralPrefix))
          ),
          ilike(students.rollNumber, currentLateralPrefix)
        ));
      } else {
        studentConditions.push(inArray(students.batch, expandBatch(filters.batch)));
      }
    }
    if (filters.program) studentConditions.push(eq(students.program, filters.program));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));

    const studentRows = await db.select().from(students).where(and(...studentConditions));

    const subjectRows = await db.select().from(subjects).where(inArray(subjects.id, Array.from(new Set(backlogRows.map(r => r.subjectId)))));
    const subjectMap = new Map(subjectRows.map(s => [s.id, s]));

    const statusRows = await db.select().from(studentAcademicStatus)
      .where(inArray(studentAcademicStatus.studentId, studentRows.map(s => s.id)))
      .orderBy(desc(studentAcademicStatus.updatedAt));
    const latestStatusMap = new Map<number, { status: string, statusSemester?: string }>();
    for (const row of statusRows) {
      if (!latestStatusMap.has(row.studentId)) {
        const statusSemester = (row.academicYear && row.semester) ? `${row.academicYear} ${row.semester}` : undefined;
        latestStatusMap.set(row.studentId, { status: row.status, statusSemester });
      }
    }

    // Aggregate by student
    const resultList: any[] = [];
    for (const s of studentRows) {
      const studentBacklogs = backlogRows.filter(r => r.studentId === s.id);
      const statusInfo = latestStatusMap.get(s.id);
      resultList.push({
        student: { ...s, status: statusInfo?.status || "Active", statusSemester: statusInfo?.statusSemester },
        backlogCount: studentBacklogs.length,
        subjects: studentBacklogs.map(b => subjectMap.get(b.subjectId))
      });
    }

    return resultList.sort((a, b) => b.backlogCount - a.backlogCount);
  }

  async getCumulativeBacklogs(filters: any = {}): Promise<any[]> {
    // This method fetches detailed performance for all students matching filters
    let studentConditions: any[] = [];

    // Normalize branch name for strict lookup
    if (filters.branch) {
      let searchBranch = filters.branch;
      if (searchBranch === "CSE(AIML)" || searchBranch === "AIML" || searchBranch.includes("AI&ML")) {
        searchBranch = "CSE (AI&ML)";
      } else if (searchBranch === "CSE(DS)" || searchBranch === "DS" || searchBranch.includes("DATA SCIENCE")) {
        searchBranch = "CSE (DS)";
      }
      studentConditions.push(eq(students.branch, searchBranch));
    }
    if (filters.batch) {
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = parseInt(startYearMatch[1]);
        const regularPrefix = `${yy}JK%`;
        const currentLateralPrefix = `${yy + 1}JK5%`;
        const previousLateralPrefix = `${yy}JK5%`;

        studentConditions.push(or(
          and(
            ilike(students.rollNumber, regularPrefix),
            not(ilike(students.rollNumber, previousLateralPrefix))
          ),
          ilike(students.rollNumber, currentLateralPrefix)
        ));
      } else {
        studentConditions.push(inArray(students.batch, expandBatch(filters.batch)));
      }
    }
    if (filters.program) studentConditions.push(eq(students.program, filters.program));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));

    const queryResult = await db.select({
      student: students,
      result: results,
      subject: subjects
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return [];

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
    }

    const studentRows = Array.from(studentMap.values());

    const statusRows = await db.select().from(studentAcademicStatus)
      .where(inArray(studentAcademicStatus.studentId, studentRows.map(s => s.id)))
      .orderBy(desc(studentAcademicStatus.updatedAt));
    const latestStatusMap = new Map<number, { status: string, statusSemester?: string }>();
    for (const row of statusRows) {
      if (!latestStatusMap.has(row.studentId)) {
        const statusSemester = (row.academicYear && row.semester) ? `${row.academicYear} ${row.semester}` : undefined;
        latestStatusMap.set(row.studentId, { status: row.status, statusSemester });
      }
    }

    const cumulativeData = [];

    for (const student of studentRows) {
      const studentResults = resultsByStudent.get(student.id) || [];

      const semesters = (student.program === "MCA" || student.branch === "MCA")
        ? ["I", "II", "III", "IV"]
        : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
      const semesterData: Record<string, { backlogs: string[], backlogCount: number, sgpa: number, credits: number, registeredCredits: number, totalPoints: number }> = {};

      semesters.forEach(sem => {
        semesterData[sem] = { backlogs: [], backlogCount: 0, sgpa: 0, credits: 0, registeredCredits: 0, totalPoints: 0 };
      });

      let totalCredits = 0;
      let totalPointsForCgpa = 0;
      let totalRegisteredCredits = 0;
      let totalBacklogs = 0;

      for (const r of studentResults) {
        const subj = r.subject;
        if (!subj) continue;

        const sem = r.semester;
        if (!semesterData[sem]) {
          semesterData[sem] = { backlogs: [], backlogCount: 0, sgpa: 0, credits: 0, registeredCredits: 0, totalPoints: 0 };
        }

        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        if (r.status === 'BACKLOG') {
          semesterData[sem].backlogs.push(subj.subjectName);
          semesterData[sem].backlogCount++;
          totalBacklogs++;

          if (actualCredits > 0) {
            semesterData[sem].registeredCredits += actualCredits;
            totalRegisteredCredits += actualCredits;
          }
        } else {
          totalCredits += actualCredits;
          if (actualCredits > 0) {
            semesterData[sem].credits += actualCredits;
            semesterData[sem].registeredCredits += actualCredits;
            semesterData[sem].totalPoints += r.gradePoints * actualCredits;
            totalRegisteredCredits += actualCredits;
            totalPointsForCgpa += r.gradePoints * actualCredits;
          }
        }
      }

      // Calculate SGPAs
      for (const sem of Object.keys(semesterData)) {
        semesterData[sem].sgpa = semesterData[sem].registeredCredits > 0
          ? Number((semesterData[sem].totalPoints / semesterData[sem].registeredCredits).toFixed(2))
          : 0;
      }

      const cgpa = totalRegisteredCredits > 0 ? Number((totalPointsForCgpa / totalRegisteredCredits).toFixed(2)) : 0;
      const statusInfo = latestStatusMap.get(student.id);

      cumulativeData.push({
        student: { ...student, status: statusInfo?.status || "Active", statusSemester: statusInfo?.statusSemester },
        semesterData,
        totalBacklogs,
        cgpa,
        totalCredits
      });
    }

    return cumulativeData.sort((a, b) => a.student.rollNumber.localeCompare(b.student.rollNumber));
  }

  async getCumulativeResults(filters: { branch?: string; batch?: string; year?: string; program?: string; section?: string }): Promise<any> {
    const studentConditions = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) {
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = parseInt(startYearMatch[1]);
        const regularPrefix = `${yy}JK%`;
        const currentLateralPrefix = `${yy + 1}JK5%`;
        const previousLateralPrefix = `${yy}JK5%`;

        studentConditions.push(or(
          and(
            ilike(students.rollNumber, regularPrefix),
            not(ilike(students.rollNumber, previousLateralPrefix))
          ),
          ilike(students.rollNumber, currentLateralPrefix)
        ));
      } else {
        studentConditions.push(inArray(students.batch, expandBatch(filters.batch)));
      }
    }
    if (filters.program) studentConditions.push(eq(students.program, filters.program));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));

    // Get all relevant data in one query using joins to avoid N+1 and inArray bottlenecks
    const queryResult = await db.select({
      student: students,
      result: results,
      subject: subjects
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return { summary: {}, passed: [], failed: [] };

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
    }

    const studentRows = Array.from(studentMap.values());

    const yearMapping: Record<string, string[]> = {
      "1st": ["I", "II"],
      "2nd": ["III", "IV"],
      "3rd": ["V", "VI"],
      "4th": ["VII", "VIII"]
    };

    const defaultSemesters = (filters.program === "MCA" || filters.branch === "MCA")
      ? ["I", "II", "III", "IV"]
      : ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    const targetSemesters = filters.year && filters.year !== "All"
      ? yearMapping[filters.year] || []
      : defaultSemesters;

    let passedStudents = [];
    let failedStudents = [];

    // Summary per semester requested
    const summary: Record<string, { registered: number; passed: number; failed: number }> = {};
    targetSemesters.forEach(sem => summary[sem] = { registered: 0, passed: 0, failed: 0 });

    for (const student of studentRows) {
      const studentResults = resultsByStudent.get(student.id) || [];
      let passedAllTargetSems = true;
      let registeredInTarget = false;
      let allPassedTotalCredits = 0;
      let allPassedTotalPoints = 0;

      const semSgpas: Record<string, number> = {};

      targetSemesters.forEach(sem => {
        const semResults = studentResults.filter(r => r.semester === sem);
        if (semResults.length > 0) {
          registeredInTarget = true;
          summary[sem].registered++;
          const hasBacklog = semResults.some(r => r.status === "BACKLOG");

          if (hasBacklog) {
            summary[sem].failed++;
            passedAllTargetSems = false;
          } else {
            summary[sem].passed++;
            let semPoints = 0;
            let semCredits = 0;

            for (const r of semResults) {
              const subj = r.subject;
              if (!subj) continue;
              const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

              if (actualCredits > 0) {
                semCredits += actualCredits;
                semPoints += r.gradePoints * actualCredits;
                allPassedTotalCredits += actualCredits;
                allPassedTotalPoints += r.gradePoints * actualCredits;
              }
            }
            if (semCredits > 0) {
              semSgpas[sem] = Number((semPoints / semCredits).toFixed(2));
            } else {
              semSgpas[sem] = 0;
            }
          }
        }
      });

      if (registeredInTarget) {
        if (passedAllTargetSems) {
          const cgpa = allPassedTotalCredits > 0 ? Number((allPassedTotalPoints / allPassedTotalCredits).toFixed(2)) : 0;
          let percentage = "0.00";
          if (cgpa > 0) {
            // Standard formula: Percentage = (CGPA - 0.5) * 10
            percentage = ((cgpa - 0.5) * 10).toFixed(2);
          }

          passedStudents.push({
            ...student,
            sgpas: semSgpas,
            cgpa,
            percentage
          });
        } else {
          failedStudents.push(student);
        }
      }
    }

    return {
      summary,
      passed: passedStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)),
      failed: failedStudents.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber))
    };
  }

  async getToppers(filters: { branch?: string; batch?: string; type: string; semester?: string; year?: string; topN?: number; program?: string; section?: string }): Promise<any> {
    const studentConditions = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) {
      const startYearMatch = filters.batch.match(/^20(\d{2})/);
      if (startYearMatch) {
        const yy = parseInt(startYearMatch[1]);
        const regularPrefix = `${yy}JK%`;
        const currentLateralPrefix = `${yy + 1}JK5%`;
        const previousLateralPrefix = `${yy}JK5%`;

        studentConditions.push(or(
          and(
            ilike(students.rollNumber, regularPrefix),
            not(ilike(students.rollNumber, previousLateralPrefix))
          ),
          ilike(students.rollNumber, currentLateralPrefix)
        ));
      } else {
        studentConditions.push(inArray(students.batch, expandBatch(filters.batch)));
      }
    }
    if (filters.program) studentConditions.push(eq(students.program, filters.program));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));

    const queryResult = await db.select({
      student: students,
      result: results,
      subject: subjects
    })
      .from(students)
      .innerJoin(results, eq(students.id, results.studentId))
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(eq(results.isLatest, true), ...studentConditions));

    if (queryResult.length === 0) return [];

    const studentMap = new Map<number, typeof students.$inferSelect>();
    const resultsByStudent = new Map<number, any[]>();

    for (const row of queryResult) {
      if (!studentMap.has(row.student.id)) {
        studentMap.set(row.student.id, row.student);
        resultsByStudent.set(row.student.id, []);
      }
      resultsByStudent.get(row.student.id)!.push({ ...row.result, subject: row.subject });
    }

    const studentRows = Array.from(studentMap.values());

    const yearMapping: Record<string, string[]> = {
      "1st": ["I", "II"],
      "2nd": ["III", "IV"],
      "3rd": ["V", "VI"],
      "4th": ["VII", "VIII"]
    };

    const targetSemesters = filters.type === "Semester" && filters.semester
      ? [filters.semester]
      : filters.type === "Year" && filters.year
        ? yearMapping[filters.year] || []
        : [];

    if (targetSemesters.length === 0) return [];

    let eligibleStudents = [];

    for (const student of studentRows) {
      const studentAllResults = resultsByStudent.get(student.id) || [];
      if (studentAllResults.length === 0) continue;

      // We ONLY care if they have an active backlog IN the target timeframe.
      // If setting "Year 1" toppers, a backlog in Year 2 shouldn't disqualify them for Year 1.
      const studentTargetResults = studentAllResults.filter(r => targetSemesters.includes(r.semester));
      const hasActiveBacklogInTarget = studentTargetResults.some(r => r.status === "BACKLOG");
      if (hasActiveBacklogInTarget) continue;

      // Enforce the student has passed exams in ALL target semesters
      // E.g., a "Yearly" topper must have cleared subjects spanning BOTH Sem I and Sem II.
      const presentSemesters = new Set(studentTargetResults.map(r => r.semester));
      if (presentSemesters.size < targetSemesters.length) continue;

      // Toppers must clear everything in their first valid attempt (REGULAR).
      // If ANY result in the target timeframe is a SUPPLY attempt, or if the grade has a Revaluation tag, they are disqualified.
      const hasInvalidAttempt = studentTargetResults.some(r =>
        r.examType === "SUPPLY" ||
        r.examType === "SUPPLY_REVALUATION" ||
        r.examType === "REGULAR_REVALUATION" ||
        r.examType === "REVALUATION" ||
        (r.grade && r.grade.includes("(REV)")) ||
        (r.grade && r.grade.startsWith("CHANGE"))
      );
      if (hasInvalidAttempt) continue;

      let totalPoints = 0;
      let totalRegisteredCredits = 0;

      for (const r of studentTargetResults) {
        if (r.status === "BACKLOG") continue;
        const subj = r.subject;
        if (!subj) continue;
        const actualCredits = Math.max(subj.credits || 0, r.creditsEarned || 0);

        if (actualCredits > 0) {
          totalRegisteredCredits += actualCredits;
          totalPoints += r.gradePoints * actualCredits;
        }
      }

      if (totalRegisteredCredits > 0) {
        const gpa = Number((totalPoints / totalRegisteredCredits).toFixed(2));
        eligibleStudents.push({ ...student, gpa });
      }
    }

    // Sort by GPA descending
    eligibleStudents.sort((a, b) => b.gpa - a.gpa);

    // Assign Ranks (handle ties)
    const rankedStudents = [];
    let currentRank = 1;
    let rankOffset = 0;
    let prevGpa = null;

    for (let i = 0; i < eligibleStudents.length; i++) {
      const s = eligibleStudents[i];
      if (prevGpa !== null && s.gpa < prevGpa) {
        currentRank += rankOffset;
        rankOffset = 1;
      } else if (prevGpa !== null && s.gpa === prevGpa) {
        rankOffset++;
      } else {
        rankOffset = 1;
      }
      rankedStudents.push({ ...s, rank: currentRank });
      prevGpa = s.gpa;
    }

    const topN = filters.topN || 5;
    return rankedStudents.filter(s => s.rank <= topN);
  }

  async getAnalytics(): Promise<any> {
    const allLatestResults = await db.select().from(results).where(eq(results.isLatest, true));
    const [{ count: studentCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(students);

    // Get Alumni student IDs to exclude from active count
    const alumniStatuses = await db.select({ studentId: studentAcademicStatus.studentId })
      .from(studentAcademicStatus)
      .where(eq(studentAcademicStatus.status, 'Alumni'));
    const alumniIds = new Set(alumniStatuses.map(a => a.studentId));

    // Also check for LEFT/DEATH/DISCONTINUED statuses
    const inactiveStatuses = await db.select({ studentId: studentAcademicStatus.studentId })
      .from(studentAcademicStatus)
      .where(inArray(studentAcademicStatus.status, ['LEFT', 'DEATH', 'DISCONTINUED']));
    const inactiveIds = new Set(inactiveStatuses.map(a => a.studentId));

    const excludedIds = new Set(Array.from(alumniIds).concat(Array.from(inactiveIds)));
    const activeStudentCount = studentCount - excludedIds.size;

    // Filter results to active students only (exclude alumni/LEFT/DISCONTINUED)
    const activeLatestResults = allLatestResults.filter(r => !excludedIds.has(r.studentId));

    // Detained/absent grades: students with only ABSENT or AB results never actually appeared
    const absentGrades = new Set(['ABSENT', 'AB']);

    // A student "appeared" if they have at least one result that is NOT absent/detained
    const appearedStudentIds = new Set<number>();
    const studentAllResults = new Map<number, typeof activeLatestResults>();
    for (const r of activeLatestResults) {
      if (!studentAllResults.has(r.studentId)) studentAllResults.set(r.studentId, []);
      studentAllResults.get(r.studentId)!.push(r);
    }
    for (const [studentId, sResults] of Array.from(studentAllResults.entries())) {
      const hasNonAbsent = sResults.some(r => !absentGrades.has(r.grade?.toUpperCase?.() || ''));
      if (hasNonAbsent) appearedStudentIds.add(studentId);
    }

    const totalStudentsWithExams = appearedStudentIds.size;

    // Results only for appeared students (exclude fully-absent rows from backlog count too)
    const appearedResults = activeLatestResults.filter(r => appearedStudentIds.has(r.studentId));

    // A student is considered "failed" if they have ANY result with status 'BACKLOG'
    // (excluding ABSENT/AB rows since those are absent marks, not real backlogs)
    const failedStudentIds = new Set(
      appearedResults.filter(r => r.status === 'BACKLOG' && !absentGrades.has(r.grade?.toUpperCase?.() || '')).map(r => r.studentId)
    );
    const passedStudentsCount = totalStudentsWithExams - failedStudentIds.size;

    const passPercentage = totalStudentsWithExams > 0 ? (passedStudentsCount / totalStudentsWithExams) * 100 : 0;

    // Most failed subjects
    const failedCounts: Record<number, number> = {};
    allLatestResults.filter(r => r.status === 'BACKLOG').forEach(r => {
      failedCounts[r.subjectId] = (failedCounts[r.subjectId] || 0) + 1;
    });

    const sortedFailures = Object.entries(failedCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const mostFailedSubjects = [];
    for (const [subjId, count] of sortedFailures) {
      const [subj] = await db.select().from(subjects).where(eq(subjects.id, Number(subjId)));
      if (subj) {
        mostFailedSubjects.push({ name: subj.subjectName, count });
      }
    }

    // Branch-wise backlogs: only count appeared (non-detained) active students with real backlogs
    const backlogResults = appearedResults.filter(r => r.status === 'BACKLOG' && !absentGrades.has(r.grade?.toUpperCase?.() || ''));
    const branchData: Record<string, { total: number; batches: Record<string, number> }> = {};

    // get distinct students for these backlogs
    if (backlogResults.length > 0) {
      const studentIds = Array.from(new Set(backlogResults.map(r => r.studentId)));
      const studs = await db.select().from(students).where(inArray(students.id, studentIds));

      // Each student counts as 1 backlog student for their respective branch/batch
      studs.forEach(s => {
        const branch = s.branch || 'Unknown';
        let batch = s.batch || 'Unknown';
        const rollNumber = s.rollNumber || '';

        // Merge Lateral Entries
        // Regular format: 22JK1..., 23JK1...
        // Lateral format: 23JK5... (belongs to 22 batch), 24JK5... (belongs to 23 batch)
        if (batch.match(/^20\d{2}-20\d{2}$/)) {
          const batchStartYear = parseInt(batch.substring(0, 4));
          const lateralPrefix = `${String(batchStartYear).substring(2)}JK5`;
          if (rollNumber.toUpperCase().includes(lateralPrefix)) {
            // It's a lateral entry student. Merge them into the PREVIOUS year's regular batch.
            // Example: 2024-2028 lateral student (24JK5...) belongs to 2023-2027 normal batch.
            batch = `${batchStartYear - 1}-${batchStartYear + 3}`;
          }
        } else if (batch === 'Unknown' || !batch.match(/^20\d{2}-20\d{2}$/)) {
          // Drop weird formats "November 2025" or "Unknown" from dashboard chart
          return;
        }

        if (!branchData[branch]) {
          branchData[branch] = { total: 0, batches: {} };
        }

        branchData[branch].total++;
        branchData[branch].batches[batch] = (branchData[branch].batches[batch] || 0) + 1;
      });
    }

    const branchWiseBacklogs = Object.entries(branchData).map(([branchName, data]) => {
      const batches = Object.entries(data.batches).map(([batchName, count]) => ({
        name: batchName,
        value: count
      })).sort((a, b) => a.name.localeCompare(b.name)); // Sort batches chronologically

      return {
        name: branchName,
        value: data.total,
        batches
      };
    }).sort((a, b) => b.value - a.value); // Sort branches by most backlogs

    // Build batch-wise active student counts
    const allStudents = await db.select().from(students);
    const batchActiveMap: Record<string, number> = {};
    for (const s of allStudents) {
      if (excludedIds.has(s.id)) continue;
      const b = s.batch || 'Unknown';
      batchActiveMap[b] = (batchActiveMap[b] || 0) + 1;
    }
    const activeStudentsByBatch = Object.entries(batchActiveMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      passPercentage: Number(passPercentage.toFixed(1)),
      mostFailedSubjects,
      branchWiseBacklogs,
      // totalStudents = students who actually appeared (consistent with pass % denominator)
      totalStudents: totalStudentsWithExams,
      activeStudentsByBatch
    };
  }

  /**
   * One-time cleanup: strip '--- No' revaluation artefacts from subject names in the DB.
   * Called automatically on server startup.
   */
  async cleanSubjectNames(): Promise<{ fixed: number }> {
    const allSubjects = await db.select().from(subjects);
    let fixed = 0;
    for (const subj of allSubjects) {
      const cleaned = subj.subjectName.replace(/\s*(?:-{2,3}\s*No|No\s*Change(?:\s*No)?)\s*$/i, '').trim();
      if (cleaned !== subj.subjectName && cleaned.length > 0) {
        await db.update(subjects).set({ subjectName: cleaned }).where(eq(subjects.id, subj.id));
        fixed++;
      }
    }
    if (fixed > 0) console.log(`[cleanup] Fixed ${fixed} corrupted subject name(s)`);
    return { fixed };
  }

  // â”€â”€ Faculty CRUD â”€â”€
  async getFaculty(): Promise<Faculty[]> {
    return db.select().from(faculty).orderBy(asc(faculty.facultyName));
  }

  async createFaculty(data: InsertFaculty): Promise<Faculty> {
    const [created] = await db.insert(faculty).values(data).returning();
    return created;
  }

  async updateFaculty(id: number, data: Partial<InsertFaculty>): Promise<Faculty | undefined> {
    const [updated] = await db.update(faculty).set(data).where(eq(faculty.id, id)).returning();
    return updated;
  }

  async deleteFaculty(id: number): Promise<boolean> {
    // Delete mappings first
    await db.delete(facultySubjectMap).where(eq(facultySubjectMap.facultyId, id));
    const [deleted] = await db.delete(faculty).where(eq(faculty.id, id)).returning();
    return !!deleted;
  }

  // â”€â”€ Faculty Mapping CRUD â”€â”€
  async getFacultyMappings(filters?: any): Promise<any[]> {
    const rows = await db.select({
      id: facultySubjectMap.id,
      facultyId: facultySubjectMap.facultyId,
      facultyName: faculty.facultyName,
      department: faculty.department,
      subjectCode: facultySubjectMap.subjectCode,
      semester: facultySubjectMap.semester,
      branch: facultySubjectMap.branch,
      batch: facultySubjectMap.batch,
      academicYear: facultySubjectMap.academicYear,
      section: facultySubjectMap.section,
    })
      .from(facultySubjectMap)
      .innerJoin(faculty, eq(facultySubjectMap.facultyId, faculty.id))
      .orderBy(asc(facultySubjectMap.branch), asc(facultySubjectMap.semester));
    return rows;
  }

  async createFacultyMapping(data: InsertFacultySubjectMap): Promise<FacultySubjectMap> {
    const [created] = await db.insert(facultySubjectMap).values(data).returning();
    return created;
  }

  async deleteFacultyMapping(id: number): Promise<boolean> {
    const [deleted] = await db.delete(facultySubjectMap).where(eq(facultySubjectMap.id, id)).returning();
    return !!deleted;
  }

  // â”€â”€ Consolidated Report â”€â”€
  async getConsolidatedReport(filters: {
    branch?: string; semester?: string; academicYear?: string;
    regulation?: string; batch?: string; program?: string; section?: string;
  }): Promise<any> {
    // Build WHERE conditions for students
    const studentConditions: any[] = [];
    if (filters.branch) studentConditions.push(eq(students.branch, filters.branch));
    if (filters.batch) {
      // Include both regular and lateral batches
      const match = filters.batch.match(/^(\d{4})-(\d{4})$/);
      if (match) {
        const startYear = parseInt(match[1]);
        const endYear = parseInt(match[2]);
        const lateralBatch = `${startYear + 1}-${endYear}`;
        studentConditions.push(
          or(inArray(students.batch, expandBatch(filters.batch)), inArray(students.batch, expandBatch(lateralBatch)))
        );
      } else {
        studentConditions.push(inArray(students.batch, expandBatch(filters.batch)));
      }
    }
    if (filters.regulation) studentConditions.push(eq(students.regulation, filters.regulation));
    if (filters.program) studentConditions.push(eq(students.program, filters.program));
    if (filters.section) studentConditions.push(eq(students.section, filters.section));

    // Get matching students
    const studentWhere = studentConditions.length > 0 ? and(...studentConditions) : undefined;
    const matchingStudents = await db.select().from(students).where(studentWhere);
    if (matchingStudents.length === 0) {
      return { sectionSummary: [], subjectWise: [], failedBreakdown: { singleSubject: 0, doubleSubjects: 0, threeSubjects: 0, fourSubjects: 0, fiveOrMore: 0 } };
    }

    const studentIds = matchingStudents.map(s => s.id);
    const studentMap = new Map(matchingStudents.map(s => [s.id, s]));

    // Build result conditions
    const resultConditions: any[] = [
      eq(results.isLatest, true),
      inArray(results.studentId, studentIds),
    ];
    if (filters.semester) resultConditions.push(eq(results.semester, filters.semester));
    if (filters.academicYear) resultConditions.push(academicYearCondition(results.academicYear, filters.academicYear));

    // Fetch all latest results for these students
    const latestResults = await db.select().from(results)
      .where(and(...resultConditions));

    if (latestResults.length === 0) {
      return { sectionSummary: [], subjectWise: [], failedBreakdown: { singleSubject: 0, doubleSubjects: 0, threeSubjects: 0, fourSubjects: 0, fiveOrMore: 0 } };
    }

    // Fetch subjects for these results
    const subjectIds = Array.from(new Set(latestResults.map(r => r.subjectId)));
    const subjectRows = await db.select().from(subjects).where(inArray(subjects.id, subjectIds));
    const subjectMap = new Map(subjectRows.map(s => [s.id, s]));

    // Fetch faculty mappings for query context
    const mappingConditions: any[] = [];
    if (filters.semester) mappingConditions.push(eq(facultySubjectMap.semester, filters.semester));
    if (filters.branch) mappingConditions.push(eq(facultySubjectMap.branch, filters.branch));
    if (filters.academicYear) mappingConditions.push(academicYearCondition(facultySubjectMap.academicYear, filters.academicYear));
    const mappingWhere = mappingConditions.length > 0 ? and(...mappingConditions) : undefined;
    const facultyMappings = await db.select({
      subjectCode: facultySubjectMap.subjectCode,
      section: facultySubjectMap.section,
      facultyName: faculty.facultyName,
    })
      .from(facultySubjectMap)
      .innerJoin(faculty, eq(facultySubjectMap.facultyId, faculty.id))
      .where(mappingWhere);

    // Build faculty lookup: subjectCode -> section -> facultyName
    const facultyLookup = new Map<string, Map<string | null, string>>();
    for (const fm of facultyMappings) {
      if (!facultyLookup.has(fm.subjectCode)) facultyLookup.set(fm.subjectCode, new Map());
      facultyLookup.get(fm.subjectCode)!.set(fm.section, fm.facultyName);
    }

    const getFacultyName = (subjectCode: string, section: string | null): string => {
      const sectionMap = facultyLookup.get(subjectCode);
      if (!sectionMap) return '-';
      return sectionMap.get(section) || sectionMap.get(null) || sectionMap.values().next().value || '-';
    };

    // â”€â”€ Group results by student to determine per-student pass/fail â”€â”€
    const resultsByStudent = new Map<number, typeof latestResults>();
    for (const r of latestResults) {
      if (!resultsByStudent.has(r.studentId)) resultsByStudent.set(r.studentId, []);
      resultsByStudent.get(r.studentId)!.push(r);
    }

    // Track students that appeared (have at least 1 result)
    const studentIdsThatAppeared = new Set<number>();
    // Track absent students (grade = Ab)
    const absentByStudent = new Map<number, Set<number>>(); // studentId -> set of subjectIds they were absent for

    Array.from(resultsByStudent.entries()).forEach(([sid, sResults]) => {
      for (const r of sResults) {
        if (r.grade === 'Ab' || r.grade === 'ABSENT') {
          if (!absentByStudent.has(sid)) absentByStudent.set(sid, new Set());
          absentByStudent.get(sid)!.add(r.subjectId);
        } else {
          studentIdsThatAppeared.add(sid);
        }
      }
    });


    // â”€â”€ 1. Section-wise Summary â”€â”€
    const sectionStats = new Map<string, { registered: number; absent: number; appeared: number; passed: number; failed: number }>();
    const registeredStudentsBySection = new Map<string, Set<number>>();

    Array.from(resultsByStudent.entries()).forEach(([sid, sResults]) => {
      const student = studentMap.get(sid);
      if (!student) return;
      const sec = student.section || 'A';

      if (!sectionStats.has(sec)) sectionStats.set(sec, { registered: 0, absent: 0, appeared: 0, passed: 0, failed: 0 });
      if (!registeredStudentsBySection.has(sec)) registeredStudentsBySection.set(sec, new Set());

      if (registeredStudentsBySection.get(sec)!.has(sid)) return;
      registeredStudentsBySection.get(sec)!.add(sid);

      const stats = sectionStats.get(sec)!;
      stats.registered++;

      // Check if student was absent in ANY subject (consider absent for the sem)
      const anyAbsent = sResults.some((r: import('./examcell.schema').Result) => r.grade === 'Ab' || r.grade === 'ABSENT');
      if (anyAbsent) {
        stats.absent++;
        return;
      }

      stats.appeared++;

      // Check if student passed all subjects (no backlogs)
      const totalCredits = sResults.reduce((acc: number, r: import('./examcell.schema').Result) => {
        return acc + (Number(r.creditsEarned) || 0);
      }, 0);
      const hasBacklog = sResults.some(r => r.status === 'BACKLOG' && r.grade !== 'Ab' && r.grade !== 'ABSENT');
      if (hasBacklog) {
        stats.failed++;
      } else {
        stats.passed++;
      }
    });

    const sectionSummary = Array.from(sectionStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([section, s]) => ({
        section,
        registered: s.registered,
        absent: s.absent,
        appeared: s.appeared,
        passed: s.passed,
        failed: s.failed,
        passPercentage: s.appeared > 0 ? Number(((s.passed / s.appeared) * 100).toFixed(2)) : 0,
      }));

    // â”€â”€ 2. Subject-wise Summary â”€â”€
    const subjectStats = new Map<string, { subjectCode: string; subjectName: string; registered: number; absent: number; appeared: number; passed: number; failed: number }>();

    for (const r of latestResults) {
      const subj = subjectMap.get(r.subjectId);
      if (!subj) continue;
      const key = subj.subjectCode;

      if (!subjectStats.has(key)) {
        subjectStats.set(key, { subjectCode: subj.subjectCode, subjectName: subj.subjectName, registered: 0, absent: 0, appeared: 0, passed: 0, failed: 0 });
      }
      const ss = subjectStats.get(key)!;
      ss.registered++;

      if (r.grade === 'Ab' || r.grade === 'ABSENT') {
        ss.absent++;
      } else {
        ss.appeared++;
        if (r.status === 'PASS') {
          ss.passed++;
        } else {
          ss.failed++;
        }
      }
    }

    const subjectWise = Array.from(subjectStats.values())
      .sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))
      .map(s => ({
        ...s,
        facultyName: getFacultyName(s.subjectCode, filters.section || null),
        passPercentage: s.appeared > 0 ? Number(((s.passed / s.appeared) * 100).toFixed(2)) : 0,
      }));

    // â”€â”€ 3. Failed Status Breakdown â”€â”€
    let singleSubject = 0, doubleSubjects = 0, threeSubjects = 0, fourSubjects = 0, fiveOrMore = 0;

    Array.from(resultsByStudent.entries()).forEach(([sid, sResults]) => {
      const failedCount = sResults.filter((r: import('./examcell.schema').Result) => r.status === 'BACKLOG' && r.grade !== 'Ab' && r.grade !== 'ABSENT').length;
      if (failedCount === 1) singleSubject++;
      else if (failedCount === 2) doubleSubjects++;
      else if (failedCount === 3) threeSubjects++;
      else if (failedCount === 4) fourSubjects++;
      else if (failedCount >= 5) fiveOrMore++;
    });

    return {
      sectionSummary,
      subjectWise,
      failedBreakdown: { singleSubject, doubleSubjects, threeSubjects, fourSubjects, fiveOrMore },
    };
  }

  // --- MID Marks Implementation ---
  async getMidExam(filters: { academicYear: string, semester: string, branch: string, subjectCode: string, midType: string, batch: string }): Promise<import('./examcell.schema').MidExam | undefined> {
    const { midExams } = await import('./examcell.schema');
    const [exam] = await db.select().from(midExams).where(
      and(
        eq(midExams.academicYear, filters.academicYear),
        eq(midExams.semester, filters.semester),
        eq(midExams.branch, filters.branch),
        eq(midExams.batch, filters.batch),
        eq(midExams.subjectCode, filters.subjectCode),
        eq(midExams.midType, filters.midType)
      )
    );
    return exam;
  }

  async createMidExam(data: import('./examcell.schema').InsertMidExam): Promise<import('./examcell.schema').MidExam> {
    const { midExams } = await import('./examcell.schema');
    const [newExam] = await db.insert(midExams).values(data).returning();
    return newExam;
  }

  async getMidMarks(midExamId: number): Promise<import('./examcell.schema').MidMark[]> {
    const { midMarks } = await import('./examcell.schema');
    return await db.select().from(midMarks).where(eq(midMarks.midExamId, midExamId));
  }

  async upsertMidMark(data: import('./examcell.schema').InsertMidMark): Promise<import('./examcell.schema').MidMark> {
    const { midMarks } = await import('./examcell.schema');
    const [mark] = await db.insert(midMarks)
      .values({
        ...data,
        isLocked: data.isLocked || false,
        lockedAt: data.isLocked ? new Date() : null
      })
      .onConflictDoUpdate({
        target: [midMarks.studentId, midMarks.midExamId],
        set: {
          midExamMarks: data.midExamMarks,
          assignmentMarks: data.assignmentMarks,
          quizMarks: data.quizMarks,
          totalMarks: data.totalMarks,
          labDailyMarks: data.labDailyMarks,
          labRecordMarks: data.labRecordMarks,
          labInternalMarks: data.labInternalMarks,
          labVivaMarks: data.labVivaMarks,
          prcAssessmentMarks: data.prcAssessmentMarks,
          reportMarks: data.reportMarks,
          seminarMarks: data.seminarMarks,
          enteredBy: data.enteredBy,
          isLocked: data.isLocked || false,
          lockedAt: data.isLocked ? new Date() : null,
          updatedAt: new Date()
        }
      })
      .returning();
    return mark;
  }

  async bulkUpsertMidMarks(marks: import('./examcell.schema').InsertMidMark[]): Promise<void> {
    if (!marks || marks.length === 0) return;
    const { midMarks } = await import('./examcell.schema');
    const marksWithLocks = marks.map(m => ({
      ...m,
      isLocked: m.isLocked !== undefined ? m.isLocked : true,
      lockedAt: (m.isLocked !== undefined ? m.isLocked : true) ? new Date() : null
    }));
    await db.insert(midMarks)
      .values(marksWithLocks)
      .onConflictDoUpdate({
        target: [midMarks.studentId, midMarks.midExamId],
        set: {
          midExamMarks: sql`EXCLUDED.mid_exam_marks`,
          assignmentMarks: sql`EXCLUDED.assignment_marks`,
          quizMarks: sql`EXCLUDED.quiz_marks`,
          totalMarks: sql`EXCLUDED.total_marks`,
          labDailyMarks: sql`EXCLUDED.lab_daily_marks`,
          labRecordMarks: sql`EXCLUDED.lab_record_marks`,
          labInternalMarks: sql`EXCLUDED.lab_internal_marks`,
          labVivaMarks: sql`EXCLUDED.lab_viva_marks`,
          prcAssessmentMarks: sql`EXCLUDED.prc_assessment_marks`,
          reportMarks: sql`EXCLUDED.report_marks`,
          seminarMarks: sql`EXCLUDED.seminar_marks`,
          enteredBy: sql`EXCLUDED.entered_by`,
          isLocked: sql`EXCLUDED.is_locked`,
          lockedAt: sql`EXCLUDED.locked_at`,
          updatedAt: new Date()
        }
      });
  }

  async insertAuditLog(data: import('./examcell.schema').InsertAuditLog): Promise<import('./examcell.schema').AuditLog> {
    const { auditLogs } = await import('./examcell.schema');
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async unlockMidMark(studentId: number, midExamId: number, adminId: number, reason: string): Promise<boolean> {
    const { midMarks } = await import('./examcell.schema');
    const [updated] = await db.update(midMarks)
      .set({ isLocked: false, lockedAt: null })
      .where(and(eq(midMarks.studentId, studentId), eq(midMarks.midExamId, midExamId)))
      .returning();
      
    if (updated) {
      await this.insertAuditLog({
        actionType: 'UNLOCK_ROW',
        entityType: 'MID_MARK',
        entityId: updated.id,
        performedBy: adminId,
        reason: reason
      });
      return true;
    }
    return false;
  }

  async finalFreezeExam(examId: number, adminId: number): Promise<boolean> {
    const { midExams, midMarks } = await import('./examcell.schema');
    const [updated] = await db.update(midExams)
      .set({ isFinalLocked: true, lockedAt: new Date(), isFrozen: true }) // Also setting isFrozen for backward UI compatibility
      .where(eq(midExams.id, examId))
      .returning();

    if (updated) {
      // Force lock any remaining unlocked rows just in case
      await db.update(midMarks)
        .set({ isLocked: true, lockedAt: new Date() })
        .where(eq(midMarks.midExamId, examId));

      await this.insertAuditLog({
        actionType: 'FINAL_LOCK',
        entityType: 'MID_EXAM',
        entityId: updated.id,
        performedBy: adminId,
        reason: 'Finalized subject marks'
      });
      return true;
    }
    return false;
  }

  async unfreezeExam(examId: number, adminId: number, reason: string): Promise<boolean> {
    const { midExams } = await import('./examcell.schema');
    const [updated] = await db.update(midExams)
      .set({ isFinalLocked: false, lockedAt: null, isFrozen: false })
      .where(eq(midExams.id, examId))
      .returning();

    if (updated) {
      await this.insertAuditLog({
        actionType: 'FINAL_UNLOCK',
        entityType: 'MID_EXAM',
        entityId: updated.id,
        performedBy: adminId,
        reason: reason
      });
      return true;
    }
    return false;
  }

  // Global Settings
  async getGlobalSettings(): Promise<GlobalSettings> {
    const [existing] = await db.select().from(globalSettings).limit(1);
    if (existing) return existing;
    // Auto-seed the single settings row if it doesn't exist
    const [created] = await db.insert(globalSettings).values({ autoLockOnSave: true }).returning();
    return created;
  }

  async updateGlobalSettings(data: Partial<{ autoLockOnSave: boolean }>): Promise<GlobalSettings> {
    const current = await this.getGlobalSettings();
    const [updated] = await db.update(globalSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(globalSettings.id, current.id))
      .returning();
    return updated;
  }
}


export const storage = new DatabaseStorage();

