import { apiClient } from "../lib/apiClient";

/* ---------------------------- Auth ---------------------------- */

export async function login(email, password) {
  const data = await apiClient.post("/auth/login", { email, password });
  return {
    token: data.access_token || data.token,
    user: data.user,
  };
}

export async function register({ name, email, password, role = "student", grade = "Class 9" }) {
  const data = await apiClient.post("/auth/register", { name, email, password, role, grade });
  return {
    token: data.access_token || data.token,
    user: data.user,
  };
}

/* -------------------------- Dashboard -------------------------- */

export function getStudentDashboard() {
  return apiClient.get("/student/dashboard");
}

export function createStudentTask(title) {
  return apiClient.post("/student/tasks", { title });
}

export function toggleStudentTask(taskId, isDone) {
  return apiClient.patch(
    `/student/tasks/${taskId}`,
    isDone === undefined ? {} : { is_done: isDone }
  );
}

export function markReminderRead(reminderId) {
  return apiClient.post(`/student/reminders/${reminderId}/read`);
}

/* --------------------- Roadmaps & Curriculum -------------------- */

export function getRoadmap(params = {}) {
  return apiClient.get("/student/roadmap", { params });
}

export function toggleSubjectBookmark(subjectId) {
  return apiClient.post(`/student/subjects/${subjectId}/bookmark`);
}

export function getSubjectChapters(subjectId) {
  return apiClient.get(`/student/subjects/${subjectId}/chapters`);
}

export function getTopicDetails(topicId) {
  return apiClient.get(`/student/topics/${topicId}`);
}

export function markResourceReviewed(resourceId, durationSeconds = 300) {
  return apiClient.post(`/student/resources/${resourceId}/review`, {
    duration_seconds: durationSeconds,
  });
}

/* ------------------ Practice Hub & Assessment Runner ----------------- */

export function getPracticeHub(subjectId = null) {
  return apiClient.get("/student/practice-hub", {
    params: subjectId ? { subject_id: subjectId } : undefined,
  });
}

export function listStudentAssessments(params = {}) {
  return apiClient.get("/assessments", { params });
}

export function getAssessmentDetails(assessmentId) {
  return apiClient.get(`/assessments/${assessmentId}`);
}

export function startAssessmentAttempt(assessmentId) {
  return apiClient.post(`/assessments/${assessmentId}/start`);
}

export function saveAttemptAnswer(attemptId, { questionId, answerText, timeSpentSeconds = 0 }) {
  return apiClient.post(`/attempts/${attemptId}/answers`, {
    question_id: questionId,
    answer_text: answerText,
    time_spent_seconds: timeSpentSeconds,
  });
}

export function submitAttempt(attemptId) {
  return apiClient.post(`/attempts/${attemptId}/submit`);
}

export function getAttemptResult(attemptId) {
  return apiClient.get(`/attempts/${attemptId}/result`);
}

export function getSimilarQuestions(questionId, limit = 3) {
  return apiClient.get(`/content/questions/${questionId}/similar`, {
    params: { limit },
  });
}

/* -------------------- Analysis & Weekly Progress -------------------- */

export function getStudentAnalysis(days = 365) {
  return apiClient.get("/student/analysis", { params: { days } });
}

export function getStudentMastery() {
  return apiClient.get("/student/mastery");
}

export function getWeeklyProgress(weekKey = null) {
  return apiClient.get("/student/weekly-progress", {
    params: weekKey ? { week: weekKey } : undefined,
  });
}

export function createStudySession(payload) {
  return apiClient.post("/student/study-sessions", payload);
}

/* --------------------------- Report Card --------------------------- */

export function getReportCard() {
  return apiClient.get("/student/report-card");
}
