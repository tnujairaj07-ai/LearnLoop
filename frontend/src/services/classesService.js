import { apiClient } from '../lib/apiClient'

export const classesService = {
  listForTeacher: (teacherId) => apiClient.get(`/teacher/${teacherId}/classes`),
  get: (classId) => apiClient.get(`/classes/${classId}`),
  listAll: () => apiClient.get('/admin/classes'),
  create: (data) => apiClient.post('/admin/classes', data),
  update: (classId, data) => apiClient.patch(`/admin/classes/${classId}`, data),
}
