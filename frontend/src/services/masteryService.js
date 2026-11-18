import { apiClient } from '../lib/apiClient'

export const masteryService = {
  classHeatmap: (classId) => apiClient.get(`/teacher/classes/${classId}/mastery-matrix`),
  classErrorPatterns: (classId) => apiClient.get(`/teacher/classes/${classId}/error-patterns`),
  reviewErrorPattern: (flagId, data) =>
    apiClient.post(`/teacher/error-patterns/${flagId}/review`, data),
}
