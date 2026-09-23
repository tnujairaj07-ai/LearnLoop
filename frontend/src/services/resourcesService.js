import { apiClient } from '../lib/apiClient'

export const resourcesService = {
  listByTopic: (topicId) =>
    apiClient.get('/content/resources', { params: { topic_id: topicId } }),
  create: (topicId, data) =>
    apiClient.post('/content/resources', {
      topic_id: Number(topicId),
      title: data.title,
      resource_type: data.type || 'video',
      url_or_path: data.url,
      difficulty: 1,
    }),
  update: (resourceId, data) => apiClient.patch(`/content/resources/${resourceId}`, data),
  remove: (resourceId) => apiClient.delete(`/content/resources/${resourceId}`),
}
