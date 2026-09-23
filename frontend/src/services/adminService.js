import { apiClient } from '../lib/apiClient'

export const adminService = {
  listTeachers: () => apiClient.get('/admin/teachers'),
  createTeacher: (data) => apiClient.post('/admin/teachers', data),
  assignTeacher: (data) => apiClient.post('/admin/assignments/teacher', data),
  enrollStudent: (data) => apiClient.post('/admin/assignments/enrollment', data),
}
