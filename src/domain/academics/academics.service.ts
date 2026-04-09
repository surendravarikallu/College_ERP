import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class AcademicsService {

  // ==================== DEPARTMENTS ====================

  static async createDepartment(tenantId: string, data: { name: string }) {
    return prisma.department.create({
      data: { institutionId: tenantId, name: data.name }
    });
  }

  static async listDepartments(tenantId: string) {
    return prisma.department.findMany({
      where: { institutionId: tenantId },
      include: { courses: { include: { _count: { select: { batches: true } } } }, _count: { select: { faculties: true } } },
      orderBy: { name: 'asc' }
    });
  }

  static async updateDepartment(tenantId: string, id: string, data: { name: string }) {
    const dept = await prisma.department.findFirst({ where: { id, institutionId: tenantId } });
    if (!dept) throw new APIError('NOT_FOUND', 'Department not found in this institution.');
    return prisma.department.update({ where: { id }, data: { name: data.name } });
  }

  static async deleteDepartment(tenantId: string, id: string) {
    const dept = await prisma.department.findFirst({ where: { id, institutionId: tenantId } });
    if (!dept) throw new APIError('NOT_FOUND', 'Department not found.');
    const facCount = await prisma.facultyProfile.count({ where: { departmentId: id } });
    if (facCount > 0) throw new APIError('CONFLICT', `Cannot delete: ${facCount} faculty members are assigned.`);
    return prisma.department.delete({ where: { id } });
  }

  // ==================== COURSES ====================

  static async createCourse(tenantId: string, data: { departmentId: string; name: string }) {
    const dept = await prisma.department.findFirst({ where: { id: data.departmentId, institutionId: tenantId } });
    if (!dept) throw new APIError('NOT_FOUND', 'Department not found.');
    return prisma.course.create({ data: { departmentId: data.departmentId, name: data.name } });
  }

  static async listCourses(tenantId: string, departmentId?: string) {
    return prisma.course.findMany({
      where: { department: { institutionId: tenantId }, ...(departmentId ? { departmentId } : {}) },
      include: { department: true, batches: true, _count: { select: { subjects: true } } },
      orderBy: { name: 'asc' }
    });
  }

  static async updateCourse(tenantId: string, id: string, data: { name: string }) {
    const course = await prisma.course.findFirst({ where: { id, department: { institutionId: tenantId } } });
    if (!course) throw new APIError('NOT_FOUND', 'Course not found.');
    return prisma.course.update({ where: { id }, data: { name: data.name } });
  }

  static async deleteCourse(tenantId: string, id: string) {
    const course = await prisma.course.findFirst({ where: { id, department: { institutionId: tenantId } } });
    if (!course) throw new APIError('NOT_FOUND', 'Course not found.');
    return prisma.course.delete({ where: { id } });
  }

  // ==================== BATCHES ====================

  static async createBatch(tenantId: string, data: { courseId: string; year: number }) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, department: { institutionId: tenantId } } });
    if (!course) throw new APIError('NOT_FOUND', 'Course not found.');
    return prisma.batch.create({ data: { courseId: data.courseId, year: data.year } });
  }

  static async listBatches(tenantId: string, courseId?: string) {
    return prisma.batch.findMany({
      where: { course: { department: { institutionId: tenantId } }, ...(courseId ? { courseId } : {}) },
      include: { course: { include: { department: true } }, _count: { select: { students: true } } },
      orderBy: [{ course: { name: 'asc' } }, { year: 'asc' }]
    });
  }

  static async updateBatch(tenantId: string, id: string, data: { year: number }) {
    const batch = await prisma.batch.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
    if (!batch) throw new APIError('NOT_FOUND', 'Batch not found.');
    return prisma.batch.update({ where: { id }, data: { year: data.year } });
  }

  static async deleteBatch(tenantId: string, id: string) {
    const batch = await prisma.batch.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
    if (!batch) throw new APIError('NOT_FOUND', 'Batch not found.');
    const studentCount = await prisma.studentProfile.count({ where: { batchId: id } });
    if (studentCount > 0) throw new APIError('CONFLICT', `Cannot delete: ${studentCount} students enrolled.`);
    return prisma.batch.delete({ where: { id } });
  }

  // ==================== SUBJECTS ====================

  static async createSubject(tenantId: string, data: { courseId: string; name: string; code: string }) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, department: { institutionId: tenantId } } });
    if (!course) throw new APIError('NOT_FOUND', 'Course not found.');
    const existing = await prisma.subject.findUnique({ where: { code: data.code } });
    if (existing) throw new APIError('CONFLICT', `Subject code ${data.code} already exists.`);
    return prisma.subject.create({ data: { courseId: data.courseId, name: data.name, code: data.code } });
  }

  static async listSubjects(tenantId: string, courseId?: string) {
    return prisma.subject.findMany({
      where: { course: { department: { institutionId: tenantId } }, ...(courseId ? { courseId } : {}) },
      include: { course: { include: { department: true } }, _count: { select: { teachingAllocations: true } } },
      orderBy: { name: 'asc' }
    });
  }

  static async updateSubject(tenantId: string, id: string, data: { name?: string; code?: string }) {
    const subject = await prisma.subject.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
    if (!subject) throw new APIError('NOT_FOUND', 'Subject not found.');
    if (data.code) {
      const dup = await prisma.subject.findFirst({ where: { code: data.code, NOT: { id } } });
      if (dup) throw new APIError('CONFLICT', `Code ${data.code} already taken.`);
    }
    return prisma.subject.update({ where: { id }, data });
  }

  static async deleteSubject(tenantId: string, id: string) {
    const subject = await prisma.subject.findFirst({ where: { id, course: { department: { institutionId: tenantId } } } });
    if (!subject) throw new APIError('NOT_FOUND', 'Subject not found.');
    return prisma.subject.delete({ where: { id } });
  }

  // ==================== TEACHING ALLOCATIONS ====================

  static async createTeachingAllocation(tenantId: string, data: { subjectId: string; facultyId: string }) {
    const subject = await prisma.subject.findFirst({ where: { id: data.subjectId, course: { department: { institutionId: tenantId } } } });
    if (!subject) throw new APIError('NOT_FOUND', 'Subject not found in this institution.');
    const faculty = await prisma.facultyProfile.findFirst({ where: { id: data.facultyId, institutionId: tenantId } });
    if (!faculty) throw new APIError('NOT_FOUND', 'Faculty not found in this institution.');
    const existing = await prisma.teachingAllocation.findUnique({ where: { subjectId_facultyId: { subjectId: data.subjectId, facultyId: data.facultyId } } });
    if (existing) throw new APIError('CONFLICT', 'This allocation already exists.');
    return prisma.teachingAllocation.create({ data: { subjectId: data.subjectId, facultyId: data.facultyId } });
  }

  static async listTeachingAllocations(tenantId: string) {
    return prisma.teachingAllocation.findMany({
      where: { subject: { course: { department: { institutionId: tenantId } } } },
      include: { subject: { include: { course: true } }, faculty: true }
    });
  }

  static async deleteTeachingAllocation(tenantId: string, id: string) {
    const alloc = await prisma.teachingAllocation.findFirst({ where: { id, subject: { course: { department: { institutionId: tenantId } } } } });
    if (!alloc) throw new APIError('NOT_FOUND', 'Allocation not found.');
    return prisma.teachingAllocation.delete({ where: { id } });
  }

  // ==================== TIMETABLE (TIME SLOTS) ====================

  static async createTimeSlot(tenantId: string, data: { batchId: string; teachingAllocationId: string; dayOfWeek: number; startTime: string; endTime: string }) {
    const batch = await prisma.batch.findFirst({ where: { id: data.batchId, course: { department: { institutionId: tenantId } } } });
    if (!batch) throw new APIError('NOT_FOUND', 'Batch not found in this institution.');
    return prisma.timeSlot.create({ data });
  }

  static async listTimeSlots(tenantId: string, batchId?: string) {
    return prisma.timeSlot.findMany({
      where: { batch: { course: { department: { institutionId: tenantId } } }, ...(batchId ? { batchId } : {}) },
      include: { batch: { include: { course: true } }, teachingAllocation: { include: { subject: true, faculty: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  static async updateTimeSlot(tenantId: string, id: string, data: { dayOfWeek?: number; startTime?: string; endTime?: string }) {
    const slot = await prisma.timeSlot.findFirst({ where: { id, batch: { course: { department: { institutionId: tenantId } } } } });
    if (!slot) throw new APIError('NOT_FOUND', 'Time slot not found.');
    return prisma.timeSlot.update({ where: { id }, data });
  }

  static async deleteTimeSlot(tenantId: string, id: string) {
    const slot = await prisma.timeSlot.findFirst({ where: { id, batch: { course: { department: { institutionId: tenantId } } } } });
    if (!slot) throw new APIError('NOT_FOUND', 'Time slot not found.');
    return prisma.timeSlot.delete({ where: { id } });
  }
}
