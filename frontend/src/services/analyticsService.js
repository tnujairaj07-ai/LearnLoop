import { apiClient } from '../lib/apiClient'

export const analyticsService = {
  topicAnalytics: (classId, topicId) =>
    apiClient.get(`/teacher/classes/${classId}/topics/${topicId}/analytics`),
  studentErrorPatterns: (studentId) => apiClient.get(`/student/${studentId}/error-patterns`),
  studentGrowth: (studentId, subjectId) =>
    apiClient.get(`/student/${studentId}/growth`, { params: { subjectId } }),
  overrideErrorPattern: (studentId, patternId, data) =>
    apiClient.patch(`/student/${studentId}/error-patterns/${patternId}`, data),
}
