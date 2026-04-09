"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicsService = void 0;
const prisma_client_1 = require("../../core/database/prisma.client");
const api_error_1 = require("../../core/common/exceptions/api.error");
class AcademicsService {
    // ==================== DEPARTMENTS ====================
    static async createDepartment(tenantId, data) {
        return prisma_client_1.prisma.department.create({
            data: { institutionId: tenantId, name: data.name }
        });
    }
    static async listDepartments(tenantId) {
        return prisma_client_1.prisma.department.findMany({
            where: { institutionId: tenantId },
            include: { courses: { include: { _count: { select: { batches: true } } } }, _count: { select: { faculties: true } } },
            orderBy: { name: 'asc' }
        });
    }
    static async updateDepartment(tenantId, id, data) {
        const dept = await prisma_client_1.prisma.department.findFirst({ where: { id, institutionId: tenantId } });
        if (!dept)
            throw new api_error_1.APIError('NOT_FOUND', 'Department not found in this institution.');
        return prisma_client_1.prisma.department.update({ where: { id }, data: { name: data.name } });
    }
    static async deleteDepartment(tenantId, id) {
        const dept = await prisma_client_1.prisma.department.findFirst({ where: { id, institutionId: tenantId } });
        if (!dept)
            throw new api_error_1.APIError('NOT_FOUND', 'Department not found.');
        const facCount = await prisma_client_1.prisma.facultyProfile.count({ where: { departmentId: id } });
        if (facCount > 0)
            throw new api_error_1.APIError('CONFLICT', `Cannot delete: ${facCount} faculty members are assigned.`);
        return prisma_client_1.prisma.department.delete({ where: { id } });
    }
    // ==================== COURSES ====================
    static async createCourse(tenantId, data) {
        const dept = await prisma_client_1.prisma.department.findFirst({ where: { id: data.departmentId, institutionId: tenantId } });
        if (!dept)
            throw new api_error_1.APIError('NOT_FOUND', 'Department not found.');
        return prisma_client_1.prisma.course.create({ data: { departmentId: data.departmentId, name: data.name } });
    }
    static async listCourses(tenantId, departmentId) {
        return prisma_client_1.prisma.course.findMany({
            where: { department: { institutionId: tenantId }, ...(departmentId ? { departmentId } : {}) },
            include: { department: true, batches: true, _count: { select: { subjects: true } } },
            orderBy: { name: 'asc' }
        });
    }
    static async updateCourse(tenantId, id, data) {
        const course = await prisma_client_1.prisma.course.findFirst({ where: { id, department: { institutionId: tenantId } } });
        if (!course)
            throw new api_error_1.APIError('NOT_FOUND', 'Course not found.');
        return prisma_client_1.prisma.course.update({ where: { id }, data: { name: data.name } });
    }
    static async deleteCourse(tenantId, id) {
        const course = await prisma_client_1.prisma.course.findFirst({ where: { id, department: { institutionId: tenantId } } });
        if (!course)
            throw new api_error_1.APIError('NOT_FOUND', 'Course not found.');
        return prisma_client_1.prisma.course.delete({ where: { id } });
    }
    // ==================== BATCHES ====================
    static async createBatch(tenantId, data) {
        const course = await prisma_client_1.prisma.course.findFirst({ where: { id: data.courseId, department: { institutionId: tenantId } } });
        if (!course)
            throw new api_error_1.APIError('NOT_FOUND', 'Course not found.');
        return prisma_client_1.prisma.batch.create({ data: { courseId: data.courseId, year: data.year } });
    }
    static async listBatches(tenantId, courseId) {
        return prisma_client_1.prisma.batch.findMany({
            where: { course: { department: { institutionId: tenantId } }, ...(courseId ? { courseId } : {}) },
            include: { course: { include: { department: true } }, _count: { select: { students: true } } },
            orderBy: [{ course: { name: 'asc' } }, { year: 'asc' }]
        });
    }
    static async updateBatch(tenantId, id, data) {
        const batch = await prisma_client_1.prisma.batch.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
        if (!batch)
            throw new api_error_1.APIError('NOT_FOUND', 'Batch not found.');
        return prisma_client_1.prisma.batch.update({ where: { id }, data: { year: data.year } });
    }
    static async deleteBatch(tenantId, id) {
        const batch = await prisma_client_1.prisma.batch.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
        if (!batch)
            throw new api_error_1.APIError('NOT_FOUND', 'Batch not found.');
        const studentCount = await prisma_client_1.prisma.studentProfile.count({ where: { batchId: id } });
        if (studentCount > 0)
            throw new api_error_1.APIError('CONFLICT', `Cannot delete: ${studentCount} students enrolled.`);
        return prisma_client_1.prisma.batch.delete({ where: { id } });
    }
    // ==================== SUBJECTS ====================
    static async createSubject(tenantId, data) {
        const course = await prisma_client_1.prisma.course.findFirst({ where: { id: data.courseId, department: { institutionId: tenantId } } });
        if (!course)
            throw new api_error_1.APIError('NOT_FOUND', 'Course not found.');
        const existing = await prisma_client_1.prisma.subject.findUnique({ where: { code: data.code } });
        if (existing)
            throw new api_error_1.APIError('CONFLICT', `Subject code ${data.code} already exists.`);
        return prisma_client_1.prisma.subject.create({ data: { courseId: data.courseId, name: data.name, code: data.code } });
    }
    static async listSubjects(tenantId, courseId) {
        return prisma_client_1.prisma.subject.findMany({
            where: { course: { department: { institutionId: tenantId } }, ...(courseId ? { courseId } : {}) },
            include: { course: { include: { department: true } }, _count: { select: { teachingAllocations: true } } },
            orderBy: { name: 'asc' }
        });
    }
    static async updateSubject(tenantId, id, data) {
        const subject = await prisma_client_1.prisma.subject.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
        if (!subject)
            throw new api_error_1.APIError('NOT_FOUND', 'Subject not found.');
        if (data.code) {
            const dup = await prisma_client_1.prisma.subject.findFirst({ where: { code: data.code, NOT: { id } } });
            if (dup)
                throw new api_error_1.APIError('CONFLICT', `Code ${data.code} already taken.`);
        }
        return prisma_client_1.prisma.subject.update({ where: { id }, data });
    }
    static async deleteSubject(tenantId, id) {
        const subject = await prisma_client_1.prisma.subject.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
        if (!subject)
            throw new api_error_1.APIError('NOT_FOUND', 'Subject not found.');
        return prisma_client_1.prisma.subject.delete({ where: { id } });
    }
    // ==================== TEACHING ALLOCATIONS ====================
    static async createTeachingAllocation(tenantId, data) {
        const subject = await prisma_client_1.prisma.subject.findFirst({ where: { id: data.subjectId, course: { department: { institutionId: tenantId } } } });
        if (!subject)
            throw new api_error_1.APIError('NOT_FOUND', 'Subject not found in this institution.');
        const faculty = await prisma_client_1.prisma.facultyProfile.findFirst({ where: { id: data.facultyId, institutionId: tenantId } });
        if (!faculty)
            throw new api_error_1.APIError('NOT_FOUND', 'Faculty not found in this institution.');
        const existing = await prisma_client_1.prisma.teachingAllocation.findUnique({ where: { subjectId_facultyId: { subjectId: data.subjectId, facultyId: data.facultyId } } });
        if (existing)
            throw new api_error_1.APIError('CONFLICT', 'This allocation already exists.');
        return prisma_client_1.prisma.teachingAllocation.create({ data: { subjectId: data.subjectId, facultyId: data.facultyId } });
    }
    static async listTeachingAllocations(tenantId) {
        return prisma_client_1.prisma.teachingAllocation.findMany({
            where: { subject: { course: { department: { institutionId: tenantId } } } },
            include: { subject: { include: { course: true } }, faculty: true }
        });
    }
    static async deleteTeachingAllocation(tenantId, id) {
        const alloc = await prisma_client_1.prisma.teachingAllocation.findFirst({ where: { id, subject: { course: { department: { institutionId: tenantId } } } } });
        if (!alloc)
            throw new api_error_1.APIError('NOT_FOUND', 'Allocation not found.');
        return prisma_client_1.prisma.teachingAllocation.delete({ where: { id } });
    }
    // ==================== TIMETABLE (TIME SLOTS) ====================
    static async createTimeSlot(tenantId, data) {
        const batch = await prisma_client_1.prisma.batch.findFirst({ where: { id: data.batchId, course: { department: { institutionId: tenantId } } } });
        if (!batch)
            throw new api_error_1.APIError('NOT_FOUND', 'Batch not found in this institution.');
        return prisma_client_1.prisma.timeSlot.create({ data });
    }
    static async listTimeSlots(tenantId, batchId) {
        return prisma_client_1.prisma.timeSlot.findMany({
            where: { batch: { course: { department: { institutionId: tenantId } } }, ...(batchId ? { batchId } : {}) },
            include: { batch: { include: { course: true } }, teachingAllocation: { include: { subject: true, faculty: true } } },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
    }
    static async updateTimeSlot(tenantId, id, data) {
        const slot = await prisma_client_1.prisma.timeSlot.findFirst({ where: { id, batch: { course: { department: { institutionId: tenantId } } } } });
        if (!slot)
            throw new api_error_1.APIError('NOT_FOUND', 'Time slot not found.');
        return prisma_client_1.prisma.timeSlot.update({ where: { id }, data });
    }
    static async deleteTimeSlot(tenantId, id) {
        const slot = await prisma_client_1.prisma.timeSlot.findFirst({ where: { id, batch: { course: { department: { institutionId: tenantId } } } } });
        if (!slot)
            throw new api_error_1.APIError('NOT_FOUND', 'Time slot not found.');
        return prisma_client_1.prisma.timeSlot.delete({ where: { id } });
    }
}
exports.AcademicsService = AcademicsService;
