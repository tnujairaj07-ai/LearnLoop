import { apiClient } from '../lib/apiClient'

export const studentsService = {
  listForClass: (classId) => apiClient.get(`/classes/${classId}/students`),
  get: (studentId) => apiClient.get(`/students/${studentId}`),
  listAll: () => apiClient.get('/admin/students'),
  create: (data) => apiClient.post('/admin/students', data),
  recommendations: (studentId, subjectId) =>
    apiClient.get(`/student/${studentId}/recommendations`, { params: { subjectId } }),
  interventionHistory: (studentId) => apiClient.get(`/student/${studentId}/interventions`),
  addNote: (studentId, data) => apiClient.post(`/students/${studentId}/notes`, data),
  assignPractice: (studentId, data) => apiClient.post(`/students/${studentId}/assign-practice`, data),
}
