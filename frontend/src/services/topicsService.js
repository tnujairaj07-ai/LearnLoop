import { apiClient } from '../lib/apiClient'

export const topicsService = {
  listBySubject: (subjectId) =>
    apiClient
      .get('/content/topics', {
        params: subjectId ? { subject_id: subjectId } : undefined,
      })
      .then((d) => d?.topics || []),
  listAll: () => apiClient.get('/content/topics').then((d) => d?.topics || []),
  get: (topicId) => apiClient.get(`/content/topics/${topicId}`).then((d) => d?.topic || d),
  create: (data) => apiClient.post('/content/topics', data).then((d) => d?.topic || d),
  update: (topicId, data) =>
    apiClient.patch(`/content/topics/${topicId}`, data).then((d) => d?.topic || d),
  remove: (topicId) => apiClient.delete(`/content/topics/${topicId}`),
}
