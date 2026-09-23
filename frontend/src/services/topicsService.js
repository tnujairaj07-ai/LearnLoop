import { apiClient } from '../lib/apiClient'

export const topicsService = {
  listBySubject: (subjectId) => apiClient.get('/topics', { params: { subjectId } }),
  create: (data) => apiClient.post('/topics', data),
  update: (topicId, data) => apiClient.patch(`/topics/${topicId}`, data),
}
