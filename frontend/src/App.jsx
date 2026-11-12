import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";

import Login from "./pages/Login";
import NotFoundPage from "./pages/NotFoundPage";

// Student
import Dashboard from "./pages/student/Dashboard";
import Roadmap from "./pages/student/Roadmap";
import SubjectChapters from "./pages/student/SubjectChapters";
import TopicDetail from "./pages/student/TopicDetail";
import Quiz from "./pages/student/Quiz";
import Analysis from "./pages/student/Analysis";
import ReportCard from "./pages/student/ReportCard";

// Teacher
import TeacherDashboardPage from "./pages/teacher/TeacherDashboardPage";
import RealTimeActivityPage from "./pages/teacher/RealTimeActivityPage";
import TeacherClassesPage from "./pages/teacher/TeacherClassesPage";
import MyClassPage from "./pages/teacher/MyClassPage";
import ClassAnalyticsPage from "./pages/teacher/ClassAnalyticsPage";
import TopicAnalyticsPage from "./pages/teacher/TopicAnalyticsPage";
import InterventionQueuePage from "./pages/teacher/InterventionQueuePage";
import InterventionDetailPage from "./pages/teacher/InterventionDetailPage";
import StudentDetailPage from "./pages/teacher/StudentDetailPage";
import TopicManagementPage from "./pages/teacher/TopicManagementPage";
import ResourceManagementPage from "./pages/teacher/ResourceManagementPage";
import QuestionManagementPage from "./pages/teacher/QuestionManagementPage";
import ReportGeneratorPage from "./pages/teacher/ReportGeneratorPage";

// Admin
import ClassManagementPage from "./pages/admin/ClassManagementPage";
import SubjectManagementPage from "./pages/admin/SubjectManagementPage";
import TeacherManagementPage from "./pages/admin/TeacherManagementPage";
import StudentManagementPage from "./pages/admin/StudentManagementPage";
import TeacherAssignmentPage from "./pages/admin/TeacherAssignmentPage";
import StudentEnrollmentPage from "./pages/admin/StudentEnrollmentPage";

function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin/classes" replace />;
  if (role === "teacher") return <Navigate to="/teacher" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Login initialMode="signup" />} />

      {/* ---------------- Student ---------------- */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allow={["student"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roadmap"
        element={
          <ProtectedRoute allow={["student"]}>
            <Roadmap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roadmap/:subjectId"
        element={
          <ProtectedRoute allow={["student"]}>
            <SubjectChapters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute allow={["student"]}>
            <Roadmap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:subjectId"
        element={
          <ProtectedRoute allow={["student"]}>
            <SubjectChapters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/topic/:topicId"
        element={
          <ProtectedRoute allow={["student"]}>
            <TopicDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:topicId"
        element={
          <ProtectedRoute allow={["student"]}>
            <Quiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analysis"
        element={
          <ProtectedRoute allow={["student"]}>
            <Analysis />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-card"
        element={
          <ProtectedRoute allow={["student"]}>
            <ReportCard />
          </ProtectedRoute>
        }
      />

      {/* ------------- Teacher / Admin ------------- */}
      <Route
        element={
          <ProtectedRoute allow={["teacher", "admin"]}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Teacher */}
        <Route path="/teacher" element={<TeacherDashboardPage />} />
        <Route path="/teacher/activity" element={<RealTimeActivityPage />} />
        <Route path="/teacher/my-class" element={<MyClassPage />} />
        <Route path="/teacher/classes" element={<TeacherClassesPage />} />
        <Route path="/teacher/classes/my-class" element={<MyClassPage />} />
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

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
