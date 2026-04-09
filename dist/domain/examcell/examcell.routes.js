"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck -- Ported from standalone Exam Cell. Type mismatches are Zod v4 inference artifacts, runtime is correct.
const express_1 = require("express");
const examcell_storage_1 = require("./examcell.storage");
const examcell_api_1 = require("./examcell.api");
const examcell_schema_1 = require("./examcell.schema");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const ExcelJS = __importStar(require("exceljs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const examcell_parser_1 = require("./examcell.parser");
const promotion_routes_1 = __importDefault(require("./promotion.routes"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const JWT_SECRET = config_1.SESSION_SECRET;
const upload = (0, multer_1.default)({ dest: 'uploads/' });
// Rate limiter for login
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per window
    message: { message: "Too many login attempts, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});
// Auth Middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        next();
    });
}
function requireInternalMarks(req, res, next) {
    requireAuth(req, res, () => {
        const user = req.user;
        if (user?.isAdmin || user?.canManageInternalMarks) {
            next();
        }
        else {
            res.status(403).json({ message: 'Access denied. Internal marks management permission required.' });
        }
    });
}
const router = (0, express_1.Router)();
// Seed DB and clean any corrupted subject names on start
seedDatabase().catch(console.error);
examcell_storage_1.storage.cleanSubjectNames().catch(console.error);
router.post('/auth/login', loginLimiter, async (req, res) => {
    try {
        const input = zod_1.z.object({ username: zod_1.z.string(), password: zod_1.z.string() }).parse(req.body);
        const admin = await examcell_storage_1.storage.getAdminByUsername(input.username);
        if (!admin || !(await bcrypt_1.default.compare(input.password, admin.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (admin.loginType === 'IP_BASED' && admin.username !== 'admin') {
            const rawIp = req.socket.remoteAddress || req.ip || '';
            const clientIp = rawIp.replace(/^::ffff:/, '');
            const allowedList = (admin.allowedIps || '').split(',').map(ip => ip.trim());
            if (!allowedList.includes(clientIp)) {
                return res.status(403).json({ message: `Login denied: Your IP Address (${clientIp}) is not authorized for this account.` });
            }
        }
        const payload = {
            id: admin.id,
            username: admin.username,
            isAdmin: admin.isAdmin,
            canUpload: admin.canUpload,
            canManageSettings: admin.canManageSettings,
            canManageAcademics: admin.canManageAcademics,
            canManageInternalMarks: admin.canManageInternalMarks,
            canViewDashboard: admin.canViewDashboard,
            canViewStudents: admin.canViewStudents,
            canViewReports: admin.canViewReports,
            canFreezeMarks: admin.canFreezeMarks
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        res.json({ user: payload, token });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/auth/me', requireAuth, async (req, res) => {
    // Re-fetch user to ensure latest permissions are applied
    const userId = req.user.id;
    const admins = await examcell_storage_1.storage.getAdmins();
    const admin = admins.find(a => a.id === userId);
    if (!admin) {
        return res.status(401).json({ message: 'User not found' });
    }
    res.json({
        user: {
            id: admin.id,
            username: admin.username,
            isAdmin: admin.isAdmin,
            canUpload: admin.canUpload,
            canManageSettings: admin.canManageSettings,
            canManageAcademics: admin.canManageAcademics,
            canManageInternalMarks: admin.canManageInternalMarks,
            canViewDashboard: admin.canViewDashboard,
            canViewStudents: admin.canViewStudents,
            canViewReports: admin.canViewReports,
            canFreezeMarks: admin.canFreezeMarks
        }
    });
});
router.post('/auth/logout', (req, res) => {
    res.json({ message: 'Logged out' });
});
router.post('/upload/results', requireAuth, upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file || !filePath) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const { examType, academicYear, semester, branch, batch, regulation, program } = req.body;
        if (!examType || !academicYear || !semester || !branch || !batch || !program) {
            return res.status(400).json({ message: 'Missing required metadata' });
        }
        let data = [];
        let detectedRegulation = regulation || "Unknown";
        if (req.file.originalname.endsWith('.csv')) {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            data = (0, sync_1.parse)(fileContent, { columns: true, skip_empty_lines: true });
        }
        else if (req.file.originalname.match(/\.xlsx?$/)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const rows = [];
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `column${colNumber}`;
            });
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return;
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                rows.push(rowData);
            });
            data = rows;
        }
        else if (req.file.originalname.endsWith('.pdf')) {
            // Use Node.js PDF parser utility
            const parserResponse = await (0, examcell_parser_1.parsePdfResults)(filePath);
            data = parserResponse.results;
            if (parserResponse.regulation && parserResponse.regulation !== "Unknown") {
                detectedRegulation = parserResponse.regulation;
            }
            if (data.length === 0) {
                return res.status(400).json({ message: 'Could not extract valid result data from the provided PDF.' });
            }
        }
        else {
            return res.status(400).json({ message: 'Unsupported file type. Use PDF, CSV or Excel.' });
        }
        if (detectedRegulation === "Unknown") {
            return res.status(400).json({ message: 'Could not auto-detect regulation from PDF. Please provide it, or ensure the PDF contains valid subject codes.' });
        }
        const result = await examcell_storage_1.storage.processResultsUpload(data, {
            examType, academicYear, semester, branch, batch, regulation: detectedRegulation, program
        });
        res.json({ message: 'Upload processed', processed: result.processed, skipped: result.skipped, errors: result.errors });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
    finally {
        if (filePath) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) {
                console.error(`Failed to unlink file ${filePath}:`, e);
            }
        }
    }
});
router.post('/upload/preview', requireAuth, upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file || !filePath) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const { batch } = req.body;
        if (!batch) {
            return res.status(400).json({ message: 'Missing required metadata (Batch)' });
        }
        let data = [];
        if (req.file.originalname.endsWith('.csv')) {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            data = (0, sync_1.parse)(fileContent, { columns: true, skip_empty_lines: true });
        }
        else if (req.file.originalname.match(/\.xlsx?$/)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const rows = [];
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `column${colNumber}`;
            });
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return;
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                rows.push(rowData);
            });
            data = rows;
        }
        else if (req.file.originalname.endsWith('.pdf')) {
            const parserResponse = await (0, examcell_parser_1.parsePdfResults)(filePath);
            data = parserResponse.results;
            if (data.length === 0) {
                return res.status(400).json({ message: 'Could not extract valid result data from the provided PDF.' });
            }
        }
        else {
            return res.status(400).json({ message: 'Unsupported file type. Use PDF, CSV or Excel.' });
        }
        // Filter logic matches storage layer
        // Regular: prefix = batch start year 2-digit (e.g. "21" for 2021-2025)
        // Lateral: prefix = startYear+1 (e.g. "22"), with '5' after institution code (e.g. 22JK5A...)
        let regularPrefix = "";
        let lateralPrefix = "";
        if (batch && batch.length >= 4) {
            const startYear = parseInt(batch.substring(0, 4), 10);
            regularPrefix = batch.substring(2, 4);
            if (!isNaN(startYear)) {
                lateralPrefix = String(startYear + 1).substring(2);
            }
        }
        const isMatchingBatch = (rollStr) => {
            if (!regularPrefix)
                return true;
            if (rollStr.startsWith(regularPrefix))
                return true;
            if (lateralPrefix && rollStr.startsWith(lateralPrefix) && new RegExp(`^${lateralPrefix}[A-Z]{2}5`, 'i').test(rollStr))
                return true;
            return false;
        };
        const matchedRows = [];
        let skippedCount = 0;
        for (const row of data) {
            const rollStr = (row.RollNumber || "").toString().trim();
            if (isMatchingBatch(rollStr)) {
                matchedRows.push(row);
            }
            else {
                skippedCount++;
            }
        }
        res.json({
            totalParsed: data.length,
            matchedCount: matchedRows.length,
            skippedCount: skippedCount,
            previewRows: matchedRows.slice(0, 10) // Only send the first 10 for safety
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
    finally {
        if (filePath) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) {
                console.error(`Failed to unlink file ${filePath}:`, e);
            }
        }
    }
});
router.post('/upload/students', requireAdmin, upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file || !filePath) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        let data = [];
        if (req.file.originalname.endsWith('.csv')) {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            data = (0, sync_1.parse)(fileContent, { columns: true, skip_empty_lines: true, bom: true });
        }
        else if (req.file.originalname.match(/\.xlsx?$/)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const rows = [];
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `column${colNumber}`;
            });
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return;
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                rows.push(rowData);
            });
            data = rows;
        }
        else {
            return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
        }
        const result = await examcell_storage_1.storage.processStudentsUpload(data);
        res.json({ message: 'Student data uploaded', processed: result.processed, errors: result.errors });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
    finally {
        if (filePath) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) {
                console.error(`Failed to unlink file ${filePath}:`, e);
            }
        }
    }
});
router.get('/students', requireAuth, async (req, res) => {
    const query = req.query.query;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const filters = {
        branch: req.query.branch,
        batch: req.query.batch,
        program: req.query.program,
        section: req.query.section,
    };
    const students = await examcell_storage_1.storage.searchStudents(query, page, 50, filters);
    res.json(students);
});
router.get('/students/:id', requireAuth, async (req, res) => {
    const student = await examcell_storage_1.storage.getStudent(Number(req.params.id));
    if (!student) {
        return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
});
router.patch('/students/:id', requireAuth, async (req, res) => {
    const user = req.user;
    if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Only administrators can edit student profiles' });
    }
    try {
        const studentId = Number(req.params.id);
        // Validate with zod schema
        const updateData = examcell_schema_1.insertStudentSchema.partial().parse(req.body);
        // Check if roll number is being changed to one that already exists
        if (updateData.rollNumber) {
            const existingStudent = await examcell_storage_1.storage.getStudentByRoll(updateData.rollNumber);
            if (existingStudent && existingStudent.id !== studentId) {
                // The user explicitly requested to OVERWRITE duplicate roll numbers.
                // We merge the old student record's results/photos into the current profile, and then delete the duplicate.
                await examcell_storage_1.storage.mergeStudentProfiles(existingStudent.id, studentId);
            }
        }
        const student = await examcell_storage_1.storage.updateStudent(studentId, updateData);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    }
    catch (err) {
        // Catch postgres unique constraint errors as a fallback
        if (err.code === '23505' || err.message.includes('unique constraint')) {
            return res.status(400).json({ message: 'Roll number is already assigned to another student' });
        }
        res.status(400).json({ message: err.message });
    }
});
// Simple in-memory TTL cache for heavily hit, static endpoints
const apiCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
function getCachedResponse(req, res) {
    const user = req.user;
    const cacheKey = `${req.originalUrl}_${user?.username || 'guest'}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
        res.json(cached.data);
        return true;
    }
    return false;
}
function setCachedResponse(req, data) {
    const user = req.user;
    const cacheKey = `${req.originalUrl}_${user?.username || 'guest'}`;
    apiCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
}
// Helper: exclude students whose latest academic status is DETAINED or LEFT
function excludeDetainedLeft(studentConditions, sql, studentsTable) {
    studentConditions.push(sql `${studentsTable.id} NOT IN (
        SELECT sas."student_id" FROM student_academic_status sas
        WHERE sas."student_id" = ${studentsTable.id}
          AND sas."status" IN ('DETAINED', 'LEFT')
          AND sas."updated_at" = (
            SELECT MAX(sas2."updated_at") FROM student_academic_status sas2
            WHERE sas2."student_id" = sas."student_id"
          )
      )`);
}
router.get('/batches', requireAuth, async (req, res) => {
    try {
        if (getCachedResponse(req, res))
            return;
        let batches = await examcell_storage_1.storage.getDistinctBatches();
        const program = req.query.program;
        if (program) {
            batches = batches.filter(b => {
                const match = b.match(/^(\d{4})-(\d{4})/);
                if (!match)
                    return false;
                const span = parseInt(match[2]) - parseInt(match[1]);
                if (program.toUpperCase() === 'MCA')
                    return span === 2;
                return span === 4;
            });
        }
        setCachedResponse(req, batches);
        res.json(batches);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/branches', requireAuth, async (req, res) => {
    try {
        if (getCachedResponse(req, res))
            return;
        let branches = await examcell_storage_1.storage.getDistinctBranches();
        // Branch isolation for HODs
        const user = req.user;
        if (user && !user.isAdmin && user.username !== 'examcell') {
            const lowerUsername = user.username.toLowerCase();
            let bestMatch = null;
            let maxLength = 0;
            for (const b of branches) {
                // Flatten branch name (e.g. 'CSE(AI&ML)' -> 'cseaiml')
                const lowerBranch = b.toLowerCase().replace(/[^a-z]/g, '');
                if (lowerUsername.includes(lowerBranch) && lowerBranch.length > maxLength) {
                    maxLength = lowerBranch.length;
                    bestMatch = b;
                }
            }
            if (bestMatch) {
                branches = [bestMatch];
            }
        }
        setCachedResponse(req, branches);
        res.json(branches);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/academic-years', requireAuth, async (req, res) => {
    try {
        if (getCachedResponse(req, res))
            return;
        const years = await examcell_storage_1.storage.getDistinctAcademicYears();
        setCachedResponse(req, years);
        res.json(years);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/programs', requireAuth, async (req, res) => {
    try {
        if (getCachedResponse(req, res))
            return;
        const programs = await examcell_storage_1.storage.getDistinctPrograms();
        setCachedResponse(req, programs);
        res.json(programs);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/sections', requireAuth, async (req, res) => {
    try {
        if (getCachedResponse(req, res))
            return;
        const { batch, branch } = req.query;
        const sections = await examcell_storage_1.storage.getDistinctSections(batch, branch);
        setCachedResponse(req, sections);
        res.json(sections);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/reports/backlogs', requireAuth, async (req, res) => {
    const { branch, semester, batch, program, section } = req.query;
    const backlogs = await examcell_storage_1.storage.getBacklogs({ branch, semester, batch, program, section });
    res.json(backlogs);
});
router.get('/reports/cumulative-backlogs', requireAuth, async (req, res) => {
    const { branch, batch, program, section } = req.query;
    const cumulative = await examcell_storage_1.storage.getCumulativeBacklogs({ branch: branch, batch: batch, program: program, section: section });
    res.json(cumulative);
});
router.get('/reports/cumulative-results', requireAuth, async (req, res) => {
    const { branch, batch, year, program, section } = req.query;
    const results = await examcell_storage_1.storage.getCumulativeResults({ branch: branch, batch: batch, year: year, program: program, section: section });
    res.json(results);
});
router.get('/reports/batch-transcripts', requireAuth, async (req, res) => {
    const { branch, batch } = req.query;
    if (!branch || !batch) {
        return res.status(400).json({ message: "Branch and Batch are required" });
    }
    const transcripts = await examcell_storage_1.storage.getBatchTranscripts(branch, batch);
    res.json(transcripts);
});
router.get('/reports/toppers', requireAuth, async (req, res) => {
    const { branch, batch, type, semester, year, topN, program, section } = req.query;
    if (!type) {
        return res.status(400).json({ message: "Type is required" });
    }
    const results = await examcell_storage_1.storage.getToppers({
        branch: branch,
        batch: batch,
        type: type,
        semester: semester,
        year: year,
        program: program,
        section: section,
        topN: topN ? parseInt(topN) : 5
    });
    res.json(results);
});
router.get('/reports/analytics', requireAuth, async (req, res) => {
    const analytics = await examcell_storage_1.storage.getAnalytics();
    res.json(analytics);
});
// Admin Management Routes
router.get('/admins', requireAdmin, async (req, res) => {
    try {
        const allAdmins = await examcell_storage_1.storage.getAdmins();
        res.json(allAdmins);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching admins' });
    }
});
router.post('/admins', requireAdmin, async (req, res) => {
    try {
        const input = zod_1.z.object({ username: zod_1.z.string().min(3), password: zod_1.z.string().min(6), isAdmin: zod_1.z.boolean().optional().default(false), canUpload: zod_1.z.boolean().optional().default(false), canManageSettings: zod_1.z.boolean().optional().default(false), canManageAcademics: zod_1.z.boolean().optional().default(false), canManageInternalMarks: zod_1.z.boolean().optional().default(false), canViewDashboard: zod_1.z.boolean().optional().default(true), canViewStudents: zod_1.z.boolean().optional().default(true), canViewReports: zod_1.z.boolean().optional().default(true), canFreezeMarks: zod_1.z.boolean().optional().default(false), loginType: zod_1.z.string().optional().default('GLOBAL'), allowedIps: zod_1.z.string().optional().default('') }).parse(req.body);
        const existing = await examcell_storage_1.storage.getAdminByUsername(input.username);
        if (existing) {
            return res.status(400).json({ message: 'Username already taken' });
        }
        const hashedPassword = await bcrypt_1.default.hash(input.password, 10);
        const newAdmin = await examcell_storage_1.storage.createAdmin({
            username: input.username,
            password: hashedPassword,
            isAdmin: input.isAdmin,
            canUpload: input.canUpload,
            canManageSettings: input.canManageSettings,
            canManageAcademics: input.canManageAcademics,
            canManageInternalMarks: input.canManageInternalMarks,
            canViewDashboard: input.canViewDashboard,
            canViewStudents: input.canViewStudents,
            canViewReports: input.canViewReports,
            canFreezeMarks: input.canFreezeMarks,
            loginType: input.loginType,
            allowedIps: input.allowedIps
        });
        res.json({
            id: newAdmin.id,
            username: newAdmin.username,
            isAdmin: newAdmin.isAdmin,
            canUpload: newAdmin.canUpload,
            canManageSettings: newAdmin.canManageSettings,
            canManageAcademics: newAdmin.canManageAcademics,
            canManageInternalMarks: newAdmin.canManageInternalMarks,
            canViewDashboard: newAdmin.canViewDashboard,
            canViewStudents: newAdmin.canViewStudents,
            canViewReports: newAdmin.canViewReports,
            canFreezeMarks: newAdmin.canFreezeMarks,
            loginType: newAdmin.loginType,
            allowedIps: newAdmin.allowedIps
        });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/admins/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const input = zod_1.z.object({ username: zod_1.z.string().min(3), password: zod_1.z.string().min(6).optional(), isAdmin: zod_1.z.boolean().optional(), canUpload: zod_1.z.boolean().optional(), canManageSettings: zod_1.z.boolean().optional(), canManageAcademics: zod_1.z.boolean().optional(), canManageInternalMarks: zod_1.z.boolean().optional(), canViewDashboard: zod_1.z.boolean().optional(), canViewStudents: zod_1.z.boolean().optional(), canViewReports: zod_1.z.boolean().optional(), canFreezeMarks: zod_1.z.boolean().optional(), loginType: zod_1.z.string().optional(), allowedIps: zod_1.z.string().optional() }).parse(req.body);
        const updateData = { username: input.username };
        if (input.password) {
            updateData.password = await bcrypt_1.default.hash(input.password, 10);
        }
        if (input.isAdmin !== undefined)
            updateData.isAdmin = input.isAdmin;
        if (input.canUpload !== undefined)
            updateData.canUpload = input.canUpload;
        if (input.canManageSettings !== undefined)
            updateData.canManageSettings = input.canManageSettings;
        if (input.canManageAcademics !== undefined)
            updateData.canManageAcademics = input.canManageAcademics;
        if (input.canManageInternalMarks !== undefined)
            updateData.canManageInternalMarks = input.canManageInternalMarks;
        if (input.canViewDashboard !== undefined)
            updateData.canViewDashboard = input.canViewDashboard;
        if (input.canViewStudents !== undefined)
            updateData.canViewStudents = input.canViewStudents;
        if (input.canViewReports !== undefined)
            updateData.canViewReports = input.canViewReports;
        if (input.canFreezeMarks !== undefined)
            updateData.canFreezeMarks = input.canFreezeMarks;
        if (input.loginType !== undefined)
            updateData.loginType = input.loginType;
        if (input.allowedIps !== undefined)
            updateData.allowedIps = input.allowedIps;
        const updatedAdmin = await examcell_storage_1.storage.updateAdmin(id, updateData);
        if (!updatedAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(updatedAdmin);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: err.errors[0].message });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/admins/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        // Prevent deleting the last admin or the currently logged-in admin
        const allAdmins = await examcell_storage_1.storage.getAdmins();
        if (allAdmins.length <= 1) {
            return res.status(400).json({ message: 'Cannot delete the last admin account' });
        }
        // Note: we can't easily prevent deleting self unless req.user.id is checked, 
        // but assuming requireAuth adds user to req:
        if (req.user?.id === id) {
            return res.status(400).json({ message: 'Cannot delete your own account while logged in' });
        }
        const deleted = await examcell_storage_1.storage.deleteAdmin(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/students/bulk-photos', requireAdmin, upload.array('photos', 50), async (req, res) => {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ message: 'No photos uploaded' });
        }
        const files = req.files;
        let successCount = 0;
        let errorCount = 0;
        const failedFiles = [];
        for (const file of files) {
            try {
                // Extract roll number strictly from the filename (e.g. 23JK1A0501.jpg -> 23JK1A0501)
                const ext = path_1.default.extname(file.originalname);
                const rollNumberBase = path_1.default.basename(file.originalname, ext).toUpperCase().trim();
                if (!rollNumberBase) {
                    errorCount++;
                    failedFiles.push(file.originalname);
                    continue;
                }
                // Read file into Base64
                const fileBuffer = fs_1.default.readFileSync(file.path);
                const base64Data = fileBuffer.toString('base64');
                const mimeType = file.mimetype || 'image/jpeg';
                const dataUri = `data:${mimeType};base64,${base64Data}`;
                // Save via storage (we need a new storage method for this)
                const result = await examcell_storage_1.storage.upsertStudentPhoto(rollNumberBase, dataUri);
                if (result) {
                    successCount++;
                }
                else {
                    errorCount++; // Student roll number not found
                    failedFiles.push(file.originalname);
                    console.warn(`[bulk-photos] No matching student for roll number: "${rollNumberBase}" (file: ${file.originalname})`);
                }
            }
            catch (fileErr) {
                errorCount++;
                failedFiles.push(file.originalname);
                console.error(`Error processing photo ${file.originalname}:`, fileErr);
            }
            finally {
                // Clean up the temp file (async with retry for Windows EBUSY)
                const cleanupFile = async (filePath, retries = 3) => {
                    for (let attempt = 0; attempt < retries; attempt++) {
                        try {
                            await fs_1.default.promises.unlink(filePath);
                            return;
                        }
                        catch (e) {
                            if (e.code === 'EBUSY' && attempt < retries - 1) {
                                await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                            }
                            else {
                                // Silently ignore â€“ file will be cleaned on next restart
                            }
                        }
                    }
                };
                cleanupFile(file.path);
            }
        }
        res.json({ message: 'Upload batch complete', successCount, errorCount, failedFiles });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error during photo upload' });
    }
});
router.get('/students/:id/photo', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id, 10);
        if (isNaN(studentId))
            return res.status(400).send('Invalid student ID');
        const photoData = await examcell_storage_1.storage.getStudentPhoto(studentId);
        if (!photoData) {
            return res.status(404).send('Photo not found');
        }
        // Parse the Data URI (e.g. "data:image/jpeg;base64,...")
        const matches = photoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(500).send('Invalid image data');
        }
        const mimeType = matches[1];
        const imageBuffer = Buffer.from(matches[2], 'base64');
        // Set explicit caching headers! Cache for 24 hours locally.
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(imageBuffer);
    }
    catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// â”€â”€ Faculty CRUD â”€â”€
router.get('/faculty', requireAuth, async (req, res) => {
    try {
        res.json(await examcell_storage_1.storage.getFaculty());
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/faculty', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.faculty.create.input.parse(req.body);
        const created = await examcell_storage_1.storage.createFaculty(input);
        res.json(created);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError)
            return res.status(400).json({ message: err.errors[0].message });
        res.status(500).json({ message: err.message });
    }
});
router.put('/faculty/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const input = examcell_api_1.api.faculty.update.input.parse(req.body);
        const updated = await examcell_storage_1.storage.updateFaculty(id, input);
        if (!updated)
            return res.status(404).json({ message: 'Faculty not found' });
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.delete('/faculty/flush', requireAuth, async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: 'Forbidden' });
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { faculty, facultySubjectMap } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        await db.delete(facultySubjectMap);
        await db.delete(faculty);
        res.json({ success: true, message: 'All faculty data flushed' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.delete('/faculty/:id', requireAdmin, async (req, res) => {
    try {
        const deleted = await examcell_storage_1.storage.deleteFaculty(Number(req.params.id));
        if (!deleted)
            return res.status(404).json({ message: 'Faculty not found' });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ Bulk Faculty Import â”€â”€
router.post('/faculty/bulk', requireAdmin, upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file || !filePath)
            return res.status(400).json({ message: 'No file uploaded' });
        let data = [];
        if (req.file.originalname.endsWith('.csv')) {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            data = (0, sync_1.parse)(fileContent, { columns: true, skip_empty_lines: true, bom: true });
        }
        else if (req.file.originalname.match(/\.xlsx?$/)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const rows = [];
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `column${colNumber}`;
            });
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return;
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                rows.push(rowData);
            });
            data = rows;
        }
        else {
            return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
        }
        let created = 0;
        let skipped = 0;
        const errors = [];
        // Get existing faculty names for dedup
        const existingFaculty = await examcell_storage_1.storage.getFaculty();
        const existingNames = new Set(existingFaculty.map(f => f.facultyName.toLowerCase().trim()));
        for (const row of data) {
            try {
                const name = (row.FacultyName || row.facultyName || row.Name || row.name || '').toString().trim();
                if (!name) {
                    errors.push('Skipped row with empty faculty name');
                    continue;
                }
                if (existingNames.has(name.toLowerCase())) {
                    skipped++;
                    continue;
                }
                await examcell_storage_1.storage.createFaculty({
                    facultyName: name,
                    department: (row.Department || row.department || '').toString().trim() || undefined,
                    designation: (row.Designation || row.designation || '').toString().trim() || undefined,
                });
                existingNames.add(name.toLowerCase());
                created++;
            }
            catch (err) {
                errors.push(`Error for row: ${err.message}`);
            }
        }
        res.json({ message: 'Bulk faculty import complete', created, skipped, errors });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
    finally {
        if (filePath) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) { }
        }
    }
});
// â”€â”€ Bulk Faculty Mapping Import â”€â”€
router.post('/faculty-mapping/bulk', requireAdmin, upload.single('file'), async (req, res) => {
    const filePath = req.file?.path;
    try {
        if (!req.file || !filePath)
            return res.status(400).json({ message: 'No file uploaded' });
        let data = [];
        if (req.file.originalname.endsWith('.csv')) {
            const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
            data = (0, sync_1.parse)(fileContent, { columns: true, skip_empty_lines: true, bom: true });
        }
        else if (req.file.originalname.match(/\.xlsx?$/)) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.worksheets[0];
            const rows = [];
            const headers = [];
            worksheet.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = cell.value?.toString() || `column${colNumber}`;
            });
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1)
                    return;
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value;
                });
                rows.push(rowData);
            });
            data = rows;
        }
        else {
            return res.status(400).json({ message: 'Unsupported file type. Use CSV or Excel.' });
        }
        // Pre-load existing faculty and subjects for fast lookups
        const existingFaculty = await examcell_storage_1.storage.getFaculty();
        const facultyByName = new Map(existingFaculty.map(f => [f.facultyName.toLowerCase().trim().replace(/\s+/g, ' '), f]));
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { subjects } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const allSubjects = await db.select().from(subjects);
        const subjectByCode = new Map(allSubjects.map(s => [s.subjectCode.toUpperCase().trim(), s]));
        let created = 0;
        const errors = [];
        for (const row of data) {
            try {
                const facultyName = (row.FacultyName || row.facultyName || row.Faculty || '').toString().trim();
                const subjectCode = (row.SubjectCode || row.subjectCode || row.Code || '').toString().trim().toUpperCase();
                const subjectName = (row.SubjectName || row.subjectName || row.Subject || '').toString().trim();
                const credits = parseFloat(row.Credits || row.credits) || 0;
                const rawSemester = (row.Semester || row.semester || '').toString().trim();
                const semesterMap = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI", "7": "VII", "8": "VIII" };
                const semester = semesterMap[rawSemester] || rawSemester.toUpperCase();
                const rawBranch = (row.Branch || row.branch || '').toString().trim();
                let branch = rawBranch;
                // Detect open electives: subject code ends in a letter (e.g. R233204J, R233205F)
                const isOpenElective = /[A-Za-z]$/.test(subjectCode);
                if (!isOpenElective) {
                    const codeMatch = subjectCode.match(/^R\d{4}(\d{2})/i);
                    if (codeMatch) {
                        const branchCode = codeMatch[1];
                        if (branchCode === '42')
                            branch = 'CSE (AI&ML)';
                        else if (branchCode === '43')
                            branch = 'CSE (AI&DS)';
                        else if (branchCode === '44')
                            branch = 'CSE (DS)';
                        else if (branchCode === '04')
                            branch = 'ECE';
                        else if (branchCode === '12')
                            branch = 'IT';
                        else if (branchCode === '05')
                            branch = 'CSE';
                    }
                }
                if (branch.toUpperCase().replace(/\s+/g, '') === 'CSE(DS)')
                    branch = 'CSE (DS)';
                if (branch.toUpperCase().replace(/\s+/g, '') === 'CSE(AI&ML)')
                    branch = 'CSE (AI&ML)';
                const batch = (row.Batch || row.batch || '').toString().trim();
                const academicYear = (row.AcademicYear || row.academicYear || row.AcYear || '').toString().trim();
                const section = (row.Section || row.section || '').toString().trim() || undefined;
                const department = (row.Department || row.department || row.Dept || '').toString().trim() || undefined;
                const designation = (row.Designation || row.designation || row.Desig || '').toString().trim() || undefined;
                if (!facultyName || !subjectCode || !semester || !branch || !batch || !academicYear) {
                    errors.push(`Skipped row: missing required fields (FacultyName=${facultyName}, SubjectCode=${subjectCode}, Semester=${semester}, Branch=${branch}, Batch=${batch}, AcademicYear=${academicYear})`);
                    continue;
                }
                // Auto-create faculty if not exists
                const lookupName = facultyName.toLowerCase().replace(/\s+/g, ' ');
                let fac = facultyByName.get(lookupName);
                if (!fac) {
                    // Also try exact fallback just in case before creation
                    fac = facultyByName.get(facultyName.toLowerCase());
                    if (!fac) {
                        fac = await examcell_storage_1.storage.createFaculty({ facultyName, department, designation });
                        facultyByName.set(lookupName, fac);
                        facultyByName.set(facultyName.toLowerCase(), fac);
                    }
                }
                // If faculty already exists but is missing department or designation, backfill it
                if (fac && ((department && !fac.department) || (designation && !fac.designation))) {
                    const { eq: eqFac } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
                    const { faculty } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
                    const newDept = fac.department || department;
                    const newDesig = fac.designation || designation;
                    await db.update(faculty)
                        .set({ department: newDept, designation: newDesig })
                        .where(eqFac(faculty.id, fac.id));
                    fac.department = newDept;
                    fac.designation = newDesig;
                }
                // Auto-create subject if not exists
                let existingSubject = subjectByCode.get(subjectCode);
                if (!existingSubject) {
                    const [newSubject] = await db.insert(subjects).values({
                        subjectCode,
                        subjectName: subjectName || 'Unknown Subject',
                        credits,
                        semester,
                        branch,
                    }).onConflictDoNothing({ target: subjects.subjectCode }).returning();
                    if (newSubject) {
                        subjectByCode.set(subjectCode, newSubject);
                    }
                }
                else {
                    // Subject already exists â€” check if branch needs to be appended
                    const existingBranches = existingSubject.branch.split(',').map((b) => b.trim());
                    if (!existingBranches.includes(branch) && branch !== 'ALL') {
                        let newBranchString;
                        // Detect open electives: subject code ends in a letter (e.g. R233204J, R233205F)
                        const isOpenElective = /[A-Za-z]$/.test(subjectCode);
                        // Detect DS/AIML shared subjects: code contains '42' or '44' in specialization segment
                        const isDsAimlShared = /[Rr]\d{2}3242\d*|[Rr]\d{2}3244\d*/.test(subjectCode);
                        if (isDsAimlShared) {
                            // Shared only across DS and AI&ML â€” combine both
                            const dsAimlBranches = ['CSE (DS)', 'CSE (AI&ML)'];
                            const mergedSet = new Set(Array.from(existingBranches).concat(dsAimlBranches));
                            const combined = Array.from(mergedSet).join(', ');
                            newBranchString = combined;
                        }
                        else if (isOpenElective) {
                            // Open electives shared across CSE, AI&ML, and DS only (e.g. R233204J, R233205F)
                            newBranchString = 'CSE, CSE (AI&ML), CSE (DS)';
                        }
                        else {
                            // Standard comma-append
                            newBranchString = existingSubject.branch === 'ALL' ? 'ALL' : `${existingSubject.branch}, ${branch}`;
                        }
                        const { eq: eqInner } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
                        await db.update(subjects).set({ branch: newBranchString }).where(eqInner(subjects.subjectCode, subjectCode));
                        existingSubject.branch = newBranchString;
                        subjectByCode.set(subjectCode, existingSubject);
                    }
                }
                // Create mapping
                await examcell_storage_1.storage.createFacultyMapping({
                    facultyId: fac.id,
                    subjectCode,
                    semester,
                    branch,
                    batch,
                    academicYear,
                    section: section || null,
                });
                created++;
            }
            catch (err) {
                errors.push(`Error: ${err.message}`);
            }
        }
        res.json({ message: 'Bulk mapping import complete', created, errors });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
    finally {
        if (filePath) {
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch (e) { }
        }
    }
});
// â”€â”€ Faculty Mapping CRUD â”€â”€
router.get('/faculty-mapping', requireAuth, async (req, res) => {
    try {
        res.json(await examcell_storage_1.storage.getFacultyMappings(req.query));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/faculty-mapping', requireAdmin, async (req, res) => {
    try {
        const input = examcell_api_1.api.facultyMapping.create.input.parse(req.body);
        const created = await examcell_storage_1.storage.createFacultyMapping(input);
        res.json(created);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError)
            return res.status(400).json({ message: err.errors[0].message });
        res.status(500).json({ message: err.message });
    }
});
router.delete('/faculty-mapping/flush', requireAuth, async (req, res) => {
    try {
        if (!req.user?.isAdmin)
            return res.status(403).json({ message: 'Forbidden' });
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { facultySubjectMap } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        await db.delete(facultySubjectMap);
        res.json({ success: true, message: 'All faculty mappings flushed' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.delete('/faculty-mapping/:id', requireAdmin, async (req, res) => {
    try {
        const deleted = await examcell_storage_1.storage.deleteFacultyMapping(Number(req.params.id));
        if (!deleted)
            return res.status(404).json({ message: 'Mapping not found' });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ Consolidated Report â”€â”€
router.get('/reports/consolidated', requireAuth, async (req, res) => {
    try {
        const { branch, semester, academicYear, regulation, batch, program, section } = req.query;
        const report = await examcell_storage_1.storage.getConsolidatedReport({
            branch: branch,
            semester: semester,
            academicYear: academicYear,
            regulation: regulation,
            batch: batch,
            program: program,
            section: section,
        });
        res.json(report);
    }
    catch (err) {
        console.error('Consolidated report error:', err);
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ Subjects listing â”€â”€
router.get('/subjects', requireAuth, async (req, res) => {
    try {
        const { branch, semester, batch } = req.query;
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { subjects, students } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, asc, or, ilike } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const conditions = [];
        // We no longer filter by branch strictly here because branch is a comma-separated string
        // We will fetch by semester and regulation, and then filter in memory
        if (semester)
            conditions.push(eq(subjects.semester, semester));
        if (batch) {
            // Find regulation for this batch to filter subjects
            const studentInfo = await db.select({ regulation: students.regulation })
                .from(students)
                .where(eq(students.batch, batch))
                .limit(1);
            if (studentInfo.length > 0 && studentInfo[0].regulation) {
                const reg = studentInfo[0].regulation;
                const regYear = reg.match(/\d{2}/)?.[0];
                if (regYear) {
                    conditions.push(or(ilike(subjects.subjectCode, `${regYear}%`), ilike(subjects.subjectCode, `R${regYear}%`)));
                }
                else {
                    conditions.push(or(ilike(subjects.subjectCode, `${reg}%`), ilike(subjects.subjectCode, `R${reg}%`)));
                }
            }
            else {
                // Fallback if no students yet for this batch: derive regulation year
                let derivedReg = '23'; // Default to R23
                const match = batch.match(/^(\d{4})/);
                if (match) {
                    const startYear = parseInt(match[1], 10);
                    if (startYear >= 2023)
                        derivedReg = '23';
                    else if (startYear >= 2020)
                        derivedReg = '20';
                    else if (startYear >= 2019)
                        derivedReg = '19';
                    else if (startYear >= 2016)
                        derivedReg = '16';
                }
                conditions.push(or(ilike(subjects.subjectCode, `${derivedReg}%`), ilike(subjects.subjectCode, `R${derivedReg}%`)));
            }
        }
        let data = await db.select().from(subjects)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(subjects.subjectCode));
        if (branch) {
            const queryBranch = branch;
            data = data.filter((s) => {
                const subjectBranches = s.branch.split(',').map(b => b.trim().toUpperCase());
                const qb = queryBranch.toUpperCase();
                const isExplicitMatch = subjectBranches.includes(qb) || subjectBranches.includes('ALL');
                let hasMatch = isExplicitMatch;
                let isInheritedFromCse = false;
                // If a student is in a CSE specialization, they share pure CSE subjects unless explicitly removed.
                if (!hasMatch && qb.startsWith('CSE') && subjectBranches.includes('CSE')) {
                    hasMatch = true;
                    isInheritedFromCse = true;
                }
                if (!hasMatch)
                    return false;
                const openElectiveMatch = s.subjectCode.match(/[a-zA-Z]$/i);
                if (openElectiveMatch || subjectBranches.includes('ALL') || isExplicitMatch)
                    return true;
                // JNTU / Standard Subject Code extraction (e.g. R2322051 -> '05')
                // ONLY apply this strict filtering to subjects from 2nd year onwards (where codes actually embed the branch).
                // 1st-year subject codes (e.g., R231101) are shorter and their 5th/6th digits do NOT represent the branch (01 is not Civil here).
                if (isInheritedFromCse) {
                    const isFirstYearSubject = s.subjectCode.match(/^R\d{2}1/i);
                    if (!isFirstYearSubject) {
                        const codeMatch = s.subjectCode.match(/^R\d{4}(\d{2})/i);
                        if (codeMatch) {
                            const branchCode = codeMatch[1];
                            // If querying pure CSE, reject AI&ML (42), AI&DS (43), DS (44), ECE (04), IT (12)
                            if (queryBranch === 'CSE') {
                                if (['42', '43', '44', '04', '12'].includes(branchCode))
                                    return false;
                            }
                            // If querying CSM (AI&ML), reject DS (44), AI&DS (43), ECE (04), base CSE (05)
                            else if (queryBranch === 'CSE (AI&ML)') {
                                if (['44', '43', '04', '05'].includes(branchCode))
                                    return false;
                            }
                            // If querying CSD (DS), reject CSM (42), AI&DS (43), ECE (04), base CSE (05)
                            else if (queryBranch === 'CSE (DS)') {
                                if (['42', '43', '04', '05'].includes(branchCode))
                                    return false;
                            }
                        }
                    }
                }
                return true;
            });
        }
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ MID Marks â”€â”€
router.get('/faculty-mappings', requireAuth, async (req, res) => {
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { facultySubjectMap, subjects, faculty } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const mappings = await db.select({
            id: facultySubjectMap.id,
            facultyId: facultySubjectMap.facultyId,
            facultyName: faculty.facultyName,
            subjectCode: facultySubjectMap.subjectCode,
            subjectName: subjects.subjectName,
            semester: facultySubjectMap.semester,
            branch: facultySubjectMap.branch,
            batch: facultySubjectMap.batch,
            academicYear: facultySubjectMap.academicYear,
            section: facultySubjectMap.section
        })
            .from(facultySubjectMap)
            .leftJoin(subjects, eq(facultySubjectMap.subjectCode, subjects.subjectCode))
            .leftJoin(faculty, eq(facultySubjectMap.facultyId, faculty.id));
        res.json(mappings);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.get('/mid-marks', requireInternalMarks, async (req, res) => {
    try {
        let { academicYear, semester, branch, subjectCode, midType, batch, section } = req.query;
        if (!semester || !branch || !subjectCode || !midType || !batch) {
            return res.status(400).json({ message: "Missing required query parameters" });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { students, midExams, midMarks, facultySubjectMap } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, like, or, inArray, sql } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // 0. Infer academicYear if not provided from the UI
        if (!academicYear) {
            const mappingConditions = [
                eq(facultySubjectMap.subjectCode, String(subjectCode)),
                eq(facultySubjectMap.branch, String(branch)),
                eq(facultySubjectMap.batch, String(batch)),
                eq(facultySubjectMap.semester, String(semester))
            ];
            if (section)
                mappingConditions.push(eq(facultySubjectMap.section, String(section)));
            const [mapping] = await db.select().from(facultySubjectMap).where(and(...mappingConditions)).limit(1);
            if (mapping) {
                academicYear = mapping.academicYear;
            }
            else {
                const today = new Date();
                academicYear = `${today.getFullYear()}-${today.getFullYear() + 1}`;
            }
        }
        // 1. Find all matching exams for this subject/batch/semester/type
        // Broaden search to ignore strict branch/year match to handle cross-departmental or mis-mapped uploads
        const allMatchingExams = await db.select().from(midExams).where(and(eq(midExams.batch, String(batch)), eq(midExams.semester, String(semester)), eq(sql `UPPER(${midExams.subjectCode})`, String(subjectCode).toUpperCase()), eq(midExams.midType, String(midType))));
        // Prefer exam with exact branch match if it exists, otherwise use the first one available
        let exam = allMatchingExams.find(e => e.branch === String(branch)) || allMatchingExams[0];
        if (!exam) {
            const { storage } = await Promise.resolve().then(() => __importStar(require('./examcell.storage')));
            exam = await storage.createMidExam({
                academicYear: String(academicYear),
                semester: String(semester),
                branch: String(branch),
                batch: String(batch),
                subjectCode: String(subjectCode),
                midType: String(midType),
                maxMarks: 30
            });
        }
        const examIds = allMatchingExams.length > 0 ? allMatchingExams.map(e => e.id) : [exam.id];
        // 2. Build Student Conditions
        const endYearMatch = String(batch).match(/-(\d{4})$/);
        const endYear = endYearMatch ? endYearMatch[1] : '';
        const studentConditions = [eq(students.branch, String(branch))];
        if (batch) {
            if (endYear) {
                // Match both Regular (2024-2028) and Lateral (2025-2028) by the graduating year
                studentConditions.push(or(eq(students.batch, String(batch)), like(students.batch, `%-${endYear}`)));
            }
            else {
                studentConditions.push(eq(students.batch, String(batch)));
            }
        }
        if (section)
            studentConditions.push(eq(students.section, String(section)));
        excludeDetainedLeft(studentConditions, sql, students);
        // 3. Fetch all students matching criteria, LEFT JOINing with mid_marks using grouping 
        //    to guarantee one row per student even if marks were uploaded across duplicate exams
        const rows = await db.select({
            studentId: students.id,
            rollNumber: students.rollNumber,
            name: students.name,
            midExamId: sql `${exam.id}`.as('midExamId'),
            midExamMarks: sql `MAX(${midMarks.midExamMarks})`.mapWith(Number).as('midExamMarks'),
            assignmentMarks: sql `MAX(${midMarks.assignmentMarks})`.mapWith(Number).as('assignmentMarks'),
            quizMarks: sql `MAX(${midMarks.quizMarks})`.mapWith(Number).as('quizMarks'),
            totalMarks: sql `MAX(${midMarks.totalMarks})`.mapWith(Number).as('totalMarks'),
            labDailyMarks: sql `MAX(${midMarks.labDailyMarks})`.mapWith(Number).as('labDailyMarks'),
            labRecordMarks: sql `MAX(${midMarks.labRecordMarks})`.mapWith(Number).as('labRecordMarks'),
            labInternalMarks: sql `MAX(${midMarks.labInternalMarks})`.mapWith(Number).as('labInternalMarks'),
            labVivaMarks: sql `MAX(${midMarks.labVivaMarks})`.mapWith(Number).as('labVivaMarks'),
            prcAssessmentMarks: sql `MAX(${midMarks.prcAssessmentMarks})`.mapWith(Number).as('prcAssessmentMarks'),
            reportMarks: sql `MAX(${midMarks.reportMarks})`.mapWith(Number).as('reportMarks'),
            seminarMarks: sql `MAX(${midMarks.seminarMarks})`.mapWith(Number).as('seminarMarks'),
            isLocked: sql `BOOL_OR(COALESCE(${midMarks.isLocked}, false))`.mapWith(Boolean).as('isLocked'),
        })
            .from(students)
            .leftJoin(midMarks, and(eq(midMarks.studentId, students.id), inArray(midMarks.midExamId, examIds)))
            .where(and(...studentConditions))
            .groupBy(students.id, students.rollNumber, students.name)
            .orderBy(students.rollNumber);
        console.log(`[Diagnostic] /api/mid-marks: Found ${rows.length} students for branch ${branch}, batch ${batch}, section ${section}`);
        res.json({ exam, marks: rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// Admin Freeze Routes
router.get('/exams', requireAuth, async (req, res) => {
    try {
        const { batch, branch, semester, midType } = req.query;
        const conditions = [];
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, subjects } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, sql } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        if (batch)
            conditions.push(eq(midExams.batch, String(batch)));
        if (branch)
            conditions.push(eq(midExams.branch, String(branch)));
        if (semester)
            conditions.push(eq(midExams.semester, String(semester)));
        if (midType)
            conditions.push(eq(midExams.midType, String(midType)));
        // midType filter already handles LAB vs MID1/MID2 distinction via eq(midExams.midType, ...)
        const exams = await db.select({
            exam: midExams,
            subject: subjects
        })
            .from(midExams)
            .innerJoin(subjects, and(eq(midExams.subjectCode, subjects.subjectCode), eq(midExams.branch, subjects.branch), eq(midExams.semester, subjects.semester)))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(midExams.createdAt);
        res.json(exams);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/exams/bulk-freeze', requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user?.isAdmin && !user?.canFreezeMarks)
            return res.status(403).json({ message: 'Access denied. Freeze permission required.' });
        const { examIds, isFrozen } = req.body;
        if (!Array.isArray(examIds) || examIds.length === 0) {
            return res.status(400).json({ message: "No exam IDs provided" });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { inArray } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // Update exam level flags
        const updateData = { isFrozen: !!isFrozen };
        if (!isFrozen) {
            updateData.isFinalLocked = false;
            updateData.lockedAt = null;
        }
        await db.update(midExams)
            .set(updateData)
            .where(inArray(midExams.id, examIds));
        // If unfreezing, also unlock individual student rows to allow editing
        if (!isFrozen) {
            await db.update(midMarks)
                .set({ isLocked: false, lockedAt: null })
                .where(inArray(midMarks.midExamId, examIds));
        }
        res.json({ success: true, count: examIds.length, isFrozen });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.patch('/exams/:id/freeze', requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user?.isAdmin && !user?.canFreezeMarks)
            return res.status(403).json({ message: 'Access denied. Freeze permission required.' });
        const examId = parseInt(req.params.id);
        const { isFrozen } = req.body;
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // Update exam level flags
        const updateData = { isFrozen: !!isFrozen };
        if (!isFrozen) {
            updateData.isFinalLocked = false;
            updateData.lockedAt = null;
        }
        await db.update(midExams)
            .set(updateData)
            .where(eq(midExams.id, examId));
        // If unfreezing, also unlock individual student rows to allow editing
        if (!isFrozen) {
            await db.update(midMarks)
                .set({ isLocked: false, lockedAt: null })
                .where(eq(midMarks.midExamId, examId));
        }
        res.json({ success: true, isFrozen });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/mid-marks/save', requireInternalMarks, async (req, res) => {
    try {
        const { studentId, midExamId, midExamMarks, assignmentMarks, quizMarks, totalMarks, labDailyMarks, labRecordMarks, labInternalMarks, labVivaMarks, prcAssessmentMarks, reportMarks, seminarMarks, isLocked } = req.body;
        const enteredBy = req.user.id;
        if (!studentId || !midExamId)
            return res.status(400).json({ message: "Missing studentId or midExamId" });
        const valuesToCheck = [midExamMarks, assignmentMarks, quizMarks, labDailyMarks, labRecordMarks, labInternalMarks];
        if (valuesToCheck.some(val => val !== undefined && val !== null && val < 0)) {
            return res.status(400).json({ message: "Marks cannot be negative. Please correct the entered marks and try again." });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const exam = await db.query.midExams.findFirst({ where: eq(midExams.id, midExamId) });
        if (exam?.isFrozen || exam?.isFinalLocked) {
            return res.status(403).json({ message: "Marks for this subject are frozen and cannot be modified." });
        }
        const existingRow = await db.query.midMarks.findFirst({
            where: and(eq(midMarks.studentId, studentId), eq(midMarks.midExamId, midExamId))
        });
        if (existingRow?.isLocked) {
            return res.status(403).json({ message: "Marks for this student are locked and cannot be modified." });
        }
        const globalSettings = await examcell_storage_1.storage.getGlobalSettings();
        const finalLock = (isLocked === true && globalSettings.autoLockOnSave === true);
        const toNum = (val) => (val === undefined || val === null || val === '') ? undefined : Number(val);
        const mark = await examcell_storage_1.storage.upsertMidMark({
            studentId: Number(studentId),
            midExamId: Number(midExamId),
            midExamMarks: toNum(midExamMarks),
            assignmentMarks: toNum(assignmentMarks),
            quizMarks: toNum(quizMarks),
            totalMarks: Number(totalMarks) || 0,
            labDailyMarks: toNum(labDailyMarks),
            labRecordMarks: toNum(labRecordMarks),
            labInternalMarks: toNum(labInternalMarks),
            labVivaMarks: toNum(labVivaMarks),
            prcAssessmentMarks: toNum(prcAssessmentMarks),
            reportMarks: toNum(reportMarks),
            seminarMarks: toNum(seminarMarks),
            enteredBy: Number(enteredBy),
            isLocked: finalLock
        });
        res.json({ success: true, mark });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/mid-marks/bulk-save', requireInternalMarks, async (req, res) => {
    try {
        const { marks } = req.body;
        const enteredBy = req.user.id;
        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ message: "No marks provided" });
        }
        const hasNegative = marks.some(m => (m.midExamMarks ?? 0) < 0 || (m.assignmentMarks ?? 0) < 0 || (m.quizMarks ?? 0) < 0 ||
            (m.labDailyMarks ?? 0) < 0 || (m.labRecordMarks ?? 0) < 0 || (m.labInternalMarks ?? 0) < 0 ||
            (m.prcAssessmentMarks ?? 0) < 0 || (m.reportMarks ?? 0) < 0 || (m.seminarMarks ?? 0) < 0);
        if (hasNegative) {
            return res.status(400).json({ message: "Marks cannot be negative. Please correct the entered marks and try again." });
        }
        // Fetch global auto-lock setting
        const globalSettings = await examcell_storage_1.storage.getGlobalSettings();
        const shouldLock = globalSettings.autoLockOnSave;
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, inArray } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const examId = marks[0].midExamId;
        const exam = await db.query.midExams.findFirst({ where: eq(midExams.id, examId) });
        const user = req.user;
        const canOverride = user.isAdmin || user.username === 'examcell';
        if (!canOverride && (exam?.isFrozen || exam?.isFinalLocked)) {
            return res.status(403).json({ message: "Marks for this subject are frozen and cannot be modified." });
        }
        // Check row-level locks strictly
        const studentIds = marks.map((m) => m.studentId);
        const lockedRows = await db.select().from(midMarks)
            .where(and(eq(midMarks.midExamId, examId), eq(midMarks.isLocked, true), inArray(midMarks.studentId, studentIds)));
        if (lockedRows.length > 0) {
            if (!canOverride) {
                return res.status(403).json({ message: "One or more student marks are already locked and cannot be modified. Please refresh the page." });
            }
            else {
                // Admin override: Record audit logs for each locked row they modify
                for (const locked of lockedRows) {
                    await examcell_storage_1.storage.insertAuditLog({
                        actionType: 'ADMIN_OVERRIDE_MARKS',
                        entityType: 'MID_MARK',
                        entityId: locked.id,
                        performedBy: user.id,
                        reason: 'Admin/Examcell modified already frozen/locked marks via direct edit.'
                    });
                }
            }
        }
        const payload = marks.map((m) => ({
            studentId: m.studentId,
            midExamId: m.midExamId,
            midExamMarks: m.midExamMarks,
            assignmentMarks: m.assignmentMarks,
            quizMarks: m.quizMarks,
            totalMarks: m.totalMarks,
            labDailyMarks: m.labDailyMarks,
            labRecordMarks: m.labRecordMarks,
            labInternalMarks: m.labInternalMarks,
            enteredBy,
            isLocked: shouldLock
        }));
        await examcell_storage_1.storage.bulkUpsertMidMarks(payload);
        // Note: We no longer set isFinalLocked here because 
        // one midExam spans multiple sections of the same branch.
        // Instead, we rely entirely on row-level locks.
        res.json({ success: true, count: payload.length });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// Admin and Freeze Endpoints
router.post('/internal-marks/final-freeze', requireInternalMarks, async (req, res) => {
    try {
        const { examId } = req.body;
        const user = req.user;
        if (!examId)
            return res.status(400).json({ message: "Exam ID is required" });
        const success = await examcell_storage_1.storage.finalFreezeExam(examId, user.id);
        if (success) {
            res.json({ success: true, message: "Marks finalized successfully" });
        }
        else {
            res.status(404).json({ message: "Exam not found" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/internal-marks/unlock-row', requireAdmin, async (req, res) => {
    try {
        const { studentId, midExamId, reason } = req.body;
        const user = req.user;
        if (!studentId || !midExamId || !reason) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const success = await examcell_storage_1.storage.unlockMidMark(studentId, midExamId, user.id, reason);
        if (success) {
            res.json({ success: true, message: "Student marks unlocked successfully" });
        }
        else {
            res.status(404).json({ message: "Marks record not found" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/internal-marks/unlock-subject', requireAdmin, async (req, res) => {
    try {
        const { examId, reason } = req.body;
        const user = req.user;
        if (!examId || !reason) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const success = await examcell_storage_1.storage.unfreezeExam(examId, user.id, reason);
        if (success) {
            res.json({ success: true, message: "Subject marks unlocked successfully" });
        }
        else {
            res.status(404).json({ message: "Exam not found" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ Global Settings Endpoints â”€â”€
router.get('/global-settings', requireAuth, async (_req, res) => {
    try {
        const settings = await examcell_storage_1.storage.getGlobalSettings();
        res.json(settings);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.post('/global-settings', requireAuth, async (req, res) => {
    const user = req.user;
    if (!user?.isAdmin && !user?.canFreezeMarks) {
        return res.status(403).json({ message: 'Access denied. Admin or Freeze Marks permission required.' });
    }
    try {
        const { autoLockOnSave } = req.body;
        const settings = await examcell_storage_1.storage.updateGlobalSettings({ autoLockOnSave });
        res.json(settings);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
// â”€â”€ Excel Bulk Import for Mid Marks â”€â”€
// GET endpoint to generate a clean template dynamically
router.get('/mid-marks/template', (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Mid Marks");
        ws.addRow(['DEPARTMENT INTERNAL MARKS EXCEL TEMPLATE']);
        ws.addRow(['Batch:', '', 'Branch:', '', 'Semester:']);
        ws.addRow(['Subject:', '', 'Subject Code:']);
        ws.addRow([]);
        ws.addRow(['NOTE:', 'Do NOT alter the column structure starting from Row 8. The system identifies students by Roll No ONLY. Header details above are for your reference only.']);
        ws.addRow([]);
        ws.addRow(['S.No', 'Roll No', 'Student Name', 'MID-1 Exam (15)', 'Quiz-1 (10)', 'Assign-1 (5)', 'Total', '', 'MID-2 Exam (15)', 'Quiz-2 (10)', 'Assign-2 (5)', 'Total']);
        // Add column widths
        ws.columns = [
            { width: 6 }, { width: 15 }, { width: 30 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 5 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 10 }
        ];
        res.setHeader('Content-Disposition', 'attachment; filename="MID_MARKS_TEMPLATE.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        workbook.xlsx.write(res).then(() => res.end());
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate template" });
    }
});
router.post('/mid-marks/bulk-import', requireInternalMarks, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        // Extract explicitly selected parameters from FormData
        const { branch, batch, semester, section, subjectCode, academicYear } = req.body;
        if (!branch || !batch || !semester || !subjectCode) {
            return res.status(400).json({ message: 'Missing required filtering parameters (branch, batch, semester, subjectCode) from the upload form.' });
        }
        let raw = [];
        const workbook = new ExcelJS.Workbook();
        if (req.file.originalname.match(/\.xlsx?$/)) {
            await workbook.xlsx.readFile(req.file.path);
            const worksheet = workbook.worksheets[0];
            worksheet.eachRow((row) => {
                const rowData = [];
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData[colNumber - 1] = cell.value;
                });
                raw.push(rowData);
            });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { students, midExams } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, like, or } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // --- Dynamically detect where the data starts to handle skipped empty rows ---
        let dataStartIndex = 7; // Default fallback
        for (let i = 0; i < raw.length; i++) {
            const firstCell = String(raw[i][0] || '').trim().toUpperCase();
            const secondCell = String(raw[i][1] || '').trim().toUpperCase();
            if (firstCell === 'S.NO' || secondCell === 'ROLL NO') {
                dataStartIndex = i + 1;
                break;
            }
        }
        const dataRows = raw.slice(dataStartIndex).filter((r) => r[1] && String(r[1]).trim() && /[A-Z0-9]/i.test(String(r[1])));
        if (dataRows.length === 0)
            return res.status(400).json({ message: 'No student data rows found.' });
        // Extract roll numbers
        const rollNumbers = dataRows.map((r) => String(r[1]).trim().toUpperCase());
        // Lookup all students mapped explicitly to the passed-in batch and branch, PLUS LATERALS
        const endYearMatch = String(batch).match(/-(\d{4})$/);
        const endYear = endYearMatch ? endYearMatch[1] : '';
        let conditions = [eq(students.branch, branch)];
        if (endYear) {
            conditions.push(or(eq(students.batch, batch), like(students.batch, `%-${endYear}`)));
        }
        else {
            conditions.push(eq(students.batch, batch));
        }
        if (section)
            conditions.push(eq(students.section, section));
        const allStudents = await db.select().from(students).where(and(...conditions));
        const studentMap = new Map(allStudents.map(s => [s.rollNumber?.toUpperCase() || '', s]));
        if (!studentMap.size)
            return res.status(400).json({ message: `No students found for ${branch} ${batch} ${section}. Ensure there are registered students in this branch before uploading marks.` });
        // Helper: get or create a midExam record using explicit values
        const getOrCreateExam = async (midType) => {
            let conditions = [
                eq(midExams.subjectCode, subjectCode),
                eq(midExams.branch, branch),
                eq(midExams.batch, batch),
                eq(midExams.semester, semester),
                eq(midExams.midType, midType)
            ];
            const existing = await db.select().from(midExams).where(and(...conditions));
            if (existing.length > 0)
                return existing[0];
            return await examcell_storage_1.storage.createMidExam({
                subjectCode, branch, batch, semester,
                midType, academicYear: academicYear || '', maxMarks: 30
            });
        };
        const enteredBy = req.user.id;
        let imported = 0, skipped = 0;
        const errors = [];
        if (req.file.originalname.endsWith('.pdf')) {
            // PDF PATH SPECIFICALLY FOR LAB MID EXAMS
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const pdfParseRaw = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
            const pdfParse = pdfParseRaw.default || pdfParseRaw;
            const pdfData = await pdfParse(fs.readFileSync(req.file.path));
            const labExam = await getOrCreateExam('LAB');
            // Regex to parse the Lab PDF format we generated from `pdfLabGenerator.ts`
            // Matches: S.No | Regd. No | DayToDay | Record | Test | Viva | Total | In Words
            // Typical row: 1 23JK1A0501 5 5 15 5 30 THIRTY
            const pdfRows = pdfData.text.split('\n');
            const rowRegex = /^(\d+)\s+([0-9A-Z]{10})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/i;
            for (const line of pdfRows) {
                const match = line.trim().match(rowRegex);
                if (!match)
                    continue;
                const [, sno, rollNo, day, rec, test, viva, total, words] = match;
                const student = studentMap.get(rollNo.toUpperCase());
                if (!student) {
                    skipped++;
                    errors.push(`Roll ${rollNo} not found`);
                    continue;
                }
                const dMark = Math.min(5, Math.max(0, parseInt(day) || 0));
                const rMark = Math.min(5, Math.max(0, parseInt(rec) || 0));
                const tMark = Math.min(15, Math.max(0, parseInt(test) || 0));
                const vMark = Math.min(5, Math.max(0, parseInt(viva) || 0));
                const fullTotal = Math.min(30, Math.max(0, parseInt(total) || 0));
                await examcell_storage_1.storage.bulkUpsertMidMarks([{
                        studentId: student.id, midExamId: labExam.id,
                        midExamMarks: 0, quizMarks: 0, assignmentMarks: 0, totalMarks: fullTotal,
                        labDailyMarks: dMark, labRecordMarks: rMark, labInternalMarks: tMark, labVivaMarks: vMark,
                        enteredBy
                    }]);
                imported++;
            }
        }
        else {
            // EXCEL PATH FOR STANDARD MID 1 & MID 2 EXAMS
            const mid1Exam = await getOrCreateExam('MID1');
            const mid2Exam = await getOrCreateExam('MID2');
            for (const row of dataRows) {
                const rollNo = String(row[1]).trim().toUpperCase();
                const student = studentMap.get(rollNo);
                if (!student) {
                    skipped++;
                    errors.push(`Roll ${rollNo} not found`);
                    continue;
                }
                // MID1 cols: col3=MidExam(A), col4=Quiz(B), col5=Assignment(C), col6=Total(D=A+B+C)
                const mid1ExamMarks = Math.min(15, Math.max(0, Math.round(Number(row[3]) || 0)));
                const mid1QuizMarks = Math.min(10, Math.max(0, Math.round(Number(row[4]) || 0)));
                const mid1AssignMarks = Math.min(5, Math.max(0, Math.round(Number(row[5]) || 0)));
                const mid1Total = mid1ExamMarks + mid1QuizMarks + mid1AssignMarks;
                // MID2 cols: col8=MidExam(E), col9=Quiz(F), col10=Assignment(G), col11=Total(H=E+F+G)
                const mid2ExamMarks = Math.min(15, Math.max(0, Math.round(Number(row[8]) || 0)));
                const mid2QuizMarks = Math.min(10, Math.max(0, Math.round(Number(row[9]) || 0)));
                const mid2AssignMarks = Math.min(5, Math.max(0, Math.round(Number(row[10]) || 0)));
                const mid2Total = mid2ExamMarks + mid2QuizMarks + mid2AssignMarks;
                await examcell_storage_1.storage.bulkUpsertMidMarks([{
                        studentId: student.id, midExamId: mid1Exam.id,
                        midExamMarks: mid1ExamMarks, quizMarks: mid1QuizMarks,
                        assignmentMarks: mid1AssignMarks, totalMarks: mid1Total,
                        labDailyMarks: 0, labRecordMarks: 0, labInternalMarks: 0, labVivaMarks: 0, enteredBy
                    }]);
                if (mid2ExamMarks > 0 || mid2QuizMarks > 0 || mid2AssignMarks > 0) {
                    await examcell_storage_1.storage.bulkUpsertMidMarks([{
                            studentId: student.id, midExamId: mid2Exam.id,
                            midExamMarks: mid2ExamMarks, quizMarks: mid2QuizMarks,
                            assignmentMarks: mid2AssignMarks, totalMarks: mid2Total,
                            labDailyMarks: 0, labRecordMarks: 0, labInternalMarks: 0, labVivaMarks: 0, enteredBy
                        }]);
                }
                imported++;
            }
        }
        // Clean up temp file
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        fs.unlinkSync(req.file.path);
        res.json({ success: true, imported, skipped, errors: errors.slice(0, 20), subjectCode, semester, branch, batch });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
router.get('/internal-marks/report', requireInternalMarks, async (req, res) => {
    try {
        const { branch, semester, subjectCode, batch, section } = req.query;
        if (!semester || !subjectCode || !batch) {
            return res.status(400).json({ message: "Missing required parameters" });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { subjects, students, midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, like, or, sql } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const [subjectRecord] = await db.select().from(subjects).where(eq(sql `UPPER(${subjects.subjectCode})`, String(subjectCode).toUpperCase()));
        const isDesignThinking = subjectRecord ? (subjectRecord.subjectName.toUpperCase().includes('DESIGN THINKING') || subjectRecord.subjectName.toUpperCase().includes('DTI')) : false;
        const endYearMatch = String(batch).match(/-(\d{4})$/);
        const endYear = endYearMatch ? endYearMatch[1] : '';
        const studentConditions = [
            endYear ? or(eq(students.batch, String(batch)), like(students.batch, `%-${endYear}`)) : eq(students.batch, String(batch))
        ];
        if (branch)
            studentConditions.push(eq(students.branch, String(branch)));
        if (section)
            studentConditions.push(eq(students.section, String(section)));
        excludeDetainedLeft(studentConditions, sql, students);
        const aggregatedRows = await db.select({
            studentId: students.id,
            rollNumber: students.rollNumber,
            name: students.name,
            // MID 1
            mid1Desc: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.midExamMarks} END)`.mapWith(Number),
            mid1Assgn: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.assignmentMarks} END)`.mapWith(Number),
            mid1Quiz: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.quizMarks} END)`.mapWith(Number),
            mid1Total: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
            // MID 2
            mid2Desc: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.midExamMarks} END)`.mapWith(Number),
            mid2Assgn: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.assignmentMarks} END)`.mapWith(Number),
            mid2Quiz: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.quizMarks} END)`.mapWith(Number),
            mid2Total: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
            mid2LabDaily: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.labDailyMarks} END)`.mapWith(Number),
            // LAB
            labDaily: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labDailyMarks} END)`.mapWith(Number),
            labRecord: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labRecordMarks} END)`.mapWith(Number),
            labTest: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labInternalMarks} END)`.mapWith(Number),
            labViva: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labVivaMarks} END)`.mapWith(Number),
            labTotal: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
        })
            .from(students)
            .leftJoin(midMarks, eq(midMarks.studentId, students.id))
            .leftJoin(midExams, and(eq(midExams.id, midMarks.midExamId), eq(midExams.batch, String(batch)), eq(midExams.semester, String(semester)), eq(sql `UPPER(${midExams.subjectCode})`, String(subjectCode).toUpperCase())))
            .where(and(...studentConditions))
            .groupBy(students.id, students.rollNumber, students.name)
            .orderBy(students.rollNumber);
        const reportData = aggregatedRows.map(s => {
            const m1Total = s.mid1Total !== 0 || s.mid1Desc !== 0 ? s.mid1Total : null;
            const m2Total = s.mid2Total !== 0 || s.mid2Desc !== 0 ? s.mid2Total : null;
            let best = null;
            let least = null;
            let finalInternal = null;
            let eightyPercent = null;
            let twentyPercent = null;
            if (m1Total !== null && m2Total !== null) {
                best = Math.max(m1Total, m2Total);
                least = Math.min(m1Total, m2Total);
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    const scaledSum = eightyPercent + twentyPercent;
                    finalInternal = Math.ceil(Number((scaledSum * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(eightyPercent + twentyPercent);
                }
            }
            else if (m1Total !== null) {
                best = m1Total;
                least = 0;
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    finalInternal = Math.ceil(Number((eightyPercent * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(m1Total);
                }
            }
            else if (m2Total !== null) {
                best = m2Total;
                least = 0;
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    finalInternal = Math.ceil(Number((eightyPercent * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(m2Total);
                }
            }
            return {
                rollNumber: s.rollNumber,
                name: s.name,
                isDesignThinking,
                labDayToDay: s.mid2LabDaily || null,
                mid1: m1Total !== null ? { desc: s.mid1Desc, assgn: s.mid1Assgn, quiz: s.mid1Quiz, total: s.mid1Total } : null,
                mid2: m2Total !== null ? { desc: s.mid2Desc, assgn: s.mid2Assgn, quiz: s.mid2Quiz, total: s.mid2Total } : null,
                lab: (s.labTotal !== null && (s.labTotal > 0 || s.labViva > 0 || s.labRecord > 0)) ? { dayToDay: s.labDaily, record: s.labRecord, internal: s.labTest, viva: s.labViva, total: s.labTotal } : null,
                calc: finalInternal !== null ? { best, least, eightyPercent, twentyPercent, finalInternal } : null
            };
        });
        // Sort by roll number naturally
        reportData.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
        console.log(`[Diagnostic] /api/internal-marks/report: Found ${reportData.length} students for branch ${branch}, batch ${batch}, section ${section}`);
        res.json(reportData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating internal marks report" });
    }
});
router.get('/internal-marks/excel', requireInternalMarks, async (req, res) => {
    try {
        const ExcelJS = require('exceljs');
        const { branch, semester, subjectCode, batch, section } = req.query;
        if (!semester || !subjectCode || !batch) {
            return res.status(400).json({ message: "Missing required parameters" });
        }
        // Duplicate the logic to get the report data
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { subjects, students, midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and, like, or, sql } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const [subjectRecord] = await db.select().from(subjects).where(eq(sql `UPPER(${subjects.subjectCode})`, String(subjectCode).toUpperCase()));
        const isDesignThinking = subjectRecord ? (subjectRecord.subjectName.toUpperCase().includes('DESIGN THINKING') || subjectRecord.subjectName.toUpperCase().includes('DTI')) : false;
        // Lateral match logic based on graduation year
        const endYearMatch = String(batch).match(/-(\d{4})$/);
        const endYear = endYearMatch ? endYearMatch[1] : '';
        const studentConditions = [
            endYear ? or(eq(students.batch, String(batch)), like(students.batch, `%-${endYear}`)) : eq(students.batch, String(batch))
        ];
        if (branch)
            studentConditions.push(eq(students.branch, String(branch)));
        if (section)
            studentConditions.push(eq(students.section, String(section)));
        excludeDetainedLeft(studentConditions, sql, students);
        const aggregatedRows = await db.select({
            studentId: students.id,
            rollNumber: students.rollNumber,
            name: students.name,
            // MID 1
            mid1Desc: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.midExamMarks} END)`.mapWith(Number),
            mid1Assgn: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.assignmentMarks} END)`.mapWith(Number),
            mid1Quiz: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.quizMarks} END)`.mapWith(Number),
            mid1Total: sql `MAX(CASE WHEN ${midExams.midType}='MID1' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
            // MID 2
            mid2Desc: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.midExamMarks} END)`.mapWith(Number),
            mid2Assgn: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.assignmentMarks} END)`.mapWith(Number),
            mid2Quiz: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.quizMarks} END)`.mapWith(Number),
            mid2Total: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
            mid2LabDaily: sql `MAX(CASE WHEN ${midExams.midType}='MID2' THEN ${midMarks.labDailyMarks} END)`.mapWith(Number),
            // LAB
            labDaily: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labDailyMarks} END)`.mapWith(Number),
            labRecord: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labRecordMarks} END)`.mapWith(Number),
            labTest: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labInternalMarks} END)`.mapWith(Number),
            labViva: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.labVivaMarks} END)`.mapWith(Number),
            labTotal: sql `MAX(CASE WHEN ${midExams.midType}='LAB' THEN ${midMarks.totalMarks} END)`.mapWith(Number),
        })
            .from(students)
            .leftJoin(midMarks, eq(midMarks.studentId, students.id))
            .leftJoin(midExams, and(eq(midExams.id, midMarks.midExamId), eq(midExams.batch, String(batch)), eq(midExams.semester, String(semester)), eq(sql `UPPER(${midExams.subjectCode})`, String(subjectCode).toUpperCase())))
            .where(and(...studentConditions))
            .groupBy(students.id, students.rollNumber, students.name)
            .orderBy(students.rollNumber);
        const reportData = aggregatedRows.map(s => {
            const m1Total = s.mid1Total !== 0 || s.mid1Desc !== 0 ? s.mid1Total : null;
            const m2Total = s.mid2Total !== 0 || s.mid2Desc !== 0 ? s.mid2Total : null;
            let best = null, least = null, eightyPercent = null, twentyPercent = null, finalInternal = null;
            if (m1Total !== null && m2Total !== null) {
                best = Math.max(m1Total, m2Total);
                least = Math.min(m1Total, m2Total);
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    const scaledSum = eightyPercent + twentyPercent;
                    finalInternal = Math.ceil(Number((scaledSum * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(eightyPercent + twentyPercent);
                }
            }
            else if (m1Total !== null) {
                best = m1Total;
                least = 0;
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    finalInternal = Math.ceil(Number((eightyPercent * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(m1Total);
                }
            }
            else if (m2Total !== null) {
                best = m2Total;
                least = 0;
                eightyPercent = Number((best * 0.8).toFixed(2));
                twentyPercent = Number((least * 0.2).toFixed(2));
                if (isDesignThinking) {
                    finalInternal = Math.ceil(Number((eightyPercent * 0.75).toFixed(2)) + (s.mid2LabDaily || 0));
                }
                else {
                    finalInternal = Math.round(m2Total);
                }
            }
            return {
                rollNumber: s.rollNumber,
                name: s.name,
                isDesignThinking,
                labDayToDay: s.mid2LabDaily || null,
                mid1: m1Total !== null ? { desc: s.mid1Desc, assgn: s.mid1Assgn, quiz: s.mid1Quiz, total: s.mid1Total } : { desc: '-', assgn: '-', quiz: '-', total: '-' },
                mid2: m2Total !== null ? { desc: s.mid2Desc, assgn: s.mid2Assgn, quiz: s.mid2Quiz, total: s.mid2Total } : { desc: '-', assgn: '-', quiz: '-', total: '-' },
                lab: (s.labTotal !== null && (s.labTotal > 0 || s.labViva > 0 || s.labRecord > 0)) ? { dayToDay: s.labDaily, record: s.labRecord, internal: s.labTest, viva: s.labViva, total: s.labTotal } : null,
                calc: finalInternal !== null ? { best, least, eightyPercent, twentyPercent, finalInternal } : { best: '-', least: '-', eightyPercent: '-', twentyPercent: '-', finalInternal: '-' }
            };
        }).sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Internal Marks');
        // Title & Headers
        worksheet.mergeCells('A1:O1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'INTERNAL MARKS CONSOLIDATED REPORT';
        titleCell.font = { size: 16, bold: true };
        titleCell.alignment = { horizontal: 'center' };
        worksheet.getCell('A3').value = `Branch: ${branch}`;
        worksheet.getCell('D3').value = `Batch: ${batch}`;
        worksheet.getCell('A4').value = `Semester: ${semester}`;
        worksheet.getCell('D4').value = `Subject: ${subjectCode}`;
        // Table Headers
        worksheet.mergeCells('A6:A7');
        worksheet.getCell('A6').value = 'S.No';
        worksheet.mergeCells('B6:B7');
        worksheet.getCell('B6').value = 'Roll No';
        worksheet.mergeCells('C6:C7');
        worksheet.getCell('C6').value = 'Student Name';
        worksheet.mergeCells('D6:G6');
        worksheet.getCell('D6').value = 'MID 1';
        worksheet.mergeCells('H6:K6');
        worksheet.getCell('H6').value = 'MID 2';
        worksheet.mergeCells('L6:M6');
        worksheet.getCell('L6').value = 'Best / Least';
        worksheet.mergeCells('N6:P6');
        worksheet.getCell('N6').value = 'Final Internal';
        const subHeaders = ['Desc', 'Assgn', 'Quiz', 'Total', 'Desc', 'Assgn', 'Quiz', 'Total', 'Best', 'Least', '80%', '20%', 'Final'];
        subHeaders.forEach((sh, i) => worksheet.getCell(7, 4 + i).value = sh);
        // Apply styles to headers
        for (let r = 6; r <= 7; r++) {
            for (let c = 1; c <= 16; c++) {
                const cell = worksheet.getCell(r, c);
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            }
        }
        // Populate Data
        let currentRow = 8;
        reportData.forEach((row, idx) => {
            const rowData = [
                idx + 1, row.rollNumber, row.name,
                row.mid1.desc, row.mid1.assgn, row.mid1.quiz, row.mid1.total,
                row.mid2.desc, row.mid2.assgn, row.mid2.quiz, row.mid2.total,
                row.calc.best, row.calc.least, row.calc.eightyPercent, row.calc.twentyPercent, row.calc.finalInternal
            ];
            worksheet.addRow(rowData);
            // Add borders to data cells
            for (let c = 1; c <= 16; c++) {
                const cell = worksheet.getCell(currentRow, c);
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (c !== 3)
                    cell.alignment = { horizontal: 'center' };
            }
            currentRow++;
        });
        // Set column widths
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 35;
        for (let i = 4; i <= 16; i++)
            worksheet.getColumn(i).width = 8;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Internal_Marks_Report_${batch}_${subjectCode}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating Excel" });
    }
});
// Add route to bulk update Lab Internal Marks exclusively
router.post('/internal-marks/lab/bulk', requireInternalMarks, async (req, res) => {
    try {
        const { semester, branch, subjectCode, batch, updates } = req.body;
        const adminId = req.user?.id;
        if (!adminId)
            return res.status(401).json({ message: "Not authenticated" });
        if (!updates || !Array.isArray(updates))
            return res.status(400).json({ message: "Invalid updates payload" });
        const hasNegative = updates.some(m => (m.labDailyMarks ?? 0) < 0 || (m.labRecordMarks ?? 0) < 0 || (m.labInternalMarks ?? 0) < 0 ||
            (m.labVivaMarks ?? 0) < 0 || (m.prcAssessmentMarks ?? 0) < 0 || (m.reportMarks ?? 0) < 0 ||
            (m.seminarMarks ?? 0) < 0);
        if (hasNegative) {
            return res.status(400).json({ message: "Marks cannot be negative. Please correct the entered marks and try again." });
        }
        const { db } = await Promise.resolve().then(() => __importStar(require('./examcell.db')));
        const { midExams, midMarks } = await Promise.resolve().then(() => __importStar(require('./examcell.schema')));
        const { eq, and } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        // Find or create a singular "LAB" midExam context for these marks
        let exams = await db.select().from(midExams).where(and(eq(midExams.semester, String(semester)), eq(midExams.branch, String(branch)), eq(midExams.subjectCode, String(subjectCode)), eq(midExams.batch, String(batch)), eq(midExams.midType, "LAB")));
        const user = req.user;
        const canOverride = user.isAdmin || user.username === 'examcell';
        if (exams.length > 0 && !canOverride && (exams[0].isFrozen || exams[0].isFinalLocked)) {
            return res.status(403).json({ message: "Marks for this subject are frozen and cannot be modified." });
        }
        let labExamId;
        if (exams.length === 0) {
            // Create the LAB context record since Lab doesn't have MID1/MID2 distinctly in this DB flow
            const [newExam] = await db.insert(midExams).values({
                academicYear: "2024", // Hardcoded fallback or should be derived
                semester: String(semester),
                branch: String(branch),
                batch: String(batch),
                subjectCode: String(subjectCode),
                midType: "LAB",
                maxMarks: 30
            }).returning();
            labExamId = newExam.id;
        }
        else {
            labExamId = exams[0].id;
        }
        // Fetch global auto-lock setting
        const labGlobalSettings = await examcell_storage_1.storage.getGlobalSettings();
        const labShouldLock = labGlobalSettings.autoLockOnSave;
        // Check row-level locks before inserting to see if any are being overridden
        const { inArray } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const studentIds = updates.map((u) => u.studentId);
        const lockedRows = await db.select().from(midMarks)
            .where(and(eq(midMarks.midExamId, labExamId), eq(midMarks.isLocked, true), inArray(midMarks.studentId, studentIds)));
        if (lockedRows.length > 0) {
            if (!canOverride) {
                return res.status(403).json({ message: "One or more student marks are already locked and cannot be modified. Please refresh the page." });
            }
            else {
                // Admin override: Record audit logs for each locked row they modify
                for (const locked of lockedRows) {
                    await examcell_storage_1.storage.insertAuditLog({
                        actionType: 'ADMIN_OVERRIDE_MARKS',
                        entityType: 'MID_MARK',
                        entityId: locked.id,
                        performedBy: adminId,
                        reason: 'Admin/Examcell modified already frozen/locked lab marks via direct edit.'
                    });
                }
            }
        }
        for (const update of updates) {
            await db.insert(midMarks).values({
                studentId: update.studentId,
                midExamId: labExamId,
                labDailyMarks: update.labDailyMarks || 0,
                labRecordMarks: update.labRecordMarks || 0,
                labInternalMarks: update.labInternalMarks || 0,
                labVivaMarks: update.labVivaMarks || 0,
                prcAssessmentMarks: update.prcAssessmentMarks || 0,
                reportMarks: update.reportMarks || 0,
                seminarMarks: update.seminarMarks || 0,
                totalMarks: update.totalMarks || 0,
                enteredBy: adminId,
                isLocked: labShouldLock,
                lockedAt: labShouldLock ? new Date() : null
            }).onConflictDoUpdate({
                target: [midMarks.studentId, midMarks.midExamId],
                set: {
                    labDailyMarks: update.labDailyMarks || 0,
                    labRecordMarks: update.labRecordMarks || 0,
                    labInternalMarks: update.labInternalMarks || 0,
                    labVivaMarks: update.labVivaMarks || 0,
                    prcAssessmentMarks: update.prcAssessmentMarks || 0,
                    reportMarks: update.reportMarks || 0,
                    seminarMarks: update.seminarMarks || 0,
                    totalMarks: update.totalMarks || 0,
                    enteredBy: adminId,
                    isLocked: labShouldLock,
                    lockedAt: labShouldLock ? new Date() : null,
                    updatedAt: new Date()
                }
            });
        }
        // Note: We no longer set isFinalLocked here because 
        // one midExam spans multiple sections of the same branch.
        // Instead, we rely entirely on row-level locks.
        res.status(200).json({ message: "Lab marks saved successfully" });
    }
    catch (err) {
        console.error("Bulk lab marks error:", err);
        res.status(500).json({ message: "Failed to update lab marks" });
    }
});
router.use('/', promotion_routes_1.default);
async function seedDatabase() {
    const existingAdmin = await examcell_storage_1.storage.getAdminByUsername("admin");
    if (!existingAdmin) {
        const hashedPassword = await bcrypt_1.default.hash("admin123", 10);
        await examcell_storage_1.storage.createAdmin({
            username: "admin",
            password: hashedPassword,
            isAdmin: true,
            canUpload: true,
            canManageSettings: true,
            canManageAcademics: true,
            canManageInternalMarks: true,
            canViewDashboard: true,
            canViewStudents: true,
            canViewReports: true,
            canFreezeMarks: true,
            loginType: 'GLOBAL',
            allowedIps: ''
        });
        console.log("Seeded admin: admin / admin123");
    }
    else if (!existingAdmin.isAdmin || !existingAdmin.canUpload || !existingAdmin.canManageSettings) {
        // Escalate privileges if 'admin' got demoted or originated from older schema
        await examcell_storage_1.storage.updateAdmin(existingAdmin.id, {
            isAdmin: true,
            canUpload: true,
            canManageSettings: true,
            canManageAcademics: true,
            canManageInternalMarks: true,
            canViewDashboard: true,
            canViewStudents: true,
            canViewReports: true,
            canFreezeMarks: true,
            loginType: 'GLOBAL',
            allowedIps: ''
        });
        console.log("Enforced super-admin privileges for 'admin' account.");
    }
}
exports.default = router;
