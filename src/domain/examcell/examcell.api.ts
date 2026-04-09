import { z } from 'zod';
import { insertAdminSchema, insertStudentSchema, insertSubjectSchema, insertResultSchema } from './examcell.schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            username: z.string(),
            isAdmin: z.boolean().optional(),
            canUpload: z.boolean().optional(),
            canManageSettings: z.boolean().optional(),
            canManageAcademics: z.boolean().optional(),
            canManageInternalMarks: z.boolean().optional(),
            canViewDashboard: z.boolean().optional(),
            canViewStudents: z.boolean().optional(),
            canViewReports: z.boolean().optional(),
            canFreezeMarks: z.boolean().optional()
          }),
          token: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            username: z.string(),
            isAdmin: z.boolean().optional(),
            canUpload: z.boolean().optional(),
            canManageSettings: z.boolean().optional(),
            canManageAcademics: z.boolean().optional(),
            canManageInternalMarks: z.boolean().optional(),
            canViewDashboard: z.boolean().optional(),
            canViewStudents: z.boolean().optional(),
            canViewReports: z.boolean().optional(),
            canFreezeMarks: z.boolean().optional()
          }),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  upload: {
    results: {
      method: 'POST' as const,
      path: '/api/upload/results' as const,
      // Input is multipart/form-data
      responses: {
        200: z.object({
          message: z.string(),
          processed: z.number(),
          skipped: z.number(),
          errors: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    preview: {
      method: 'POST' as const,
      path: '/api/upload/preview' as const,
      // Input is multipart/form-data
      responses: {
        200: z.object({
          totalParsed: z.number(),
          matchedCount: z.number(),
          skippedCount: z.number(),
          previewRows: z.array(z.any()),
        }),
        400: errorSchemas.validation,
      },
    },
    students: {
      method: 'POST' as const,
      path: '/api/upload/students' as const,
      responses: {
        200: z.object({
          message: z.string(),
          processed: z.number(),
          errors: z.array(z.string()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/students' as const,
      input: z.object({
        query: z.string(), // Roll number or name
      }).optional(),
      responses: {
        200: z.object({
          data: z.array(z.any()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number()
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/students/:id' as const,
      responses: {
        200: z.any(), // StudentDetails
        404: errorSchemas.notFound,
      },
    },
  },
  reports: {
    backlog: {
      method: 'GET' as const,
      path: '/api/reports/backlogs' as const,
      input: z.object({
        branch: z.string().optional(),
        semester: z.string().optional(),
        academicYear: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Backlog student details
      },
    },
    cumulative: {
      method: 'GET' as const,
      path: '/api/reports/cumulative-backlogs' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Cumulative backlog student details
      },
    },
    batchTranscripts: {
      method: 'GET' as const,
      path: '/api/reports/batch-transcripts' as const,
      input: z.object({
        branch: z.string(),
        batch: z.string(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // StudentDetails array
      },
    },
    cumulativeResults: {
      method: 'GET' as const,
      path: '/api/reports/cumulative-results' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
        year: z.string().optional(),
      }).optional(),
      responses: {
        200: z.any(), // Summary, Passed List, Failed List
      },
    },
    toppers: {
      method: 'GET' as const,
      path: '/api/reports/toppers' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
        type: z.string(), // "Semester" | "Year"
        semester: z.string().optional(),
        year: z.string().optional(),
        topN: z.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Top students ranking list
      },
    },
    analytics: {
      method: 'GET' as const,
      path: '/api/reports/analytics' as const,
      responses: {
        200: z.object({
          branchWiseBacklogs: z.array(z.object({
            name: z.string(),
            value: z.number(),
            batches: z.array(z.object({ name: z.string(), value: z.number() }))
          })),
          passPercentage: z.number(),
          mostFailedSubjects: z.array(z.object({ name: z.string(), count: z.number() })),
        }),
      },
    },
    consolidated: {
      method: 'GET' as const,
      path: '/api/reports/consolidated' as const,
      input: z.object({
        branch: z.string().optional(),
        semester: z.string().optional(),
        academicYear: z.string().optional(),
        regulation: z.string().optional(),
        batch: z.string().optional(),
        program: z.string().optional(),
        section: z.string().optional(),
      }).optional(),
      responses: {
        200: z.any(),
      },
    },
  },
  admins: {
    list: {
      method: 'GET' as const,
      path: '/api/admins' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          username: z.string(),
          isAdmin: z.boolean(),
          canUpload: z.boolean(),
          canManageSettings: z.boolean(),
          canManageAcademics: z.boolean(),
          canManageInternalMarks: z.boolean(),
          canViewDashboard: z.boolean(),
          canViewStudents: z.boolean(),
          canViewReports: z.boolean(),
          canFreezeMarks: z.boolean(),
          loginType: z.string().optional(),
          allowedIps: z.string().optional()
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/admins' as const,
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        isAdmin: z.boolean().optional().default(false),
        canUpload: z.boolean().optional().default(false),
        canManageSettings: z.boolean().optional().default(false),
        canManageAcademics: z.boolean().optional().default(false),
        canManageInternalMarks: z.boolean().optional().default(false),
        canViewDashboard: z.boolean().optional().default(true),
        canViewStudents: z.boolean().optional().default(true),
        canViewReports: z.boolean().optional().default(true),
        canFreezeMarks: z.boolean().optional().default(false),
        loginType: z.string().optional().default("GLOBAL"),
        allowedIps: z.string().optional().default(""),
      }),
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          isAdmin: z.boolean(),
          canUpload: z.boolean(),
          canManageSettings: z.boolean(),
          canManageAcademics: z.boolean(),
          canManageInternalMarks: z.boolean(),
          canViewDashboard: z.boolean(),
          canViewStudents: z.boolean(),
          canViewReports: z.boolean(),
          canFreezeMarks: z.boolean(),
          loginType: z.string().optional(),
          allowedIps: z.string().optional()
        }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/admins/:id' as const,
      input: z.object({
        username: z.string().min(3),
        password: z.string().min(6).optional(),
        isAdmin: z.boolean().optional(),
        canUpload: z.boolean().optional(),
        canManageSettings: z.boolean().optional(),
        canManageAcademics: z.boolean().optional(),
        canManageInternalMarks: z.boolean().optional(),
        canViewDashboard: z.boolean().optional(),
        canViewStudents: z.boolean().optional(),
        canViewReports: z.boolean().optional(),
        canFreezeMarks: z.boolean().optional(),
        loginType: z.string().optional(),
        allowedIps: z.string().optional()
      }),
      responses: {
        200: z.object({
          id: z.number(),
          username: z.string(),
          isAdmin: z.boolean(),
          canUpload: z.boolean(),
          canManageSettings: z.boolean(),
          canManageAcademics: z.boolean(),
          canManageInternalMarks: z.boolean(),
          canViewDashboard: z.boolean(),
          canViewStudents: z.boolean(),
          canViewReports: z.boolean(),
          canFreezeMarks: z.boolean(),
          loginType: z.string().optional(),
          allowedIps: z.string().optional()
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/admins/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
  },
  promotion: {
    eligible: {
      method: 'POST' as const,
      path: '/api/promotion/eligible' as const,
      input: z.object({
        branch: z.string().optional(),
        batch: z.string().optional(),
        academicYear: z.string().optional(),
        semester: z.string().optional(),
        section: z.string().optional()
      }).optional(),
      responses: { 200: z.object({ students: z.array(z.any()) }) }
    },
    promote: {
      method: 'POST' as const,
      path: '/api/promotion/promote' as const,
      input: z.object({
        studentIds: z.array(z.number()),
        target: z.object({ academicYear: z.string(), semester: z.string() }),
        reason: z.string().optional()
      }),
      responses: { 200: z.object({ message: z.string() }) }
    },
    demote: {
      method: 'POST' as const,
      path: '/api/promotion/demote' as const,
      input: z.object({
        studentIds: z.array(z.number()),
        reason: z.string().optional()
      }),
      responses: { 200: z.object({ message: z.string() }) }
    },
    detain: {
      method: 'POST' as const,
      path: '/api/promotion/detain' as const,
      input: z.object({
        studentIds: z.array(z.number()),
        target: z.object({ academicYear: z.string(), semester: z.string() }),
        reason: z.string().optional()
      }),
      responses: { 200: z.object({ message: z.string() }) }
    },
    leave: {
      method: 'POST' as const,
      path: '/api/promotion/leave' as const,
      input: z.object({
        studentIds: z.array(z.number()),
        reason: z.string().optional()
      }),
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  faculty: {
    list: {
      method: 'GET' as const,
      path: '/api/faculty' as const,
      responses: { 200: z.array(z.any()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/faculty' as const,
      input: z.object({
        facultyName: z.string().min(1),
        department: z.string().optional(),
        designation: z.string().optional(),
      }),
      responses: { 200: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/faculty/:id' as const,
      input: z.object({
        facultyName: z.string().min(1).optional(),
        department: z.string().optional(),
        designation: z.string().optional(),
      }),
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/faculty/:id' as const,
      responses: { 200: z.object({ success: z.boolean() }), 404: errorSchemas.notFound },
    },
  },
  facultyMapping: {
    list: {
      method: 'GET' as const,
      path: '/api/faculty-mapping' as const,
      responses: { 200: z.array(z.any()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/faculty-mapping' as const,
      input: z.object({
        facultyId: z.number(),
        subjectCode: z.string(),
        semester: z.string(),
        branch: z.string(),
        batch: z.string(),
        academicYear: z.string(),
        section: z.string().optional(),
      }),
      responses: { 200: z.any(), 400: errorSchemas.validation },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/faculty-mapping/:id' as const,
      responses: { 200: z.object({ success: z.boolean() }), 404: errorSchemas.notFound },
    },
  },
  internalMarks: {
    finalFreeze: {
      method: 'POST' as const,
      path: '/api/internal-marks/final-freeze' as const,
      input: z.object({
        examId: z.number()
      }),
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }) },
    },
    unfreezeExam: {
      method: 'POST' as const,
      path: '/api/internal-marks/unlock-subject' as const,
      input: z.object({
        examId: z.number(),
        reason: z.string().min(1)
      }),
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }) },
    },
    unlockRow: {
      method: 'POST' as const,
      path: '/api/internal-marks/unlock-row' as const,
      input: z.object({
        studentId: z.number(),
        midExamId: z.number(),
        reason: z.string().min(1)
      }),
      responses: { 200: z.object({ success: z.boolean(), message: z.string() }) },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
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

