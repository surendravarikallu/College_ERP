"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.errorSchemas = void 0;
exports.buildUrl = buildUrl;
const zod_1 = require("zod");
exports.errorSchemas = {
    validation: zod_1.z.object({
        message: zod_1.z.string(),
        field: zod_1.z.string().optional(),
    }),
    unauthorized: zod_1.z.object({
        message: zod_1.z.string(),
    }),
    notFound: zod_1.z.object({
        message: zod_1.z.string(),
    }),
    internal: zod_1.z.object({
        message: zod_1.z.string(),
    }),
};
exports.api = {
    auth: {
        login: {
            method: 'POST',
            path: '/api/auth/login',
            input: zod_1.z.object({
                username: zod_1.z.string(),
                password: zod_1.z.string(),
            }),
            responses: {
                200: zod_1.z.object({
                    user: zod_1.z.object({
                        id: zod_1.z.number(),
                        username: zod_1.z.string(),
                        isAdmin: zod_1.z.boolean().optional(),
                        canUpload: zod_1.z.boolean().optional(),
                        canManageSettings: zod_1.z.boolean().optional(),
                        canManageAcademics: zod_1.z.boolean().optional(),
                        canManageInternalMarks: zod_1.z.boolean().optional(),
                        canViewDashboard: zod_1.z.boolean().optional(),
                        canViewStudents: zod_1.z.boolean().optional(),
                        canViewReports: zod_1.z.boolean().optional(),
                        canFreezeMarks: zod_1.z.boolean().optional()
                    }),
                    token: zod_1.z.string(),
                }),
                401: exports.errorSchemas.unauthorized,
            },
        },
        me: {
            method: 'GET',
            path: '/api/auth/me',
            responses: {
                200: zod_1.z.object({
                    user: zod_1.z.object({
                        id: zod_1.z.number(),
                        username: zod_1.z.string(),
                        isAdmin: zod_1.z.boolean().optional(),
                        canUpload: zod_1.z.boolean().optional(),
                        canManageSettings: zod_1.z.boolean().optional(),
                        canManageAcademics: zod_1.z.boolean().optional(),
                        canManageInternalMarks: zod_1.z.boolean().optional(),
                        canViewDashboard: zod_1.z.boolean().optional(),
                        canViewStudents: zod_1.z.boolean().optional(),
                        canViewReports: zod_1.z.boolean().optional(),
                        canFreezeMarks: zod_1.z.boolean().optional()
                    }),
                }),
                401: exports.errorSchemas.unauthorized,
            },
        },
        logout: {
            method: 'POST',
            path: '/api/auth/logout',
            responses: {
                200: zod_1.z.object({ message: zod_1.z.string() }),
            }
        }
    },
    upload: {
        results: {
            method: 'POST',
            path: '/api/upload/results',
            // Input is multipart/form-data
            responses: {
                200: zod_1.z.object({
                    message: zod_1.z.string(),
                    processed: zod_1.z.number(),
                    skipped: zod_1.z.number(),
                    errors: zod_1.z.array(zod_1.z.string()).optional(),
                }),
                400: exports.errorSchemas.validation,
            },
        },
        preview: {
            method: 'POST',
            path: '/api/upload/preview',
            // Input is multipart/form-data
            responses: {
                200: zod_1.z.object({
                    totalParsed: zod_1.z.number(),
                    matchedCount: zod_1.z.number(),
                    skippedCount: zod_1.z.number(),
                    previewRows: zod_1.z.array(zod_1.z.any()),
                }),
                400: exports.errorSchemas.validation,
            },
        },
        students: {
            method: 'POST',
            path: '/api/upload/students',
            responses: {
                200: zod_1.z.object({
                    message: zod_1.z.string(),
                    processed: zod_1.z.number(),
                    errors: zod_1.z.array(zod_1.z.string()).optional(),
                }),
                400: exports.errorSchemas.validation,
            },
        },
        search: {
            method: 'GET',
            path: '/api/students',
            input: zod_1.z.object({
                query: zod_1.z.string(), // Roll number or name
            }).optional(),
            responses: {
                200: zod_1.z.object({
                    data: zod_1.z.array(zod_1.z.any()),
                    total: zod_1.z.number(),
                    page: zod_1.z.number(),
                    totalPages: zod_1.z.number()
                }),
            },
        },
        get: {
            method: 'GET',
            path: '/api/students/:id',
            responses: {
                200: zod_1.z.any(), // StudentDetails
                404: exports.errorSchemas.notFound,
            },
        },
    },
    reports: {
        backlog: {
            method: 'GET',
            path: '/api/reports/backlogs',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                semester: zod_1.z.string().optional(),
                academicYear: zod_1.z.string().optional(),
            }).optional(),
            responses: {
                200: zod_1.z.array(zod_1.z.any()), // Backlog student details
            },
        },
        cumulative: {
            method: 'GET',
            path: '/api/reports/cumulative-backlogs',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                batch: zod_1.z.string().optional(),
            }).optional(),
            responses: {
                200: zod_1.z.array(zod_1.z.any()), // Cumulative backlog student details
            },
        },
        batchTranscripts: {
            method: 'GET',
            path: '/api/reports/batch-transcripts',
            input: zod_1.z.object({
                branch: zod_1.z.string(),
                batch: zod_1.z.string(),
            }).optional(),
            responses: {
                200: zod_1.z.array(zod_1.z.any()), // StudentDetails array
            },
        },
        cumulativeResults: {
            method: 'GET',
            path: '/api/reports/cumulative-results',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                batch: zod_1.z.string().optional(),
                year: zod_1.z.string().optional(),
            }).optional(),
            responses: {
                200: zod_1.z.any(), // Summary, Passed List, Failed List
            },
        },
        toppers: {
            method: 'GET',
            path: '/api/reports/toppers',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                batch: zod_1.z.string().optional(),
                type: zod_1.z.string(), // "Semester" | "Year"
                semester: zod_1.z.string().optional(),
                year: zod_1.z.string().optional(),
                topN: zod_1.z.number().optional(),
            }).optional(),
            responses: {
                200: zod_1.z.array(zod_1.z.any()), // Top students ranking list
            },
        },
        analytics: {
            method: 'GET',
            path: '/api/reports/analytics',
            responses: {
                200: zod_1.z.object({
                    branchWiseBacklogs: zod_1.z.array(zod_1.z.object({
                        name: zod_1.z.string(),
                        value: zod_1.z.number(),
                        batches: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), value: zod_1.z.number() }))
                    })),
                    passPercentage: zod_1.z.number(),
                    mostFailedSubjects: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), count: zod_1.z.number() })),
                }),
            },
        },
        consolidated: {
            method: 'GET',
            path: '/api/reports/consolidated',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                semester: zod_1.z.string().optional(),
                academicYear: zod_1.z.string().optional(),
                regulation: zod_1.z.string().optional(),
                batch: zod_1.z.string().optional(),
                program: zod_1.z.string().optional(),
                section: zod_1.z.string().optional(),
            }).optional(),
            responses: {
                200: zod_1.z.any(),
            },
        },
    },
    admins: {
        list: {
            method: 'GET',
            path: '/api/admins',
            responses: {
                200: zod_1.z.array(zod_1.z.object({
                    id: zod_1.z.number(),
                    username: zod_1.z.string(),
                    isAdmin: zod_1.z.boolean(),
                    canUpload: zod_1.z.boolean(),
                    canManageSettings: zod_1.z.boolean(),
                    canManageAcademics: zod_1.z.boolean(),
                    canManageInternalMarks: zod_1.z.boolean(),
                    canViewDashboard: zod_1.z.boolean(),
                    canViewStudents: zod_1.z.boolean(),
                    canViewReports: zod_1.z.boolean(),
                    canFreezeMarks: zod_1.z.boolean(),
                    loginType: zod_1.z.string().optional(),
                    allowedIps: zod_1.z.string().optional()
                })),
            },
        },
        create: {
            method: 'POST',
            path: '/api/admins',
            input: zod_1.z.object({
                username: zod_1.z.string().min(3),
                password: zod_1.z.string().min(6),
                isAdmin: zod_1.z.boolean().optional().default(false),
                canUpload: zod_1.z.boolean().optional().default(false),
                canManageSettings: zod_1.z.boolean().optional().default(false),
                canManageAcademics: zod_1.z.boolean().optional().default(false),
                canManageInternalMarks: zod_1.z.boolean().optional().default(false),
                canViewDashboard: zod_1.z.boolean().optional().default(true),
                canViewStudents: zod_1.z.boolean().optional().default(true),
                canViewReports: zod_1.z.boolean().optional().default(true),
                canFreezeMarks: zod_1.z.boolean().optional().default(false),
                loginType: zod_1.z.string().optional().default("GLOBAL"),
                allowedIps: zod_1.z.string().optional().default(""),
            }),
            responses: {
                200: zod_1.z.object({
                    id: zod_1.z.number(),
                    username: zod_1.z.string(),
                    isAdmin: zod_1.z.boolean(),
                    canUpload: zod_1.z.boolean(),
                    canManageSettings: zod_1.z.boolean(),
                    canManageAcademics: zod_1.z.boolean(),
                    canManageInternalMarks: zod_1.z.boolean(),
                    canViewDashboard: zod_1.z.boolean(),
                    canViewStudents: zod_1.z.boolean(),
                    canViewReports: zod_1.z.boolean(),
                    canFreezeMarks: zod_1.z.boolean(),
                    loginType: zod_1.z.string().optional(),
                    allowedIps: zod_1.z.string().optional()
                }),
                400: exports.errorSchemas.validation,
            },
        },
        update: {
            method: 'PUT',
            path: '/api/admins/:id',
            input: zod_1.z.object({
                username: zod_1.z.string().min(3),
                password: zod_1.z.string().min(6).optional(),
                isAdmin: zod_1.z.boolean().optional(),
                canUpload: zod_1.z.boolean().optional(),
                canManageSettings: zod_1.z.boolean().optional(),
                canManageAcademics: zod_1.z.boolean().optional(),
                canManageInternalMarks: zod_1.z.boolean().optional(),
                canViewDashboard: zod_1.z.boolean().optional(),
                canViewStudents: zod_1.z.boolean().optional(),
                canViewReports: zod_1.z.boolean().optional(),
                canFreezeMarks: zod_1.z.boolean().optional(),
                loginType: zod_1.z.string().optional(),
                allowedIps: zod_1.z.string().optional()
            }),
            responses: {
                200: zod_1.z.object({
                    id: zod_1.z.number(),
                    username: zod_1.z.string(),
                    isAdmin: zod_1.z.boolean(),
                    canUpload: zod_1.z.boolean(),
                    canManageSettings: zod_1.z.boolean(),
                    canManageAcademics: zod_1.z.boolean(),
                    canManageInternalMarks: zod_1.z.boolean(),
                    canViewDashboard: zod_1.z.boolean(),
                    canViewStudents: zod_1.z.boolean(),
                    canViewReports: zod_1.z.boolean(),
                    canFreezeMarks: zod_1.z.boolean(),
                    loginType: zod_1.z.string().optional(),
                    allowedIps: zod_1.z.string().optional()
                }),
                400: exports.errorSchemas.validation,
                404: exports.errorSchemas.notFound,
            },
        },
        delete: {
            method: 'DELETE',
            path: '/api/admins/:id',
            responses: {
                200: zod_1.z.object({ success: zod_1.z.boolean() }),
                404: exports.errorSchemas.notFound,
            },
        },
    },
    promotion: {
        eligible: {
            method: 'POST',
            path: '/api/promotion/eligible',
            input: zod_1.z.object({
                branch: zod_1.z.string().optional(),
                batch: zod_1.z.string().optional(),
                academicYear: zod_1.z.string().optional(),
                semester: zod_1.z.string().optional(),
                section: zod_1.z.string().optional()
            }).optional(),
            responses: { 200: zod_1.z.object({ students: zod_1.z.array(zod_1.z.any()) }) }
        },
        promote: {
            method: 'POST',
            path: '/api/promotion/promote',
            input: zod_1.z.object({
                studentIds: zod_1.z.array(zod_1.z.number()),
                target: zod_1.z.object({ academicYear: zod_1.z.string(), semester: zod_1.z.string() }),
                reason: zod_1.z.string().optional()
            }),
            responses: { 200: zod_1.z.object({ message: zod_1.z.string() }) }
        },
        demote: {
            method: 'POST',
            path: '/api/promotion/demote',
            input: zod_1.z.object({
                studentIds: zod_1.z.array(zod_1.z.number()),
                reason: zod_1.z.string().optional()
            }),
            responses: { 200: zod_1.z.object({ message: zod_1.z.string() }) }
        },
        detain: {
            method: 'POST',
            path: '/api/promotion/detain',
            input: zod_1.z.object({
                studentIds: zod_1.z.array(zod_1.z.number()),
                target: zod_1.z.object({ academicYear: zod_1.z.string(), semester: zod_1.z.string() }),
                reason: zod_1.z.string().optional()
            }),
            responses: { 200: zod_1.z.object({ message: zod_1.z.string() }) }
        },
        leave: {
            method: 'POST',
            path: '/api/promotion/leave',
            input: zod_1.z.object({
                studentIds: zod_1.z.array(zod_1.z.number()),
                reason: zod_1.z.string().optional()
            }),
            responses: { 200: zod_1.z.object({ message: zod_1.z.string() }) }
        }
    },
    faculty: {
        list: {
            method: 'GET',
            path: '/api/faculty',
            responses: { 200: zod_1.z.array(zod_1.z.any()) },
        },
        create: {
            method: 'POST',
            path: '/api/faculty',
            input: zod_1.z.object({
                facultyName: zod_1.z.string().min(1),
                department: zod_1.z.string().optional(),
                designation: zod_1.z.string().optional(),
            }),
            responses: { 200: zod_1.z.any(), 400: exports.errorSchemas.validation },
        },
        update: {
            method: 'PUT',
            path: '/api/faculty/:id',
            input: zod_1.z.object({
                facultyName: zod_1.z.string().min(1).optional(),
                department: zod_1.z.string().optional(),
                designation: zod_1.z.string().optional(),
            }),
            responses: { 200: zod_1.z.any(), 404: exports.errorSchemas.notFound },
        },
        delete: {
            method: 'DELETE',
            path: '/api/faculty/:id',
            responses: { 200: zod_1.z.object({ success: zod_1.z.boolean() }), 404: exports.errorSchemas.notFound },
        },
    },
    facultyMapping: {
        list: {
            method: 'GET',
            path: '/api/faculty-mapping',
            responses: { 200: zod_1.z.array(zod_1.z.any()) },
        },
        create: {
            method: 'POST',
            path: '/api/faculty-mapping',
            input: zod_1.z.object({
                facultyId: zod_1.z.number(),
                subjectCode: zod_1.z.string(),
                semester: zod_1.z.string(),
                branch: zod_1.z.string(),
                batch: zod_1.z.string(),
                academicYear: zod_1.z.string(),
                section: zod_1.z.string().optional(),
            }),
            responses: { 200: zod_1.z.any(), 400: exports.errorSchemas.validation },
        },
        delete: {
            method: 'DELETE',
            path: '/api/faculty-mapping/:id',
            responses: { 200: zod_1.z.object({ success: zod_1.z.boolean() }), 404: exports.errorSchemas.notFound },
        },
    },
    internalMarks: {
        finalFreeze: {
            method: 'POST',
            path: '/api/internal-marks/final-freeze',
            input: zod_1.z.object({
                examId: zod_1.z.number()
            }),
            responses: { 200: zod_1.z.object({ success: zod_1.z.boolean(), message: zod_1.z.string() }) },
        },
        unfreezeExam: {
            method: 'POST',
            path: '/api/internal-marks/unlock-subject',
            input: zod_1.z.object({
                examId: zod_1.z.number(),
                reason: zod_1.z.string().min(1)
            }),
            responses: { 200: zod_1.z.object({ success: zod_1.z.boolean(), message: zod_1.z.string() }) },
        },
        unlockRow: {
            method: 'POST',
            path: '/api/internal-marks/unlock-row',
            input: zod_1.z.object({
                studentId: zod_1.z.number(),
                midExamId: zod_1.z.number(),
                reason: zod_1.z.string().min(1)
            }),
            responses: { 200: zod_1.z.object({ success: zod_1.z.boolean(), message: zod_1.z.string() }) },
        }
    }
};
function buildUrl(path, params) {
    let url = path;
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (url.includes(`:${key}`)) {
                url = url.replace(`:${key}`, String(value));
            }
        });
    }
    return url;
}
