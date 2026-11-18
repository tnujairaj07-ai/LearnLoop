import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../../components/PageShell";
import StudentNavbar from "../../components/StudentNavbar";
import { getWeeklyProgress } from "../../api/client";

function getHeatmapColor(status) {
  if (status === "active")
    return "bg-blue-600 text-white shadow-2xs hover:bg-blue-700";
  if (status === "light")
    return "bg-blue-100 text-blue-800 hover:bg-blue-200";
  return "bg-slate-100/80 text-slate-400 hover:bg-slate-200/80";
}

function getPerformanceSummary(score, sessionsCount) {
  if (sessionsCount === 0 && score === 0) {
    return {
      headline: "No scored sessions this week yet",
      feedback:
        "Complete a practice drill, assignment, or resource review to populate your weekly pace and mastery index.",
    };
  }
  if (score >= 80) {
    return {
      headline: "Strong weekly mastery!",
      feedback:
        "Your weekly assessment average is in the Secure band. Continue challenging yourself with medium-to-hard exercises.",
    };
  }
  if (score >= 60) {
    return {
      headline: "Solid consistent progress!",
      feedback:
        "You are performing in the Proficient band this week. Review any missed error tags before moving to reassessment.",
    };
  }
  return {
    headline: "Developing steady foundations",
    feedback:
      "Focus on worked examples and untimed topic drills this week to strengthen core concepts before reassessment.",
  };
}

export default function WeeklyProgress() {
  const [data, setData] = useState(null);
  const [selectedWeekKey, setSelectedWeekKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [hoveredWeek, setHoveredWeek] = useState(null);
  const [hoveredScheduleSlot, setHoveredScheduleSlot] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr("");
    getWeeklyProgress(selectedWeekKey)
      .then((res) => {
        if (!active) return;
        setData(res);
        if (!selectedWeekKey && res?.selected_week?.key) {
          setSelectedWeekKey(res.selected_week.key);
        }
        setHoveredWeek(res?.selected_week || null);
      })
      .catch(() => active && setErr("Couldn't load weekly progress. Try refreshing."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [selectedWeekKey]);

  const weeks = useMemo(() => data?.weeks || [], [data]);
  const currentWeek = data?.selected_week || {
    key: "week-8",
    label: "Current Week",
    date_range: "Current Week",
    tasks_completed: 0,
    active_topics: 0,
    total_topics: 0,
    mastered_count: 0,
    total_hours: 0,
    total_minutes: 0,
    channel_mobile_hours: 0,
    channel_web_hours: 0,
    performance_score: 0,
    sessions_count: 0,
    rank: null,
    total_peers: 0,
    rank_percentile: null,
    current_streak: 0,
    longest_streak: 0,
    tasks_history: [],
  };

  const prevWeek = useMemo(() => {
    const idx = weeks.findIndex((w) => w.key === currentWeek.key);
    return idx > 0 ? weeks[idx - 1] : null;
  }, [weeks, currentWeek.key]);

  const tasksHistory = useMemo(() => {
    if (Array.isArray(currentWeek.tasks_history) && currentWeek.tasks_history.length > 0) {
      return currentWeek.tasks_history;
    }
    return weeks.map((w) => w.tasks_completed || 0);
  }, [currentWeek, weeks]);

  const maxTaskBar = Math.max(1, ...tasksHistory);
  const activeRatio =
    currentWeek.total_topics > 0
      ? Math.min(1, currentWeek.active_topics / currentWeek.total_topics)
      : 0;

  const scheduleMatrix = data?.schedule_matrix || [];
  const sessions = data?.sessions || [];
  const perfCopy = getPerformanceSummary(
    Math.round(currentWeek.performance_score ?? 0),
    currentWeek.sessions_count ?? 0
  );

  // Compute Web vs Mobile donut fractions
  const totalChannelHours =
    Number(currentWeek.channel_mobile_hours ?? 0) +
    Number(currentWeek.channel_web_hours ?? 0);
  const mobileRatio =
    totalChannelHours > 0
      ? Number(currentWeek.channel_mobile_hours ?? 0) / totalChannelHours
      : 0;
  const webRatio =
    totalChannelHours > 0
      ? Number(currentWeek.channel_web_hours ?? 0) / totalChannelHours
      : 0;

  const tasksDelta = prevWeek
    ? currentWeek.tasks_completed - (prevWeek.tasks_completed || 0)
    : null;
  const minsDelta = prevWeek
    ? currentWeek.total_minutes - (prevWeek.total_minutes || 0)
    : null;

  return (
    <PageShell>
      <div className="flex-1 bg-[#f8fafd] min-h-screen">
        <StudentNavbar />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* 1. BREADCRUMB & HEADER SECTION */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200/70">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
                <Link
                  to="/dashboard"
                  className="hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-blue-600 font-bold">Weekly Progress</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <span>Weekly Learning Progress &amp; Activity</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70">
                  Class 9 Math
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Recorded weekly milestones, study slot intensity, and peer
                consistency metrics
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {weeks.length > 0 && (
                <select
                  value={currentWeek.key}
                  onChange={(e) => setSelectedWeekKey(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {[...weeks].reverse().map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label} ({item.date_range})
                    </option>
                  ))}
                </select>
              )}

              <Link
                to="/dashboard"
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>

          {loading && !data && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-36 rounded-2xl bg-slate-200/70" />
              ))}
            </div>
          )}

          {err && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 text-sm">
              {err}
            </div>
          )}

          {data && (
            <>
              {/* 2. TOP ROW: 4 KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {/* Card 1: Completed Tasks */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <p className="text-xs font-bold text-slate-600 tracking-tight">
                      Completed Activities
                    </p>
                    <div className="flex items-end justify-between mt-2 mb-3">
                      <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                          {currentWeek.tasks_completed}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {tasksDelta === null
                            ? `${currentWeek.sessions_count} sessions`
                            : tasksDelta >= 0
                            ? `+${tasksDelta} vs prior week`
                            : `${tasksDelta} vs prior week`}
                        </p>
                      </div>

                      <div className="flex items-end gap-1 h-10 pb-0.5">
                        {tasksHistory.map((h, i) => (
                          <div
                            key={i}
                            className={`w-1.5 rounded-full transition-all ${
                              i === tasksHistory.length - 1
                                ? "bg-blue-600"
                                : "bg-blue-400/80"
                            }`}
                            style={{
                              height: `${Math.max(4, Math.round((h / maxTaskBar) * 36))}px`,
                            }}
                            title={`Week ${i + 1}: ${h} activities`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsModal("tasks")}
                    className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1 pt-3 border-t border-slate-100 text-left cursor-pointer"
                  >
                    <span>See Details</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Card 2: Active Topics */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <p className="text-xs font-bold text-slate-600 tracking-tight">
                      Active Topics
                    </p>
                    <div className="flex items-end justify-between mt-2 mb-3">
                      <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                          {currentWeek.active_topics}
                        </h2>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          of {currentWeek.total_topics} syllabus topics
                        </p>
                      </div>

                      <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
                        <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="4"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 14}
                            strokeDashoffset={
                              2 * Math.PI * 14 * (1 - activeRatio)
                            }
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsModal("active")}
                    className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1 pt-3 border-t border-slate-100 text-left cursor-pointer"
                  >
                    <span>See Details</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Card 3: Topics Mastered */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <p className="text-xs font-bold text-slate-600 tracking-tight">
                      Topics Mastered
                    </p>
                    <div className="flex items-end justify-between mt-2 mb-3">
                      <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                          {currentWeek.mastered_count}
                        </h2>
                        <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                          Above threshold (80%+)
                        </p>
                      </div>

                      <div className="w-20 h-10 flex items-center shrink-0">
                        <svg
                          className="w-full h-full overflow-visible"
                          viewBox="0 0 80 40"
                        >
                          <defs>
                            <linearGradient
                              id="waveGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#3b82f6"
                                stopOpacity="0.4"
                              />
                              <stop
                                offset="100%"
                                stopColor="#3b82f6"
                                stopOpacity="0.0"
                              />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 0 32 Q 20 14 40 22 T 80 12 L 80 40 L 0 40 Z"
                            fill="url(#waveGradient)"
                          />
                          <path
                            d="M 0 32 Q 20 14 40 22 T 80 12"
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsModal("completed")}
                    className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1 pt-3 border-t border-slate-100 text-left cursor-pointer"
                  >
                    <span>See Details</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Card 4: Peer Standing */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <p className="text-xs font-bold text-slate-600 tracking-tight">
                      Class Standing
                    </p>
                    <div className="flex items-end justify-between mt-2 mb-3">
                      <div>
                        <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                          {currentWeek.rank != null ? `#${currentWeek.rank}` : "—"}
                        </h2>
                        <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                          {currentWeek.rank_percentile != null
                            ? `Top ${currentWeek.rank_percentile}% · ${currentWeek.current_streak}d streak`
                            : `${currentWeek.current_streak}d streak · Complete sessions`}
                        </p>
                      </div>

                      <div className="flex items-end gap-1 h-10 pb-0.5">
                        <div className="w-1.5 h-3 bg-blue-300 rounded-full" />
                        <div className="w-1.5 h-5 bg-blue-400 rounded-full" />
                        <div className="w-1.5 h-7 bg-blue-500 rounded-full" />
                        <div className="w-1.5 h-9 bg-blue-600 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsModal("leaderboard")}
                    className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors flex items-center gap-1 pt-3 border-t border-slate-100 text-left cursor-pointer"
                  >
                    <span>See Details</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

              {/* 3. MIDDLE ROW: USER PERFORMANCE GAUGE + 8-WEEK MATRIX */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between relative">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">
                        Weekly Performance
                      </h3>
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {currentWeek.date_range}
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center my-4 relative">
                      <div className="w-56 h-32 relative flex items-end justify-center overflow-hidden">
                        <svg viewBox="0 0 200 115" className="w-full h-full">
                          <defs>
                            <linearGradient
                              id="gaugeGrad"
                              x1="0"
                              y1="0"
                              x2="1"
                              y2="0"
                            >
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="18"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 25 100 A 75 75 0 0 1 175 100"
                            fill="none"
                            stroke="url(#gaugeGrad)"
                            strokeWidth="18"
                            strokeLinecap="round"
                            strokeDasharray="235.6"
                            strokeDashoffset={
                              235.6 *
                              (1 -
                                Math.min(
                                  100,
                                  Math.max(0, Number(currentWeek.performance_score ?? 0))
                                ) /
                                  100)
                            }
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
                          <span className="font-display text-4xl font-extrabold text-slate-900 tracking-tight">
                            {Math.round(currentWeek.performance_score ?? 0)}%
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 -mt-0.5">
                            weekly average
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 text-center sm:text-left">
                      <h4 className="font-display text-sm font-bold text-slate-900 mb-1">
                        {perfCopy.headline}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {perfCopy.feedback}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <Link
                      to="/practice"
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    >
                      <span>Practice Now</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>

                {/* Right Card: 8-Week Activity Density Matrix */}
                <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                      <div>
                        <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">
                          8-Week Activity Density
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Weekly sessions &amp; tasks completed across the past 8
                          weeks
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-600" />
                          <span>Completed Tasks</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-slate-200" />
                          <span>Empty Day Track</span>
                        </span>
                      </div>
                    </div>

                    <div className="relative pt-4 pb-2">
                      <div className="grid grid-cols-8 gap-2 sm:gap-4 h-64 items-end pb-7">
                        {weeks.map((item) => {
                          const isSelected = currentWeek.key === item.key;
                          const isHovered = hoveredWeek?.key === item.key;
                          const maxTasksInWeeks = Math.max(
                            1,
                            ...weeks.map((w) => w.tasks_completed || 0)
                          );
                          const filledBlocks =
                            item.tasks_completed > 0
                              ? Math.max(
                                  1,
                                  Math.round(
                                    (item.tasks_completed / maxTasksInWeeks) * 10
                                  )
                                )
                              : 0;

                          return (
                            <div
                              key={item.key}
                              onMouseEnter={() => setHoveredWeek(item)}
                              onClick={() => setSelectedWeekKey(item.key)}
                              className="flex flex-col items-center justify-end h-full cursor-pointer group"
                            >
                              <div className="flex flex-col-reverse gap-1 items-center w-full max-w-[28px]">
                                {filledBlocks > 0 ? (
                                  Array.from({ length: filledBlocks }).map(
                                    (_, bIdx) => (
                                      <div
                                        key={bIdx}
                                        className={`w-3 sm:w-4 h-2.5 sm:h-3 rounded-xs transition-all ${
                                          isSelected || isHovered
                                            ? "bg-blue-600 scale-105 shadow-2xs"
                                            : "bg-blue-400 group-hover:bg-blue-600"
                                        }`}
                                      />
                                    )
                                  )
                                ) : (
                                  <div className="w-3 sm:w-4 h-2.5 rounded-xs bg-slate-200" />
                                )}
                              </div>

                              <span
                                className={`text-[10px] sm:text-xs font-semibold mt-2.5 truncate ${
                                  isSelected || isHovered
                                    ? "text-blue-600 font-bold"
                                    : "text-slate-400"
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {hoveredWeek && (
                        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-slate-800">
                              {hoveredWeek.label}
                            </span>{" "}
                            <span className="text-slate-400">
                              ({hoveredWeek.date_range})
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-600">
                              Tasks:{" "}
                              <strong className="text-slate-900">
                                {hoveredWeek.tasks_completed}
                              </strong>
                            </span>
                            <span className="text-slate-600">
                              Study:{" "}
                              <strong className="text-slate-900">
                                {hoveredWeek.total_minutes}m
                              </strong>
                            </span>
                            <span className="text-slate-600">
                              Avg Score:{" "}
                              <strong className="text-blue-600">
                                {Math.round(hoveredWeek.performance_score ?? 0)}%
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. BOTTOM ROW: STUDY SCHEDULE MATRIX + CHANNEL SPLIT */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">
                        Weekly Study Schedule
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Day-by-day study session minutes for {currentWeek.date_range}
                      </p>
                    </div>
                  </div>

                  <div className="pl-28 sm:pl-36 grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {scheduleMatrix.map((row) => (
                      <div key={row.time_slot} className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 shrink-0 text-left">
                          <p className="text-[11px] font-mono font-bold text-slate-600 capitalize">
                            {row.time_slot}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {row.label}
                          </p>
                        </div>

                        <div className="flex-1 grid grid-cols-7 gap-2">
                          {row.days.map((slot, dIdx) => (
                            <div
                              key={dIdx}
                              onMouseEnter={() =>
                                setHoveredScheduleSlot({
                                  ...slot,
                                  time: row.label,
                                })
                              }
                              onMouseLeave={() => setHoveredScheduleSlot(null)}
                              className={`h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center font-mono text-[10px] font-bold ${getHeatmapColor(
                                slot.status
                              )}`}
                              title={
                                slot.task
                                  ? `${slot.day}: ${slot.task} (${slot.mins}m)`
                                  : `${slot.day}: No activity`
                              }
                            >
                              {slot.mins > 0 && (
                                <span className="opacity-90">{slot.mins}m</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-blue-600" />
                        <span className="text-[11px]">Active (30m+)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-blue-100" />
                        <span className="text-[11px]">Light (&lt;30m)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-slate-100" />
                        <span className="text-[11px]">No Sessions</span>
                      </span>
                    </div>

                    {hoveredScheduleSlot && (
                      <span className="text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {hoveredScheduleSlot.day} ({hoveredScheduleSlot.time}):{" "}
                        {hoveredScheduleSlot.task || "No session"} ·{" "}
                        {hoveredScheduleSlot.mins} mins
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Card: Total Study Time Donut */}
                <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-base font-bold text-slate-900 tracking-tight">
                        Total Study Time
                      </h3>
                    </div>

                    <div className="mb-4">
                      <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {currentWeek.total_hours} hrs/week
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                        {currentWeek.total_minutes} minutes logged
                        {minsDelta !== null
                          ? ` (${minsDelta >= 0 ? `+${minsDelta}` : minsDelta}m vs last week)`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-center my-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg
                          className="w-full h-full -rotate-90"
                          viewBox="0 0 100 100"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="11"
                          />
                          {webRatio > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke="#2563eb"
                              strokeWidth="11"
                              strokeDasharray="238.7"
                              strokeDashoffset={238.7 * (1 - webRatio)}
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          )}
                          {mobileRatio > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke="#93c5fd"
                              strokeWidth="11"
                              strokeDasharray="238.7"
                              strokeDashoffset={238.7 * (1 - mobileRatio)}
                              strokeLinecap="round"
                              transform={`rotate(${Math.round(webRatio * 360)} 50 50)`}
                              className="transition-all duration-700 ease-out"
                            />
                          )}
                        </svg>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 font-medium">
                          <span className="w-2.5 h-2.5 rounded-xs bg-[#93c5fd]" />
                          <span>Mobile</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {currentWeek.channel_mobile_hours ?? 0} hrs
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-600 font-medium">
                          <span className="w-2.5 h-2.5 rounded-xs bg-[#2563eb]" />
                          <span>Website</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {currentWeek.channel_web_hours ?? 0} hrs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Link
                      to="/analysis"
                      className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Open Full Subject Trajectory</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {detailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display font-bold text-base text-slate-900">
                  {detailsModal === "tasks" && "Recorded Study Sessions"}
                  {detailsModal === "active" && "Active Topics This Week"}
                  {detailsModal === "completed" && "Topics At Target Mastery"}
                  {detailsModal === "leaderboard" &&
                    "Class Consistency Standings"}
                </h3>
                <button
                  type="button"
                  onClick={() => setDetailsModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {detailsModal === "tasks" && (
                  <>
                    {sessions.length > 0 ? (
                      sessions.map((s) => (
                        <div
                          key={s.id}
                          className="p-3 bg-slate-50 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-slate-800">{s.title}</p>
                            <p className="text-slate-400">
                              {s.topic || "General"} · {s.duration_minutes}m ·{" "}
                              {new Date(s.started_at).toLocaleDateString()}
                            </p>
                          </div>
                          {s.score_percentage != null ? (
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {Math.round(s.score_percentage)}%
                            </span>
                          ) : (
                            <span className="text-slate-500 capitalize">
                              {s.activity_type}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 py-4 text-center">
                        No study sessions logged during {currentWeek.date_range}.
                      </p>
                    )}
                  </>
                )}

                {detailsModal === "active" && (
                  <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl space-y-2">
                    <p className="font-bold text-blue-900">
                      {currentWeek.active_topics} of {currentWeek.total_topics}{" "}
                      syllabus topics practiced in {currentWeek.date_range}.
                    </p>
                    <Link
                      to="/analysis"
                      onClick={() => setDetailsModal(null)}
                      className="inline-block font-bold text-blue-600 hover:underline"
                    >
                      Inspect full topic mastery table →
                    </Link>
                  </div>
                )}

                {detailsModal === "completed" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                    <p className="font-bold text-emerald-900">
                      {currentWeek.mastered_count} topics currently meet the
                      80%+ Secure threshold.
                    </p>
                    <Link
                      to="/analysis"
                      onClick={() => setDetailsModal(null)}
                      className="inline-block font-bold text-emerald-700 hover:underline"
                    >
                      View mastered topics →
                    </Link>
                  </div>
                )}

                {detailsModal === "leaderboard" && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-blue-900">
                          {currentWeek.rank != null
                            ? `Rank #${currentWeek.rank} out of ${currentWeek.total_peers} peers`
                            : "Not yet ranked this week"}
                        </p>
                        <p className="text-blue-700">
                          Current streak: {currentWeek.current_streak} days ·
                          Best: {currentWeek.longest_streak} days
                        </p>
                      </div>
                      {currentWeek.rank_percentile != null && (
                        <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded">
                          Top {currentWeek.rank_percentile}%
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 italic">
                      Rankings emphasize learning consistency across enrolled
                      class peers during {currentWeek.date_range}.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setDetailsModal(null)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
