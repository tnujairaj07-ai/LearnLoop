import { apiClient } from '../lib/apiClient'

export const subjectsService = {
  listAll: () => apiClient.get('/content/subjects').then((d) => d?.subjects || []),
  create: (data) => apiClient.post('/content/subjects', data).then((d) => d?.subject || d),
  update: (subjectId, data) =>
    apiClient.patch(`/content/subjects/${subjectId}`, data).then((d) => d?.subject || d),
}
