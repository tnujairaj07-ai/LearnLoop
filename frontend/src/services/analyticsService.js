import { apiClient } from '../lib/apiClient'

export const analyticsService = {
  teacherDashboard: (classId) =>
    apiClient.get('/teacher/dashboard', {
      params: classId ? { class_id: classId } : undefined,
    }),
  realtimeActivity: ({ classId, date, dayOffset } = {}) =>
    apiClient.get('/teacher/activity', {
      params: {
        ...(classId ? { class_id: classId } : {}),
        ...(date ? { date } : {}),
        ...(dayOffset !== undefined && dayOffset !== null ? { day_offset: dayOffset } : {}),
      },
    }),
  myClass: () => apiClient.get('/teacher/my-class'),
  updateAnnouncement: (classId, message) =>
    apiClient
      .put(`/teacher/classes/${classId}/announcement`, { message })
      .then((d) => d?.announcement || d),
  recordAttendance: (classId, data) =>
    apiClient.post(`/teacher/classes/${classId}/attendance`, data),
  topicAnalytics: (classId, topicId) =>
    apiClient.get(`/teacher/classes/${classId}/topics/${topicId}/analytics`),
  listClassAssessments: (classId) =>
    apiClient
      .get('/assessments', { params: classId ? { class_id: classId } : undefined })
      .then((d) => d?.assessments || []),
  itemAnalysis: (classId, assessmentId) =>
    apiClient.get(`/teacher/classes/${classId}/assessments/${assessmentId}/item-analysis`),
}
