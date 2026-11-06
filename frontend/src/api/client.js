/**
 * API client for the student frontend.
 *
 * This is the ONLY file that should know about network calls. Every page
 * imports from here instead of calling fetch() directly, so that when
 * Member 3 (backend/API) and Member 4 (mastery engine / analytics API)
 * finalise their Flask endpoints, only this file needs to change.
 *
 * Set VITE_API_BASE_URL in a .env file once the backend is deployed, e.g.
 *   VITE_API_BASE_URL=https://api.yourschoolapp.com
 * Until then, every function falls back to realistic mock data so Member 1
 * can build and demo the full frontend independently.
 */

const rawEnv = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
// If the configured URL ends with /api, strip it since all endpoints in this file start with /api/...
const BASE_URL = rawEnv.endsWith("/api") ? rawEnv.slice(0, -4) : rawEnv;
const USE_MOCKS = !BASE_URL;

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("authToken")
        ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
        : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

function delay(data, ms = 300) {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

/* ---------------------------- Auth ---------------------------- */

export async function login(email, password) {
  if (USE_MOCKS) {
    if (!email || !password) throw new Error("Email and password are required.");
    return delay({
      token: "mock-token-123",
      user: {
        id: "stu_001",
        name: "Aanya Sharma",
        role: "student",
        grade: "Grade 9",
      },
    });
  }
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/* -------------------------- Dashboard -------------------------- */

export async function getStudentDashboard(studentId) {
  if (USE_MOCKS) {
    return delay({
      overallMastery: 63,
      overviewStats: {
        averageScore: "48%",
        assessmentsCountText: "7 of 8 assessments",
        enrolledCourses: 2,
        enrolledLabel: "Class 9 Mathematics",
        submittedCount: 7,
        submittedLabel: "assessments completed",
        pendingCount: 1,
        pendingLabel: "not submitted yet",
      },
      performanceHistory: [
        { attempt: "1", score: 32, label: "Fractions Pre-Test" },
        { attempt: "2", score: 32, label: "Diagnostic Check" },
        { attempt: "3", score: 50, label: "Linear Eq. Drill" },
        { attempt: "4", score: 58, label: "Polynomials Quiz" },
        { attempt: "5", score: 48, label: "Geometry Review" },
      ],
      weeklyProgress: {
        percentage: 75,
        targetLabel: "7/10 topics on track",
        dateRange: "12 Jan - 19 Jan",
        subtitle: "Class 9 Mathematics",
      },
      recentResults: [
        {
          id: "res-1",
          title: "Linear Equations Quiz",
          topic: "Algebra",
          score: 48,
          status: "Developing",
          date: "Yesterday",
        },
        {
          id: "res-2",
          title: "Fractions Diagnostic",
          topic: "Arithmetic",
          score: 84,
          status: "Proficient",
          date: "18 Sep",
        },
        {
          id: "res-3",
          title: "Polynomials Assessment",
          topic: "Algebra",
          score: 62,
          status: "Proficient",
          date: "14 Sep",
        },
      ],
      todayLessons: [
        {
          id: "lesson-1",
          time: "9:00",
          title: "Sign error patterns in 2-step eq",
          teacher: "Mr. Evans",
          topic: "Linear Equations",
        },
        {
          id: "lesson-2",
          time: "11:00",
          title: "Polynomial factorization practice",
          teacher: "Mrs. Stevenson",
          topic: "Polynomials",
        },
        {
          id: "lesson-3",
          time: "15:00",
          title: "Diagnostic Reassessment window",
          teacher: "Mrs. Drake",
          topic: "Fractions & Decimals",
        },
      ],
      upcomingTasks: [
        { id: "task-1", text: "Linear equations revision", done: false },
        { id: "task-2", text: "Fractions misconception drill", done: true },
        { id: "task-3", text: "Polynomials diagnostic test", done: true },
      ],
      events: [
        {
          id: "event-1",
          title: "Math Doubt Clinic",
          datetime: "Friday, 17th January 11 am",
        },
        {
          id: "event-2",
          title: "Geometry Peer Workshop",
          datetime: "Saturday, 18th January 5 pm",
        },
        {
          id: "event-3",
          title: "Weekly Mathematics Reassessment",
          datetime: "Saturday, 18th January 8 pm",
        },
      ],
      subjects: [
        { id: "math", name: "Mathematics", mastery: 48, topicsCompleted: 3, topicsTotal: 5 },
      ],
      nextRecommendedAction: {
        subject: "Mathematics",
        topic: "Linear Equations",
        reason: "Your accuracy dipped on 2-step equations last attempt.",
        actionType: "practice",
      },
      recentProgress: [
        { date: "Sep 18", label: "Completed quiz: Fractions", delta: "+4% mastery" },
        { date: "Sep 16", label: "Reviewed notes: Linear Equations", delta: "reviewed" },
        { date: "Sep 14", label: "Completed diagnostic: Polynomials", delta: "+2% mastery" },
      ],
    });
  }
  return request(`/api/students/${studentId}/dashboard`);
}

/* --------------------------- Roadmap ---------------------------- */

export async function getSubjectRoadmap(studentId, subjectId) {
  if (USE_MOCKS) {
    return delay({
      subject: "Mathematics",
      topics: [
        { id: "ch-1", chapterNumber: 1, title: "Number Systems", unit: "Unit I: Number Systems", mastery: 84, status: "completed" },
        { id: "ch-2", chapterNumber: 2, title: "Polynomials", unit: "Unit II: Algebra", mastery: 62, status: "completed" },
        { id: "ch-3", chapterNumber: 3, title: "Coordinate Geometry", unit: "Unit III: Coordinate Geometry", mastery: 0, status: "not_started" },
        { id: "ch-4", chapterNumber: 4, title: "Linear Equations in Two Variables", unit: "Unit II: Algebra", mastery: 47, status: "in_progress", recommended: true },
        { id: "ch-5", chapterNumber: 5, title: "Introduction to Euclid’s Geometry", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-6", chapterNumber: 6, title: "Lines and Angles", unit: "Unit IV: Geometry", mastery: 48, status: "in_progress" },
        { id: "ch-7", chapterNumber: 7, title: "Triangles", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-8", chapterNumber: 8, title: "Quadrilaterals", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-9", chapterNumber: 9, title: "Areas of Parallelograms and Triangles", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-10", chapterNumber: 10, title: "Circles", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-11", chapterNumber: 11, title: "Constructions", unit: "Unit IV: Geometry", mastery: 0, status: "not_started" },
        { id: "ch-12", chapterNumber: 12, title: "Heron’s Formula", unit: "Unit V: Mensuration", mastery: 0, status: "not_started" },
        { id: "ch-13", chapterNumber: 13, title: "Surface Areas and Volumes", unit: "Unit V: Mensuration", mastery: 0, status: "not_started" },
        { id: "ch-14", chapterNumber: 14, title: "Statistics", unit: "Unit VI: Statistics & Probability", mastery: 15, status: "in_progress" },
        { id: "ch-15", chapterNumber: 15, title: "Probability", unit: "Unit VI: Statistics & Probability", mastery: 0, status: "not_started" },
      ],
    });
  }
  return request(`/api/students/${studentId}/subjects/${subjectId}/roadmap`);
}

/* ------------------------- Topic details ------------------------- */

export async function getTopicDetails(studentId, topicId) {
  if (USE_MOCKS) {
    return delay({
      id: topicId,
      title: "Linear Equations",
      description:
        "Solving one-variable and two-step linear equations, and translating word problems into equations.",
      mastery: 47,
      resources: [
        { id: "r1", type: "video", title: "Intro to Linear Equations", duration: "8 min" },
        { id: "r2", type: "note", title: "Worked examples: 2-step equations", duration: "5 min read" },
        { id: "r3", type: "example", title: "Common mistakes: sign errors", duration: "3 min read" },
      ],
      nextSteps: [
        "Review the sign-error walkthrough — this is your most frequent slip.",
        "Attempt 10 Level-2 practice questions.",
      ],
    });
  }
  return request(`/api/students/${studentId}/topics/${topicId}`);
}

export async function markResourceReviewed(studentId, resourceId) {
  if (USE_MOCKS) return delay({ success: true });
  return request(`/api/students/${studentId}/resources/${resourceId}/reviewed`, {
    method: "POST",
  });
}

/* ----------------------------- Quiz ------------------------------ */

export async function startQuiz(studentId, topicId, mode = "quiz") {
  if (USE_MOCKS) {
    return delay({
      quizId: "quiz_" + topicId,
      mode,
      topicTitle: "Linear Equations",
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt: "Solve for x: 2x + 3 = 11",
          options: ["x = 3", "x = 4", "x = 5", "x = 8"],
          correctAnswer: "x = 4",
          explanation: "Subtract 3 from both sides to get 2x = 8, then divide by 2 to get x = 4.",
          hint: "Isolate the term with x first by moving the constant to the other side.",
          difficulty: "easy",
        },
        {
          id: "q2",
          type: "mcq",
          prompt: "Solve for x: 5x - 7 = 3x + 9",
          options: ["x = 6", "x = 8", "x = -8", "x = 2"],
          correctAnswer: "x = 8",
          explanation: "Move variable terms to one side: 5x - 3x = 9 + 7, so 2x = 16, x = 8.",
          hint: "Collect x terms on one side and constants on the other before dividing.",
          difficulty: "medium",
        },
        {
          id: "q3",
          type: "short_text",
          prompt: "A number tripled, then decreased by 4, equals 11. What is the number?",
          correctAnswer: "5",
          explanation: "3x - 4 = 11 → 3x = 15 → x = 5.",
          hint: "Translate the sentence into an equation, then solve step by step.",
          difficulty: "medium",
        },
      ],
    });
  }
  return request(`/api/students/${studentId}/topics/${topicId}/quiz?mode=${mode}`);
}

export async function submitQuizAttempt(studentId, quizId, answers, timeTakenSec) {
  if (USE_MOCKS) {
    const correct = Math.max(1, Math.round(answers.length * 0.67));
    return delay({
      score: correct,
      total: answers.length,
      accuracy: Math.round((correct / answers.length) * 100),
      timeTakenSec,
      masteryBefore: 47,
      masteryAfter: 55,
      nextRecommendedAction: {
        topic: "Linear Equations",
        reason: "Great progress — try 5 more Level-2 questions to push past 60% mastery.",
        actionType: "practice",
      },
    });
  }
  return request(`/api/students/${studentId}/quizzes/${quizId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers, timeTakenSec }),
  });
}

export async function getSimilarQuestion(studentId, questionId) {
  if (USE_MOCKS) {
    return delay({
      id: "q1_similar",
      type: "mcq",
      prompt: "Solve for x: 3x + 5 = 20",
      options: ["x = 4", "x = 5", "x = 6", "x = 15"],
      correctAnswer: "x = 5",
      explanation: "Subtract 5 from both sides to get 3x = 15, then divide by 3 to get x = 5.",
      hint: "Same steps as before: isolate the x term, then divide.",
      difficulty: "easy",
    });
  }
  return request(`/api/students/${studentId}/questions/${questionId}/similar`);
}

/* --------------------------- Analysis ----------------------------- */

export async function getStudentAnalysis(studentId) {
  if (USE_MOCKS) {
    return delay({
      overallMastery: 63,
      topicMastery: [
        { topic: "Fractions", mastery: 84 },
        { topic: "Linear Eq.", mastery: 47 },
        { topic: "Geometry", mastery: 55 },
        { topic: "Algebra Basics", mastery: 72 },
        { topic: "Whole Numbers", mastery: 92 },
        { topic: "Word Problems", mastery: 40 },
      ],
      growthOverTime: [
        { period: "Week 1", mastery: 48 },
        { period: "Week 2", mastery: 52 },
        { period: "Week 3", mastery: 55 },
        { period: "Week 4", mastery: 59 },
        { period: "Week 5", mastery: 63 },
      ],
      errorPatterns: [
        { pattern: "Sign errors in algebra", frequency: "Seen in 6 of last 10 attempts" },
        { pattern: "Misreading word problems into equations", frequency: "Seen in 3 of last 10 attempts" },
      ],
      explanation:
        "Your mastery is 63% because you're strong in Whole Numbers and Fractions, and steadily improving in Algebra — Linear Equations and Word Problems are your best next focus.",
    });
  }
  return request(`/api/students/${studentId}/analysis`);
}

/* -------------------------- Report card ---------------------------- */

export async function getReportCard(studentId, type = "marks") {
  if (USE_MOCKS) {
    return delay({
      type,
      studentName: "Aanya Sharma",
      rollNo: "STU-4819",
      classSection: "Class 9-A",
      academicYear: "2025–2026",
      schoolName: "LearnLoop Demonstration Academy",
      attendance: { present: 46, total: 50, percentage: 92 },
      overallScore: 84.4,
      overallMastery: 63,
      rank: "Rank 4 in Class 9-A",
      rankCohort: "Top 10%",
      lastUpdated: "24 September 2026",
      assessments: {
        halfYearly: [
          { subject: "Mathematics", marks: 92, maxMarks: 100, grade: "A+", result: "Pass", percentile: 94 },
          { subject: "Science", marks: 86, maxMarks: 100, grade: "A", result: "Pass", percentile: 88 },
          { subject: "English Language & Literature", marks: 82, maxMarks: 100, grade: "A", result: "Pass", percentile: 85 },
          { subject: "Hindi Course", marks: 90, maxMarks: 100, grade: "A+", result: "Pass", percentile: 92 },
          { subject: "Social Science", marks: 78, maxMarks: 100, grade: "B+", result: "Pass", percentile: 80 },
          { subject: "Information Technology", marks: 98, maxMarks: 100, grade: "A+", result: "Pass", percentile: 99 },
        ],
        unitTest2: [
          { subject: "Mathematics", marks: 88, maxMarks: 100, grade: "A", result: "Pass", percentile: 90 },
          { subject: "Science", marks: 84, maxMarks: 100, grade: "A", result: "Pass", percentile: 86 },
          { subject: "English Language & Literature", marks: 80, maxMarks: 100, grade: "A-", result: "Pass", percentile: 82 },
          { subject: "Hindi Course", marks: 88, maxMarks: 100, grade: "A", result: "Pass", percentile: 90 },
          { subject: "Social Science", marks: 74, maxMarks: 100, grade: "B", result: "Pass", percentile: 76 },
          { subject: "Information Technology", marks: 95, maxMarks: 100, grade: "A+", result: "Pass", percentile: 96 },
        ],
        unitTest1: [
          { subject: "Mathematics", marks: 76, maxMarks: 100, grade: "B+", result: "Pass", percentile: 78 },
          { subject: "Science", marks: 78, maxMarks: 100, grade: "B+", result: "Pass", percentile: 80 },
          { subject: "English Language & Literature", marks: 75, maxMarks: 100, grade: "B+", result: "Pass", percentile: 77 },
          { subject: "Hindi Course", marks: 84, maxMarks: 100, grade: "A", result: "Pass", percentile: 85 },
          { subject: "Social Science", marks: 70, maxMarks: 100, grade: "B", result: "Pass", percentile: 72 },
          { subject: "Information Technology", marks: 90, maxMarks: 100, grade: "A", result: "Pass", percentile: 92 },
        ],
      },
      performance: {
        totalGrowth: "+16.0%",
        growthTrajectory: [
          { exam: "Unit Test 1", score: 76, benchmark: 80 },
          { exam: "Diagnostic 1", score: 80, benchmark: 80 },
          { exam: "Unit Test 2", score: 85, benchmark: 80 },
          { exam: "Mid-Term Review", score: 82, benchmark: 80 },
          { exam: "Half Yearly", score: 88, benchmark: 80 },
          { exam: "Reassessment", score: 92, benchmark: 80 },
        ],
        subjectGrowth: [
          {
            subject: "Mathematics",
            growth: "+16%",
            mastery: 63,
            marks: 92,
            status: "Accelerated Growth",
            statusColor: "text-blue-600 bg-blue-50 border-blue-200",
            description: "Exceptional grasp over Fractions (84%) & Polynomials (62%). Linear Equations improving rapidly with sign-rule practice.",
          },
          {
            subject: "Science",
            growth: "+10%",
            mastery: 72,
            marks: 86,
            status: "Consistent Achiever",
            statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
            description: "Strong conceptual understanding in Cell Biology, Tissues, and Laws of Motion.",
          },
          {
            subject: "Information Technology",
            growth: "+14%",
            mastery: 88,
            marks: 98,
            status: "Top Performer",
            statusColor: "text-indigo-700 bg-indigo-50 border-indigo-200",
            description: "Swift practical execution in electronic spreadsheets, digital docs, and cybersecurity basics.",
          },
          {
            subject: "Hindi Course",
            growth: "+8%",
            mastery: 78,
            marks: 90,
            status: "Proficient",
            statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
            description: "High accuracy in grammar and creative writing expressions.",
          },
          {
            subject: "English Literature",
            growth: "+7%",
            mastery: 80,
            marks: 82,
            status: "Proficient",
            statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
            description: "Strong reading comprehension; formal writing tone is clear and well-structured.",
          },
          {
            subject: "Social Science",
            growth: "+8%",
            mastery: 58,
            marks: 78,
            status: "Developing",
            statusColor: "text-amber-700 bg-amber-50 border-amber-200",
            description: "Accurate geographical map work; continuing to expand historical context in structured answers.",
          },
        ],
        topicGains: [
          { topic: "Fractions & Decimals", preTest: 52, postTest: 84, gain: "+32%", status: "Mastered" },
          { topic: "Linear Equations", preTest: 32, postTest: 47, gain: "+15%", status: "In Progress" },
          { topic: "Polynomials", preTest: 40, postTest: 62, gain: "+22%", status: "Mastered" },
          { topic: "Geometry (Lines & Angles)", preTest: 36, postTest: 48, gain: "+12%", status: "In Progress" },
          { topic: "Statistics & Probability", preTest: 15, postTest: 15, gain: "Baseline", status: "Starting" },
        ],
      },
      feedback: [
        {
          id: "fb-1",
          teacherName: "Mr. David Evans",
          role: "Mathematics Teacher",
          avatarInitials: "DE",
          avatarBg: "bg-blue-600",
          date: "2 days ago",
          comment: "Aanya is an enthusiastic and diligent learner. Her fraction operations and polynomials work are exemplary. By continuing to practice inverse operations in two-step linear equations, she will easily attain the top grade bracket.",
          tags: ["Algebra Focus", "High Diligence", "Consistent Practice"],
        },
        {
          id: "fb-2",
          teacherName: "Mrs. Jaspreet Stevenson",
          role: "Science Teacher",
          avatarInitials: "JS",
          avatarBg: "bg-emerald-600",
          date: "4 days ago",
          comment: "Exhibits positive scientific attitude and thorough lab journal work. Conceptual questions on forces and laws of motion were answered with clear reasoning.",
          tags: ["Strong Concepts", "Methodical Thinker"],
        },
        {
          id: "fb-3",
          teacherName: "Mr. Sourav Agarwal",
          role: "Social Science Teacher",
          avatarInitials: "SA",
          avatarBg: "bg-amber-600",
          date: "1 week ago",
          comment: "Aanya exhibits a positive outlook and keen engagement in class discussions. Map work in geography is precise; could incorporate more historical dates in long-form answers.",
          tags: ["Engaged Learner", "Map Skills"],
        },
        {
          id: "fb-4",
          teacherName: "Mrs. Clara Drake",
          role: "Class Mentor & Coordinator",
          avatarInitials: "CD",
          avatarBg: "bg-indigo-600",
          date: "1 week ago",
          comment: "Commendable attendance (92%) and continuous study streak. Responsive to targeted practice recommendations and collaborative with peers in group discussions.",
          tags: ["92% Attendance", "Proactive"],
        },
      ],
      achievements: [
        {
          id: "ach-1",
          title: "All India Math Olympiad (School Level)",
          date: "Feb 23, 2026",
          badge: "Rank 3 · Distinction",
          color: "bg-amber-400 text-amber-950",
          iconType: "olympiad",
          description: "Ranked 3rd in the Class 9 division for exceptional problem-solving speed.",
        },
        {
          id: "ach-2",
          title: "12-Day Active Practice Streak",
          date: "Sep 22, 2026",
          badge: "Top 5% Consistency",
          color: "bg-blue-500 text-white",
          iconType: "streak",
          description: "Maintained a continuous daily practice habit on diagnostic & review drills.",
        },
        {
          id: "ach-3",
          title: "Class Rank 1 in Information Technology",
          date: "Aug 28, 2026",
          badge: "Score: 98/100",
          color: "bg-emerald-500 text-white",
          iconType: "tech",
          description: "Achieved the highest practical assessment score in electronic spreadsheets.",
        },
        {
          id: "ach-4",
          title: "Fractions Diagnostic Mastery Award",
          date: "Sep 18, 2026",
          badge: "100% Accuracy",
          color: "bg-indigo-500 text-white",
          iconType: "mastery",
          description: "Perfect score on advanced fraction reduction and LCM operations.",
        },
        {
          id: "ach-5",
          title: "Problem Solver of the Month",
          date: "Aug 15, 2026",
          badge: "Teacher Commendation",
          color: "bg-rose-500 text-white",
          iconType: "award",
          description: "Recognized by the Mathematics department for creative solutions to geometry proofs.",
        },
      ],
    });
  }
  return request(`/api/students/${studentId}/report-card?type=${type}`);
}
