import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'

import TeacherDashboardPage from './pages/teacher/TeacherDashboardPage'
import ClassAnalyticsPage from './pages/teacher/ClassAnalyticsPage'
import TopicAnalyticsPage from './pages/teacher/TopicAnalyticsPage'
import InterventionQueuePage from './pages/teacher/InterventionQueuePage'
import InterventionDetailPage from './pages/teacher/InterventionDetailPage'
import StudentDetailPage from './pages/teacher/StudentDetailPage'
import TopicManagementPage from './pages/teacher/TopicManagementPage'
import ResourceManagementPage from './pages/teacher/ResourceManagementPage'
import QuestionManagementPage from './pages/teacher/QuestionManagementPage'
import ReportGeneratorPage from './pages/teacher/ReportGeneratorPage'

import ClassManagementPage from './pages/admin/ClassManagementPage'
import SubjectManagementPage from './pages/admin/SubjectManagementPage'
import TeacherManagementPage from './pages/admin/TeacherManagementPage'
import StudentManagementPage from './pages/admin/StudentManagementPage'
import TeacherAssignmentPage from './pages/admin/TeacherAssignmentPage'
import StudentEnrollmentPage from './pages/admin/StudentEnrollmentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute allow={['teacher', 'admin']}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Teacher */}
        <Route path="/teacher" element={<TeacherDashboardPage />} />
        <Route path="/teacher/classes/:classId" element={<ClassAnalyticsPage />} />
        <Route path="/teacher/classes/:classId/topics/:topicId" element={<TopicAnalyticsPage />} />
        <Route path="/teacher/interventions" element={<InterventionQueuePage />} />
        <Route path="/teacher/interventions/:interventionId" element={<InterventionDetailPage />} />
        <Route path="/teacher/students/:studentId" element={<StudentDetailPage />} />
        <Route path="/teacher/topics" element={<TopicManagementPage />} />
        <Route path="/teacher/resources" element={<ResourceManagementPage />} />
        <Route path="/teacher/questions" element={<QuestionManagementPage />} />
        <Route path="/teacher/reports" element={<ReportGeneratorPage />} />

        {/* Admin */}
        <Route path="/admin/classes" element={<ClassManagementPage />} />
        <Route path="/admin/subjects" element={<SubjectManagementPage />} />
        <Route path="/admin/teachers" element={<TeacherManagementPage />} />
        <Route path="/admin/students" element={<StudentManagementPage />} />
        <Route path="/admin/assignments" element={<TeacherAssignmentPage />} />
        <Route path="/admin/enrollment" element={<StudentEnrollmentPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
