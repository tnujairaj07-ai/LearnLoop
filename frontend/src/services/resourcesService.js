import { apiClient } from '../lib/apiClient'

export const resourcesService = {
  listByTopic: (topicId) => apiClient.get(`/topics/${topicId}/resources`),
  create: (topicId, data) => apiClient.post(`/topics/${topicId}/resources`, data),
  update: (resourceId, data) => apiClient.patch(`/resources/${resourceId}`, data),
  remove: (resourceId) => apiClient.delete(`/resources/${resourceId}`),
}
