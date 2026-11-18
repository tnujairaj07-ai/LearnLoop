import { apiClient } from '../lib/apiClient'

export const questionsService = {
  listByTopic: (topicId, params = {}) =>
    apiClient
      .get('/content/questions', {
        params: {
          ...(topicId ? { topic_id: topicId } : {}),
          per_page: 100,
          ...params,
        },
      })
      .then((d) => d?.items || d?.questions || []),
  listPaginated: (params = {}) => apiClient.get('/content/questions', { params }),
  listErrorTags: () =>
    apiClient.get('/content/error-tags').then((d) => d?.error_tags || []),
  createErrorTag: (data) =>
    apiClient.post('/content/error-tags', data).then((d) => d?.error_tag || d),
  create: (data) => apiClient.post('/content/questions', data).then((d) => d?.question || d),
  update: (questionId, data) =>
    apiClient.patch(`/content/questions/${questionId}`, data).then((d) => d?.question || d),
  setApproval: (questionId, approved) =>
    apiClient
      .patch(`/content/questions/${questionId}/approval`, { approved })
      .then((d) => d?.question || d),
  remove: (questionId) => apiClient.delete(`/content/questions/${questionId}`),
}
