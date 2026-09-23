import { apiClient } from '../lib/apiClient'

export const topicsService = {
  listBySubject: async (subjectId) => {
    if (!subjectId) return []
    const res = await apiClient.get(`/content/subjects/${subjectId}`)
    return res.topics || res.subject?.topics || []
  },
  create: (data) =>
    apiClient.post('/content/topics', {
      subject_id: Number(data.subjectId),
      title: data.name,
      description: data.description || '',
      order_index: Number(data.order) || 1,
      mastery_threshold: 80.0,
    }),
  update: (topicId, data) => apiClient.patch(`/content/topics/${topicId}`, data),
}
