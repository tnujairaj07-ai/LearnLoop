import { apiClient } from '../lib/apiClient'

export const reportsService = {
  generateClassReport: (data) => apiClient.post('/reports/class', data),
  generateStudentReports: (data) => apiClient.post('/reports/students', data),
  status: (reportJobId) => apiClient.get(`/reports/jobs/${reportJobId}`),
}
