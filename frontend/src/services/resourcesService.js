import { apiClient } from '../lib/apiClient'

export const resourcesService = {
  listByTopic: (topicId, params = {}) =>
    apiClient
      .get('/content/resources', {
        params: {
          ...(topicId ? { topic_id: topicId } : {}),
          approved_only: false,
          ...params,
        },
      })
      .then((d) => d?.resources || []),
  create: (arg1, arg2) => {
    const payload = typeof arg1 === 'object' ? arg1 : { ...arg2, topic_id: arg1 }
    return apiClient.post('/content/resources', payload).then((d) => d?.resource || d)
  },
  update: (resourceId, data) =>
    apiClient.patch(`/content/resources/${resourceId}`, data).then((d) => d?.resource || d),
  remove: (resourceId) => apiClient.delete(`/content/resources/${resourceId}`),
}
