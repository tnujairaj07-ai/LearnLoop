import { apiClient } from '../lib/apiClient'

export const interventionsService = {
  listForClass: (classId) => apiClient.get(`/teacher/classes/${classId}/interventions`),
  get: (interventionId) => apiClient.get(`/teacher/interventions/${interventionId}`),
  create: (data) => apiClient.post('/teacher/interventions', data),
  update: (interventionId, data) => apiClient.patch(`/teacher/interventions/${interventionId}`, data),
  assign: (interventionId, data) =>
    apiClient.patch(`/teacher/interventions/${interventionId}/assign`, data),
  dismiss: (interventionId) =>
    apiClient.patch(`/teacher/interventions/${interventionId}`, { status: 'dismissed' }),
}
