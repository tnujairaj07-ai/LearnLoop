import { apiClient } from '../lib/apiClient'

export const studentsService = {
  listForClass: (classId) =>
    apiClient.get(`/teacher/classes/${classId}/students`).then((d) => d?.students || []),
  getClassDiagnostics: (classId) => apiClient.get(`/teacher/classes/${classId}/students`),
  getProfile: (studentId) => apiClient.get(`/teacher/students/${studentId}/profile`),
  listAll: () => apiClient.get('/admin/students').then((d) => d?.students || []),
  create: (data) => apiClient.post('/admin/students', data).then((d) => d?.student || d),
  addNote: (studentId, data) =>
    apiClient.post(`/teacher/students/${studentId}/notes`, data).then((d) => d?.note || d),
  assignPractice: (studentId, data) =>
    apiClient.post(`/teacher/students/${studentId}/assign-practice`, data),
  remind: (studentId, data) =>
    apiClient.post(`/teacher/students/${studentId}/remind`, data).then((d) => d?.reminder || d),
}
