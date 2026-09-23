import { apiClient } from '../lib/apiClient'

export const subjectsService = {
  listAll: () => apiClient.get('/content/subjects'),
  create: (data) =>
    apiClient.post('/content/subjects', {
      name: data.name,
      code: (data.code || data.name || '').toUpperCase().replace(/\s+/g, '-').slice(0, 10),
      description: data.description || `Subject: ${data.name}`,
    }),
  update: (subjectId, data) => apiClient.patch(`/content/subjects/${subjectId}`, data),
}
