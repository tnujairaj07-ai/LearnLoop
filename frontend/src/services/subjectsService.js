import { apiClient } from '../lib/apiClient'

export const subjectsService = {
  listAll: () => apiClient.get('/admin/subjects'),
  create: (data) => apiClient.post('/admin/subjects', data),
  update: (subjectId, data) => apiClient.patch(`/admin/subjects/${subjectId}`, data),
}
