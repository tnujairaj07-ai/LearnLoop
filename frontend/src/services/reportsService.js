import { apiClient } from '../lib/apiClient'

export const reportsService = {
  generateClassReport: (classId, data) =>
    apiClient.post(`/reports/class/${classId}/generate`, data),
  getClassReport: (classId, subjectId, termLabel) =>
    apiClient.get(`/reports/class/${classId}/${subjectId}/${encodeURIComponent(termLabel)}`),
  generateStudentReport: (studentId, data) =>
    apiClient.post(`/reports/student/${studentId}/generate`, data),
  generateStudentReports: (data) => apiClient.post('/reports/students/generate', data),
  getStudentReport: (studentId, termLabel, subjectId) =>
    apiClient.get(`/reports/student/${studentId}/${encodeURIComponent(termLabel)}`, {
      params: subjectId ? { subject_id: subjectId } : undefined,
    }),
  getById: (reportId) => apiClient.get(`/reports/${reportId}`),
}
