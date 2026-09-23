import { apiClient } from '../lib/apiClient'

export const classesService = {
  listForTeacher: () => apiClient.get('/admin/classes'),
  get: (classId) => apiClient.get(`/admin/classes/${classId}`),
  listAll: () => apiClient.get('/admin/classes'),
  create: (data) =>
    apiClient.post('/admin/classes', {
      name: data.name,
      grade: data.gradeLevel || 'Class 9',
      section: data.section || 'A',
    }),
  update: (classId, data) => apiClient.patch(`/admin/classes/${classId}`, data),
}
