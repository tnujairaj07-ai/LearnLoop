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
import {
  getStudentDashboard,
  createStudentTask,
  toggleStudentTask,
} from "../../api/client";
import PageShell from "../../components/PageShell";
import StudentNavbar from "../../components/StudentNavbar";

function getBandStyle(score, hasEvidence) {
  if (!hasEvidence && score === 0) {
    return {
      label: "Getting Started",
      color: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  if (score >= 80) {
    return {
      label: "Secure",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    };
  }
  if (score >= 60) {
    return {
      label: "Proficient",
      color: "bg-blue-50 text-blue-700 border-blue-200/70",
    };
  }
  if (score >= 40) {
    return {
      label: "Developing",
      color: "bg-amber-50 text-amber-700 border-amber-200/70",
    };
  }
  return {
    label: "Needs Strong Support",
    color: "bg-rose-50 text-rose-700 border-rose-200/70",
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setErr("");
    return getStudentDashboard()
      .then((res) => {
        setData(res);
        setTasks(res?.upcoming_tasks || []);
      })
      .catch(() => setErr("Couldn't load your dashboard. Try refreshing."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getStudentDashboard()
      .then((res) => {
        if (active) {
          setData(res);
          setTasks(res?.upcoming_tasks || []);
        }
      })
      .catch(() => active && setErr("Couldn't load your dashboard. Try refreshing."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleToggleTask(task) {
    const nextDone = !task.is_done;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_done: nextDone } : t))
    );
    try {
      await toggleStudentTask(task.id, nextDone);
    } catch {
      // Revert optimistic toggle if API fails
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_done: task.is_done } : t))
      );
    }
  }

  async function handleAddTask(e) {
    e.preventDefault();
    const trimmed = newTaskTitle.trim();
    if (!trimmed || addingTask) return;
    setAddingTask(true);
    try {
      const res = await createStudentTask(trimmed);
      if (res?.task) {
        setTasks((prev) => [res.task, ...prev]);
        setNewTaskTitle("");
      }
    } catch {
      // Keep input text so student can retry
    } finally {
      setAddingTask(false);
    }
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
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 flex items-center justify-between gap-4">
            <span>{err}</span>
            <button
              type="button"
              onClick={loadDashboard}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const rawOverview = data?.overview_stats || {};
  const submittedCount = rawOverview.submitted_count ?? 0;
  const pendingCount = rawOverview.pending_count ?? 0;
  const totalAssessments = submittedCount + pendingCount;

  const overview = {
    averageScore:
      rawOverview.average_score != null
        ? `${Math.round(rawOverview.average_score)}%`
        : "0%",
    assessmentsCountText:
      totalAssessments > 0
        ? `${submittedCount} of ${totalAssessments} assessments`
        : "No assessments attempted yet",
    submittedCount,
    submittedLabel:
      submittedCount === 1 ? "assessment completed" : "assessments completed",
    pendingCount,
    pendingLabel:
      pendingCount === 0
        ? "all caught up"
        : pendingCount === 1
        ? "assessment pending"
        : "assessments pending",
  };

  const performanceHistory = (data?.performance_history || []).map((item, idx) => ({
    attempt: item.attempt ?? idx + 1,
    score: Math.round(item.score ?? 0),
    label: item.label || `Attempt ${idx + 1}`,
  }));

  const rawWeekly = data?.weekly_progress || {};
  const weeklyPercentage = Math.round(rawWeekly.percentage ?? 0);
  const weeklyProgress = {
    percentage: weeklyPercentage,
    dateRange: rawWeekly.date_range || "Current Week",
    targetLabel: `${rawWeekly.active_minutes ?? 0}/${
      rawWeekly.target_minutes ?? 180
    } mins · ${rawWeekly.tasks_completed ?? 0} tasks`,
  };

  const recentResults = data?.recent_results || [];
  const lessons = data?.today_lessons || [];
  const events = data?.events || [];
  const announcements = data?.announcements || [];

  const masteryScore = Math.round(data?.overall_mastery ?? 0);
  const hasEvidence =
    submittedCount > 0 ||
    (data?.topic_summaries || []).some((t) => (t.evidence_count || 0) > 0);
  const masteryBand = getBandStyle(masteryScore, hasEvidence);

  const recommendation = data?.next_recommended_action || null;

  const displayName = user?.name ? user.name.split(" ")[0] : "Student";
  const studentFullName = user?.name || "Student";
  const studentEmail = user?.email || "";
  const studentPublicId =
    user?.public_id || (user?.id ? `STU-${user.id}` : "STUDENT");
  const primaryClass = data?.classes?.[0];
  const classBadgeLabel =
    primaryClass?.class_name || user?.class_name || user?.grade || "Class 9";
  const todayLabel = new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

  return (
    <PageShell>
      <div className="min-h-full flex flex-col bg-[#f8fafd]">
        <StudentNavbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          reminders={data?.reminders}
          topics={data?.topic_summaries}
          nextAction={recommendation}
        />

        <div className="flex flex-col xl:flex-row flex-1">
          {/* CENTER / MAIN WORKSPACE */}
          <div className="flex-1 p-5 sm:p-7 lg:p-9 border-b xl:border-b-0 xl:border-r border-slate-100">
            <div className="mb-6">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welcome back, {displayName}!
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Here's an overview of your learning progress
              </p>
            </div>

            {/* Row: Student Profile Bar + Overall Mastery Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5 items-stretch">
              <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs">
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

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

                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
                        <svg
                          className="w-3 h-3 text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                        <span>{studentPublicId}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                        <svg
                          className="w-3 h-3 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>2025–26</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                        <svg
                          className="w-3 h-3 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 14l9-5-9-5-9 5 9 5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                          />
                        </svg>
                        <span>{classBadgeLabel}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
                        <svg
                          className="w-3 h-3 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Mathematics Core</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Mastery Card */}
              <div
                onClick={() => navigate("/analysis")}
                className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    OVERALL MASTERY
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${masteryBand.color}`}
                  >
                    {masteryBand.label}
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                      {masteryScore}%
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {user?.grade || "Class 9"} Math
                    </span>
                  </div>
                  <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${masteryScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-slate-500">
                    <svg
                      className="w-3 h-3 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Target: 80% Secure
                  </span>
                  <span className="font-medium text-blue-600 group-hover:underline">
                    View diagnostic →
                  </span>
                </div>
              </div>
            </div>

            {/* Next Recommendation Card */}
            {recommendation ? (
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 shadow-xs mb-6 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Next Recommended
                      </span>
                      <span className="text-xs font-semibold text-blue-900">
                        {recommendation.subject || "Mathematics"} ·{" "}
                        {recommendation.topic}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 leading-snug">
                      {recommendation.reason}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                      <span className="inline-flex items-center gap-1 text-slate-600 font-medium capitalize">
                        Action: {recommendation.action_type || "practice"}
                      </span>
                      {recommendation.priority && (
                        <>
                          <span>•</span>
                          <span className="capitalize">
                            Priority: {recommendation.priority}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2.5">
                    <Link
                      to={`/topic/${recommendation.topic_id}`}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 shadow-2xs transition-all"
                    >
                      View Topic
                    </Link>
                    <Link
                      to={`/quiz/${recommendation.topic_id}?mode=${
                        recommendation.action_type === "reassess"
                          ? "reassess"
                          : "practice"
                      }`}
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs shadow-blue-500/20 flex items-center gap-1.5 transition-all"
                    >
                      <span>Continue Learning</span>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1 max-w-xl">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    Getting Started
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    Ready to calibrate your learning profile?
                  </p>
                  <p className="text-xs text-slate-500">
                    Start a topic practice or diagnostic assessment from the
                    Practice Hub to unlock personalized mastery tracking and
                    recommendations.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2.5">
                  <Link
                    to="/roadmap"
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Explore Roadmap
                  </Link>
                  <Link
                    to="/practice"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs transition-all"
                  >
                    Open Practice Hub →
                  </Link>
                </div>
              </div>
            )}

            {/* 3 Top Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                    AVERAGE SCORE
                  </span>
                  <span className="text-blue-500">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </span>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-blue-600 tracking-tight">
                    {overview.averageScore}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {overview.assessmentsCountText}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    SUBMITTED
                  </span>
                  <span className="text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4"
                      />
                    </svg>
                  </span>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-slate-800 tracking-tight">
                    {overview.submittedCount}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {overview.submittedLabel}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    PENDING
                  </span>
                  <span className="text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 7v5l3 3"
                      />
                    </svg>
                  </span>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold text-slate-800 tracking-tight">
                    {overview.pendingCount}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {overview.pendingLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-display font-semibold text-base text-slate-800 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span>Performance & Trajectory</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assessment attempts over time compared against the 80%
                    mastery benchmark
                  </p>
                </div>

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

              {performanceHistory.length > 0 ? (
                <div className="w-full h-60 sm:h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={performanceHistory}
                      margin={{ top: 12, right: 15, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="barGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.85}
                          />
                          <stop
                            offset="100%"
                            stopColor="#60a5fa"
                            stopOpacity={0.35}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
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
                                <p className="font-semibold text-slate-100">
                                  {item.label}
                                </p>
                                <p className="text-slate-400 text-[10px] mt-0.5">
                                  Attempt {item.attempt}
                                </p>
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
                                    {item.score >= 80
                                      ? "Secure"
                                      : item.score >= 60
                                      ? "Proficient"
                                      : "Developing"}
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
                        dot={{
                          r: 4,
                          fill: "#2563eb",
                          strokeWidth: 2,
                          stroke: "#ffffff",
                        }}
                        activeDot={{
                          r: 6,
                          fill: "#1d4ed8",
                          strokeWidth: 2,
                          stroke: "#ffffff",
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center p-6">
                  <p className="text-sm font-semibold text-slate-700">
                    No assessment attempts recorded yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Complete your first diagnostic check or topic quiz to chart
                    your score progression here.
                  </p>
                  <Link
                    to="/practice"
                    className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Go to Practice Hub
                  </Link>
                </div>
              )}
            </div>

            {/* Bottom Section: My lessons today */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base text-slate-900">
                  My lessons today
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
                  <svg
                    className="w-3.5 h-3.5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>{todayLabel}</span>
                </div>
              </div>

              {lessons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-3 shadow-xs hover:border-slate-200 transition-all"
                    >
                      <div className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold shrink-0">
                        {lesson.time || "Scheduled"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {lesson.teacher ? lesson.teacher[0] : "T"}
                          </span>
                          <p className="text-[11px] text-slate-400 truncate">
                            {lesson.teacher || lesson.topic || "Class Session"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-xs text-slate-400">
                  No scheduled lessons for today. Explore your{" "}
                  <Link
                    to="/roadmap"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    curriculum roadmap
                  </Link>{" "}
                  anytime.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT RAIL */}
          <div className="w-full xl:w-96 bg-white/70 backdrop-blur-xs p-5 sm:p-7 flex flex-col gap-6">
            {/* 1. Weekly Progress Card */}
            <div
              onClick={() => navigate("/weekly-progress")}
              className="cursor-pointer rounded-3xl bg-[#4f83f7] p-6 text-white shadow-md shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:shadow-blue-500/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-base">
                    Weekly progress
                  </h3>
                  <p className="text-xs text-blue-100/90 mt-0.5">
                    {weeklyProgress.dateRange}
                  </p>
                </div>
                <span className="text-white/80 group-hover:text-white">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </span>
              </div>

              <div className="my-5 flex items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="54"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="5.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={
                        2 * Math.PI * 46 * (1 - weeklyProgress.percentage / 100)
                      }
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display text-3xl font-bold tracking-tight text-white drop-shadow-xs">
                      {weeklyProgress.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-blue-100 pt-1">
                <span>{weeklyProgress.targetLabel}</span>
                <span className="font-semibold text-white group-hover:underline flex items-center gap-0.5">
                  <span>View Details</span>
                  <span>→</span>
                </span>
              </div>
            </div>

            {/* 2. Quick actions Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-3">
                <h3 className="font-display font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Quick actions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jump straight in — no need to open a course
                </p>
              </div>

              <div className="py-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5 text-slate-400">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {pendingCount > 0
                    ? `${pendingCount} pending assessment${pendingCount > 1 ? "s" : ""}`
                    : "You're all caught up"}
                </p>
                <p className="text-[11px] text-slate-400 max-w-[220px] mt-0.5">
                  {recommendation
                    ? `Recommended focus: ${recommendation.topic}`
                    : "Open the Practice Hub to choose a chapter or quiz."}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      recommendation?.topic_id
                        ? `/quiz/${recommendation.topic_id}?mode=practice`
                        : "/practice"
                    )
                  }
                  className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <span>
                    {recommendation?.topic
                      ? `Practice ${recommendation.topic}`
                      : "Open Practice Hub"}
                  </span>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 3. Recent results Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-3">
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Recent results
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your latest assessments
                </p>
              </div>

              {recentResults.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentResults.map((res) => (
                    <div
                      key={res.id}
                      className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {res.topic} · {res.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800">
                          {Math.round(res.score ?? 0)}%
                        </span>
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
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  No graded assessments yet.
                </p>
              )}
            </div>

            {/* 4. Upcoming tasks Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h3 className="font-display font-semibold text-sm text-slate-800 mb-3">
                Upcoming tasks
              </h3>

              <form onSubmit={handleAddTask} className="flex gap-1.5 mb-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a study task..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={addingTask || !newTaskTitle.trim()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </form>

              {tasks.length > 0 ? (
                <div className="space-y-2.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                          task.is_done
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "border-2 border-slate-300 group-hover:border-blue-400 bg-white"
                        }`}
                      >
                        {task.is_done && (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-xs transition-colors ${
                          task.is_done
                            ? "text-slate-400 line-through"
                            : "text-slate-700 font-medium group-hover:text-slate-900"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No tasks yet. Add one above to plan your study session.
                </p>
              )}
            </div>

            {/* 5. Events & Announcements Section */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm text-slate-800">
                  Events
                </h3>
                <Link
                  to="/weekly-progress"
                  className="text-xs text-slate-400 hover:text-blue-600"
                >
                  Weekly view
                </Link>
              </div>

              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt.id} className="text-left">
                      <p className="text-xs font-semibold text-slate-800">
                        {evt.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                        <svg
                          className="w-3 h-3 text-slate-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{evt.datetime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No upcoming events scheduled.
                </p>
              )}

              {announcements.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Class Notices
                  </p>
                  {announcements.slice(0, 2).map((ann) => (
                    <p
                      key={ann.id}
                      className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100"
                    >
                      {ann.message}
                    </p>
                  ))}
                </div>
              )}
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
