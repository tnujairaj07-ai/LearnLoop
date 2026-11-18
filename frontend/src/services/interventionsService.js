import { apiClient } from '../lib/apiClient'

export const interventionsService = {
  listForClass: (classId, params = {}) =>
    apiClient
      .get('/teacher/interventions', {
        params: {
          ...(classId ? { class_id: classId } : {}),
          ...params,
        },
      })
      .then((d) => (Array.isArray(d) ? d : d?.interventions || [])),
  generate: (classId) =>
    apiClient
      .post('/teacher/interventions/generate', { class_id: classId })
      .then((d) => (Array.isArray(d) ? d : d?.interventions || [])),
  get: (interventionId) => apiClient.get(`/teacher/interventions/${interventionId}`),
  create: (data) => apiClient.post('/teacher/interventions', data),
  update: (interventionId, data) =>
    apiClient.patch(`/teacher/interventions/${interventionId}`, data),
  assign: (interventionId, data = {}) =>
    apiClient.post(`/teacher/interventions/${interventionId}/assign`, data),
  complete: (interventionId, data = {}) =>
    apiClient.post(`/teacher/interventions/${interventionId}/complete`, data),
  outcomes: (interventionId) =>
    apiClient.get(`/teacher/interventions/${interventionId}/outcomes`),
  dismiss: (interventionId) =>
    apiClient.patch(`/teacher/interventions/${interventionId}`, { status: 'dismissed' }),
}
