import { apiClient } from '../lib/apiClient'

export const masteryService = {
  classHeatmap: (classId, { topicId } = {}) =>
    apiClient.get(`/teacher/classes/${classId}/mastery-heatmap`, { params: { topicId } }),
  studentTopicHistory: (studentId, topicId) =>
    apiClient.get(`/student/${studentId}/mastery/${topicId}/history`),
}
