import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getStudentDashboard } from "../../api/client";
import PageShell from "../../components/PageShell";
import StudentNavbar from "../../components/StudentNavbar";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let active = true;
    getStudentDashboard(user?.id || "stu_001")
      .then((res) => {
        if (active) {
          setData(res);
          setTasks(res.upcomingTasks || []);
        }
      })
      .catch(() => active && setErr("Couldn't load your dashboard. Try refreshing."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.id]);

  function toggleTask(taskId) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  }

  if (loading) {
    return (
      <PageShell>
        <div className="p-8">
          <LoadingSkeleton />
        </div>
      </PageShell>
    );
  }

  if (err) {
    return (
      <PageShell>
        <div className="p-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
            {err}
          </div>
        </div>
      </PageShell>
    );
  }

  const overview = data?.overviewStats || {
    averageScore: "48%",
    assessmentsCountText: "7 of 8 assessments",
    enrolledCourses: 2,
    enrolledLabel: "Class 9 Mathematics",
    submittedCount: 7,
    submittedLabel: "assessments completed",
    pendingCount: 1,
    pendingLabel: "not submitted yet",
  };

  const performanceHistory = data?.performanceHistory || [
    { attempt: "1", score: 32, label: "Fractions Pre-Test" },
    { attempt: "2", score: 32, label: "Diagnostic Check" },
    { attempt: "3", score: 50, label: "Linear Eq. Drill" },
    { attempt: "4", score: 58, label: "Polynomials Quiz" },
    { attempt: "5", score: 48, label: "Geometry Review" },
  ];

  const weeklyProgress = data?.weeklyProgress || {
    percentage: 75,
    dateRange: "12 Jan - 19 Jan",
    targetLabel: "7/10 topics on track",
    subtitle: "Class 9 Mathematics",
  };

  const recentResults = data?.recentResults || [
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
  ];

  const lessons = data?.todayLessons || [];
  const events = data?.events || [];

  const masteryScore = data?.overallMastery ?? 63;
  const masteryBand =
    masteryScore >= 80
      ? { label: "Secure", color: "bg-emerald-50 text-emerald-700 border-emerald-200/70" }
      : masteryScore >= 60
      ? { label: "Proficient", color: "bg-blue-50 text-blue-700 border-blue-200/70" }
      : masteryScore >= 40
      ? { label: "Developing", color: "bg-amber-50 text-amber-700 border-amber-200/70" }
      : { label: "Needs Support", color: "bg-rose-50 text-rose-700 border-rose-200/70" };

  const recommendation = data?.nextRecommendedAction || {
    subject: "Mathematics",
    topic: "Linear Equations",
    reason: "Your accuracy dipped on 2-step equations in the last attempt. Complete targeted practice to reinforce sign rules before reassessment.",
    actionType: "practice",
    estTime: "12 mins",
    questionsCount: 10,
    topicId: "t3",
  };

  const displayName = user?.name ? user.name.split(" ")[0] : "Aanya";
  const studentFullName = user?.name || "Aanya Sharma";
  const studentEmail = user?.email && !user.email.includes("demo") && !user.email.includes("krmu")
    ? user.email
    : "aanya.sharma@learnloop.org";
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AS";

  return (
    <PageShell>
      <div className="min-h-full flex flex-col bg-[#f8fafd]">
        {/* ============================================================== */}
        {/* OVERALL STUDENT DASHBOARD TOP NAVBAR                           */}
        {/* Includes full search bar, small profile image, name & email ID */}
        {/* ============================================================== */}
        <StudentNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* ============================================================== */}
        {/* DASHBOARD MAIN CONTENT (Workspace + Right Rail)                */}
        {/* ============================================================== */}
        <div className="flex flex-col xl:flex-row flex-1">
          {/* ============================================================== */}
          {/* CENTER / MAIN WORKSPACE (~68% on xl screens)                   */}
          {/* ============================================================== */}
          <div className="flex-1 p-5 sm:p-7 lg:p-9 border-b xl:border-b-0 xl:border-r border-slate-100">
            {/* Welcome Header (cleanly at the top of the workspace) */}
            <div className="mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back, {displayName}!
              </h1>
              <p className="text-sm text-slate-400 mt-1">Here's an overview of your dashboard</p>
            </div>

          {/* Row: Student Profile Bar + Overall Mastery Card (side by side, same height) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5 items-stretch">
            {/* Student Profile Bar Card (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Clean Profile Icon Avatar */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Student Info Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                        {studentFullName}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {studentEmail}
                      </p>
                    </div>
                  </div>

                  {/* 4 Metadata Badges / Pills */}
                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    {/* Student ID Pill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
                      <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      <span>STU-4819</span>
                    </span>

                    {/* Session Pill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>2025–26</span>
                    </span>

                    {/* Class / Section Pill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                      <span>Class 9-A</span>
                    </span>

                    {/* Subject / Track Pill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Mathematics Core</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Mastery Card (Beside profile bar on the right side, same height, smaller width) */}
            <div
              onClick={() => navigate("/analysis")}
              className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  OVERALL MASTERY
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${masteryBand.color}`}>
                  {masteryBand.label}
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    {masteryScore}%
                  </span>
                  <span className="text-xs text-slate-400 font-medium">Class 9 Math</span>
                </div>
                {/* Horizontal Mastery Bar */}
                <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${masteryScore}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-500">
                  <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Target: 80% Secure
                </span>
                <span className="font-medium text-blue-600 group-hover:underline">
                  View diagnostic →
                </span>
              </div>
            </div>
          </div>

          {/* Next Recommendation Card (below profile bar & overall mastery card) */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 shadow-xs mb-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Next Recommended
                  </span>
                  <span className="text-xs font-semibold text-blue-900">
                    {recommendation.subject} · {recommendation.topic}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700 leading-snug">
                  {recommendation.reason}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Estimated: {recommendation.estTime}
                  </span>
                  <span>•</span>
                  <span>{recommendation.questionsCount} targeted practice questions</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2.5">
                <Link
                  to={`/topics/${recommendation.topicId}`}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
                >
                  View Topic
                </Link>
                <Link
                  to={`/quiz/${recommendation.topicId}?mode=practice`}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                >
                  <span>Continue Learning</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* 3 Top Stat Cards Row - Enrolled courses removed */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
            {/* Card 1: AVERAGE SCORE (Highlighted soft blue card) */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  AVERAGE SCORE
                </span>
                <span className="text-blue-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-blue-600 tracking-tight">
                  {overview.averageScore}
                </p>
                <p className="text-xs text-slate-400 mt-1">{overview.assessmentsCountText}</p>
              </div>
            </div>

            {/* Card 2: SUBMITTED */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  SUBMITTED
                </span>
                <span className="text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-slate-800 tracking-tight">
                  {overview.submittedCount}
                </p>
                <p className="text-xs text-slate-400 mt-1">{overview.submittedLabel}</p>
              </div>
            </div>

            {/* Card 3: PENDING */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                  PENDING
                </span>
                <span className="text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                  </svg>
                </span>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-slate-800 tracking-tight">
                  {overview.pendingCount}
                </p>
                <p className="text-xs text-slate-400 mt-1">{overview.pendingLabel}</p>
              </div>
            </div>
          </div>

          {/* Performance Card - Modern Composed Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Performance & Trajectory</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assessment attempts over time compared against the 80% mastery benchmark
                </p>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-400/80" />
                  <span>Score</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-3.5 h-0.5 bg-blue-600" />
                  <span>Trend</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>80% Target</span>
                </span>
              </div>
            </div>

            {/* Recharts Composed Chart (Bar + Smooth Line + ReferenceLine) */}
            <div className="w-full h-60 sm:h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={performanceHistory}
                  margin={{ top: 12, right: 15, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(val) => {
                      if (!val) return "";
                      return val
                        .replace(" Pre-Test", "")
                        .replace(" Review", "")
                        .replace(" Drill", "")
                        .replace(" Quiz", "")
                        .replace(" Check", "");
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 backdrop-blur-xs text-white text-xs rounded-xl py-2 px-3 shadow-lg border border-slate-800">
                            <p className="font-semibold text-slate-100">{item.label}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">Attempt {item.attempt}</p>
                            <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-slate-800">
                              <span className="text-blue-300 font-display font-bold">
                                Score: {item.score}%
                              </span>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  item.score >= 80
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : item.score >= 60
                                    ? "bg-blue-500/20 text-blue-300"
                                    : "bg-amber-500/20 text-amber-300"
                                }`}
                              >
                                {item.score >= 80 ? "Secure" : item.score >= 60 ? "Proficient" : "Developing"}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="score"
                    barSize={32}
                    radius={[6, 6, 0, 0]}
                    fill="url(#barGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#1d4ed8", strokeWidth: 2, stroke: "#ffffff" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Section: My lessons today (Class 9 Math Schedule) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-base text-slate-900">
                My lessons today
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>15 January, Wed</span>
              </div>
            </div>

            {/* 3 Horizontal Lesson Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-xs hover:border-slate-200 transition-all"
                >
                  {/* Time Pill */}
                  <div className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold shrink-0">
                    {lesson.time}
                  </div>

                  {/* Title & Teacher */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {lesson.teacher ? lesson.teacher[0] : "T"}
                      </span>
                      <p className="text-[11px] text-slate-400 truncate">{lesson.teacher}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT RAIL (~32% on xl screens)                                */}
        {/* ============================================================== */}
        <div className="w-full xl:w-96 bg-white/70 backdrop-blur-xs p-5 sm:p-7 flex flex-col gap-6">
          {/* 1. Weekly Progress Card (KEPT AS IS as requested!) */}
          <div
            onClick={() => navigate("/analysis")}
            className="cursor-pointer rounded-3xl bg-[#4f83f7] p-6 text-white shadow-md shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-semibold text-base">Weekly progress</h3>
                <p className="text-xs text-blue-100/90 mt-0.5">{weeklyProgress.dateRange}</p>
              </div>
              <button
                type="button"
                aria-label="Options"
                className="text-white/80 hover:text-white"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>

            {/* Center Circular Progress Ring */}
            <div className="my-5 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Outer subtle dashed ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  {/* Inner track ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="5"
                  />
                  {/* Active stroke ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - (weeklyProgress.percentage || 75) / 100)}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Big Percentage Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-xs">
                    {weeklyProgress.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Target Label */}
            <p className="text-center text-xs font-medium text-blue-100">
              {weeklyProgress.targetLabel}
            </p>
          </div>

          {/* 2. Quick actions Card (matching reference image) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-3">
              <h3 className="font-display font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Quick actions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Jump straight in — no need to open a course</p>
            </div>

            <div className="py-4 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-700">You're all caught up</p>
              <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5">
                No pending diagnostics right now. Practice to boost your mastery score.
              </p>
              <button
                onClick={() => navigate("/quiz/t3?mode=practice")}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                <span>Practice Linear Equations</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* 3. Recent results Card (matching reference image) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="mb-3">
              <h3 className="font-display font-semibold text-sm text-slate-800">Recent results</h3>
              <p className="text-xs text-slate-400 mt-0.5">Your latest assessments</p>
            </div>

            <div className="divide-y divide-slate-100">
              {recentResults.map((res) => (
                <div key={res.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{res.title}</p>
                    <p className="text-[11px] text-slate-400">{res.topic} · {res.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800">{res.score}%</span>
                    <span
                      className={`block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                        res.score >= 80
                          ? "bg-emerald-50 text-emerald-700"
                          : res.score >= 60
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Upcoming tasks Section (Class 9 Math) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="font-display font-semibold text-sm text-slate-800 mb-3">
              Upcoming tasks
            </h3>
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      task.done
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border-2 border-slate-300 group-hover:border-blue-400 bg-white"
                    }`}
                  >
                    {task.done && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-xs transition-colors ${
                      task.done
                        ? "text-slate-400 line-through"
                        : "text-slate-700 font-medium group-hover:text-slate-900"
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Events Section (Math doubt clinic & sessions) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-sm text-slate-800">Events</h3>
              <span className="text-xs text-slate-400 hover:text-blue-600 cursor-pointer">
                See all
              </span>
            </div>

            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.id} className="text-left">
                  <p className="text-xs font-semibold text-slate-800">{evt.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{evt.datetime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageShell>
);
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
      </div>
      <div className="h-64 bg-slate-200 rounded-2xl" />
    </div>
  );
}
