import { apiClient } from '../lib/apiClient'

export const classesService = {
  listForTeacher: () =>
    apiClient.get('/teacher/classes').then((d) => (Array.isArray(d) ? d : d?.classes || [])),
  get: (classId) =>
    apiClient.get(`/admin/classes/${classId}`).then((d) => d?.class || d),
  getDashboard: (classId) => apiClient.get(`/teacher/classes/${classId}/dashboard`),
  listAll: () => apiClient.get('/admin/classes').then((d) => d?.classes || []),
  create: (data) => apiClient.post('/admin/classes', data).then((d) => d?.class || d),
  update: (classId, data) =>
    apiClient.patch(`/admin/classes/${classId}`, data).then((d) => d?.class || d),
}
