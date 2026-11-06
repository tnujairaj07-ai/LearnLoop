import { apiClient } from '../lib/apiClient'

export const questionsService = {
  listByTopic: (topicId) => apiClient.get(`/topics/${topicId}/questions`),
  create: (data) => apiClient.post('/questions', data),
  update: (questionId, data) => apiClient.patch(`/questions/${questionId}`, data),
  remove: (questionId) => apiClient.delete(`/questions/${questionId}`),
}
