import { apiClient } from './client';

export const officeService = {
  /**
   * Import students from Excel
   */
  async importStudents(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post('/office/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  /**
   * List admission applications
   */
  async getApplications(status?: string) {
    const { data } = await apiClient.get('/office/admissions', {
      params: { status }
    });
    return data;
  },

  /**
   * Update admission status (APPLIED -> APPROVED -> ADMITTED)
   */
  async updateStatus(id: string, status: string) {
    const { data } = await apiClient.patch(`/office/admissions/${id}`, { status });
    return data;
  }
};
