import { apiClient } from '../lib/apiClient'

export const adminService = {
  listTeachers: () => apiClient.get('/admin/teachers').then((d) => d?.teachers || []),
  createTeacher: (data) => apiClient.post('/admin/teachers', data).then((d) => d?.teacher || d),
  assignTeacher: (data) =>
    apiClient.post('/admin/teacher-assignments', data).then((d) => d?.assignment || d),
  enrollStudent: ({ class_id, student_id }) =>
    apiClient
      .post(`/admin/classes/${class_id}/enrollments`, { student_id })
      .then((d) => d?.enrollment || d),
  listAuditLogs: (params = {}) => apiClient.get('/admin/audit-logs', { params }),
  systemStatus: () => apiClient.get('/admin/system-status'),
}
