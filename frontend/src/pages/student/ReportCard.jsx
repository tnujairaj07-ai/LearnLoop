import { useEffect, useState, useMemo } from "react";
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
import { getReportCard } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";

const ICON_BG_BY_THEME = {
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  indigo: "bg-indigo-100 text-indigo-700",
  purple: "bg-purple-100 text-purple-700",
  rose: "bg-rose-100 text-rose-700",
};

function getBadgeStyle(bandLabel = "") {
  const b = String(bandLabel).toLowerCase();
  if (b.includes("secure"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  if (b.includes("proficient"))
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  if (b.includes("developing"))
    return "bg-amber-50 text-amber-700 border-amber-200/80";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getGradeLetter(score) {
  const s = Number(score ?? 0);
  if (s >= 90) return "A1";
  if (s >= 80) return "A2";
  if (s >= 70) return "B1";
  if (s >= 60) return "B2";
  if (s >= 50) return "C1";
  if (s >= 40) return "C2";
  return "D";
}

export default function ReportCard() {
  const [activeTab, setActiveTab] = useState("marks"); // "marks" | "performance" | "feedback" | "achievement"
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadReport = () => {
    setLoading(true);
    setErr("");
    return getReportCard()
      .then((res) => {
        setData(res);
        const terms = Object.keys(res?.reports_by_term || {});
        if (terms.length > 0) {
          setSelectedTerm((prev) => (prev && terms.includes(prev) ? prev : terms[0]));
        }
      })
      .catch(() => setErr("Couldn't load your report card. Please retry."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getReportCard()
      .then((res) => {
        if (!active) return;
        setData(res);
        const terms = Object.keys(res?.reports_by_term || {});
        if (terms.length > 0) setSelectedTerm(terms[0]);
      })
      .catch(() => active && setErr("Couldn't load your report card. Please retry."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const termKeys = useMemo(
    () => Object.keys(data?.reports_by_term || {}),
    [data]
  );

  const activeReportEntry = useMemo(() => {
    if (!data?.reports_by_term || termKeys.length === 0) return null;
    const key = selectedTerm && data.reports_by_term[selectedTerm] ? selectedTerm : termKeys[0];
    return data.reports_by_term[key];
  }, [data, selectedTerm, termKeys]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <PageShell>
        <div className="p-8 max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-12 bg-slate-200 rounded-2xl w-96" />
          <div className="h-96 bg-slate-200 rounded-3xl" />
        </div>
      </PageShell>
    );
  }

  if (err || !data) {
    return (
      <PageShell>
        <div className="p-8 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 flex items-center justify-between">
            <span>{err || "Unable to load report card."}</span>
            <button
              type="button"
              onClick={loadReport}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const profile = data.student_profile || {};
  const studentName = profile.name || "Student";
  const publicId = profile.public_id || `STU-${profile.student_id || ""}`;
  const classSection = profile.class_name || profile.grade || "Class 9";
  const academicYear = profile.academic_year || "2025–26";
  const attendance = data.attendance || { present: 0, total: 0, percentage: 0 };
  const overallScore = Math.round(Number(data.overall_score ?? 0));
  const overallMastery = Math.round(Number(data.overall_mastery ?? 0));
  const overallBand = data.overall_band || "Getting Started";
  const rankDisplay =
    data.rank != null
      ? `Rank #${data.rank} / ${data.rank_cohort || data.rank}`
      : "Unranked";

  const tradReport = activeReportEntry?.payload?.traditional_report || null;
  const analyticsReport = activeReportEntry?.payload?.analytics_report || null;
  const topicGrades = tradReport?.topic_grades || [];
  const topicDecomposition = analyticsReport?.topic_mastery_decomposition || [];
  const learningGains =
    analyticsReport?.learning_gains?.length > 0
      ? analyticsReport.learning_gains
      : data.learning_gains || [];
  const feedback = data.feedback || [];
  const achievements = data.achievements || [];

  const termChartData = termKeys.map((tKey) => {
    const rep = data.reports_by_term[tKey]?.payload?.traditional_report;
    return {
      exam: tKey,
      score: Math.round(Number(rep?.overall_accuracy_percentage ?? 0)),
      mastery: Math.round(Number(rep?.overall_mastery_score ?? 0)),
    };
  });

  const lastUpdatedText = activeReportEntry?.generated_at
    ? new Date(activeReportEntry.generated_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Live Snapshot";

  return (
    <PageShell>
      <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
        {/* 1. TOP STUDENT PROFILE BANNER */}
        <div className="rounded-3xl bg-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-md shadow-blue-500/20 relative overflow-hidden print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm backdrop-blur-xs">
                  {studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white print:text-slate-900 flex flex-wrap items-center gap-2">
                    <span>{studentName}</span>
                    <span className="text-xs font-normal opacity-80 print:text-slate-500">
                      ({publicId})
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-blue-100 print:text-slate-600">
                <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium print:bg-slate-100">
                  {classSection}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium print:bg-slate-100">
                  Session {academicYear}
                </span>
                {profile.email && (
                  <>
                    <span>•</span>
                    <span className="opacity-90">{profile.email}</span>
                  </>
                )}
              </div>

              <div className="pt-1 flex items-center gap-2 text-xs text-blue-100/90 print:text-slate-600">
                <svg
                  className="w-4 h-4 text-blue-200 print:text-slate-400"
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
                <span>
                  Attendance:{" "}
                  <strong className="text-white print:text-slate-900">
                    {attendance.present}/{attendance.total} Days
                  </strong>{" "}
                  ({Math.round(attendance.percentage)}%)
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/15 print:bg-slate-50 print:border-slate-200">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="32"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={
                      2 * Math.PI * 32 * (1 - Math.min(100, overallScore) / 100)
                    }
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display font-bold text-lg leading-tight text-white print:text-slate-900">
                    {overallScore}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-blue-100 print:text-slate-500">
                    Overall
                  </span>
                </div>
              </div>

              <div className="text-left space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900 shadow-2xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>{rankDisplay}</span>
                </div>
                <p className="text-xs text-blue-100 print:text-slate-600 font-medium">
                  Mastery: {overallMastery}% ({overallBand})
                </p>
                <p className="text-[11px] text-blue-200/80 print:text-slate-400">
                  {classSection} Academic Record
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. REPORT HEADER & PRINT */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
              Progress Report
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Last Updated: {lastUpdatedText}
            </p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Download / Print Report</span>
            </button>
          </div>
        </div>

        {/* 3. FOUR TAB NAVIGATION */}
        <div className="border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-sm font-semibold pb-1">
            {[
              { id: "marks", label: "Marks & Terms" },
              { id: "performance", label: "Performance & Gains" },
              { id: "feedback", label: `Feedback (${feedback.length})` },
              { id: "achievement", label: `Achievements (${achievements.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: MARKS & TERMS */}
        {activeTab === "marks" && (
          <div className="space-y-6">
            {termKeys.length > 0 ? (
              <>
                <div className="flex items-center gap-2 overflow-x-auto print:hidden">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                    Examination / Term:
                  </span>
                  {termKeys.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setSelectedTerm(term)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeReportEntry?.term_label === term
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>

                {tradReport && (
                  <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
                      <div>
                        <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                          {tradReport.term_label} ·{" "}
                          {activeReportEntry.subject_name || "Mathematics"}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Assessments completed:{" "}
                          {tradReport.total_assessments_completed ?? 0} ·
                          Overall accuracy:{" "}
                          {Math.round(tradReport.overall_accuracy_percentage ?? 0)}%
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getBadgeStyle(
                            tradReport.overall_mastery_band
                          )}`}
                        >
                          {tradReport.overall_mastery_band || "Assessed"} (
                          {Math.round(tradReport.overall_mastery_score ?? 0)}%)
                        </span>
                      </div>
                    </div>

                    {topicGrades.length > 0 ? (
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                              <th className="pb-3 font-semibold">Topic / Unit</th>
                              <th className="pb-3 font-semibold text-center">
                                Mastery Score
                              </th>
                              <th className="pb-3 font-semibold text-center">
                                Mastery Band
                              </th>
                              <th className="pb-3 font-semibold text-center">
                                Grade
                              </th>
                              <th className="pb-3 font-semibold text-right">
                                Standing
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {topicGrades.map((item, idx) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="py-3.5 font-semibold text-slate-800">
                                  {item.topic}
                                </td>
                                <td className="py-3.5 text-center font-mono font-medium text-slate-700">
                                  {Math.round(item.mastery_score ?? 0)}%
                                </td>
                                <td className="py-3.5 text-center">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                                      item.band
                                    )}`}
                                  >
                                    {item.band}
                                  </span>
                                </td>
                                <td className="py-3.5 text-center font-bold text-blue-600">
                                  {getGradeLetter(item.mastery_score)}
                                </td>
                                <td className="py-3.5 text-right text-xs text-slate-600 font-semibold">
                                  {item.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-4">
                        No topic grades recorded in this term report yet.
                      </p>
                    )}

                    {tradReport.teacher_remarks && (
                      <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                        <strong className="text-slate-800 block mb-1">
                          Term Summary Remarks:
                        </strong>
                        {tradReport.teacher_remarks}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <h3 className="font-display text-base font-bold text-slate-800">
                  No term report cards generated yet
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  As you complete diagnostics and term assessments, your teacher
                  or academic coordinator publishes term report cards here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERFORMANCE & LEARNING GAINS */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    Term-Over-Term Assessment Growth
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Accuracy and mastery scores recorded across published terms
                  </p>
                </div>
              </div>

              {termChartData.length > 0 ? (
                <div className="w-full h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={termChartData}
                      margin={{ top: 12, right: 15, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="scoreBarGrad"
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
                            stopColor="#93c5fd"
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="exam"
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
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
                              <div className="bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-md border border-slate-800">
                                <p className="font-semibold">{item.exam}</p>
                                <p className="text-blue-300 font-bold mt-0.5">
                                  Accuracy: {item.score}%
                                </p>
                                <p className="text-emerald-300 font-semibold">
                                  Mastery: {item.mastery}%
                                </p>
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
                        fill="url(#scoreBarGrad)"
                      />
                      <Line
                        type="monotone"
                        dataKey="mastery"
                        stroke="#2563eb"
                        strokeWidth={2.8}
                        dot={{
                          r: 4,
                          fill: "#2563eb",
                          strokeWidth: 2,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 6, fill: "#1d4ed8" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Complete term assessments to chart term-over-term growth.
                </p>
              )}
            </div>

            {topicDecomposition.length > 0 && (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
                <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">
                  Topic Mastery Decomposition
                </h3>
                <p className="text-xs text-slate-400 mb-5">
                  Formula: {analyticsReport?.explainable_mastery_formula}
                </p>

                <div className="space-y-3.5">
                  {topicDecomposition.map((t, idx) => (
                    <div
                      key={t.topic_id || idx}
                      className="rounded-2xl border border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="min-w-0 md:w-64 shrink-0">
                        <h4 className="font-display font-semibold text-sm text-slate-900">
                          {t.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Evidence count: {t.evidence_count} · Band:{" "}
                          <strong className="text-slate-700">
                            {t.band_label}
                          </strong>
                        </p>
                      </div>
                      <div className="flex-1 max-w-sm">
                        <MasteryBar
                          value={Math.round(t.mastery_score ?? 0)}
                          size="sm"
                        />
                      </div>
                      <div className="flex gap-3 text-[11px] text-slate-500">
                        <span>Acc: {Math.round(t.components?.accuracy ?? 0)}%</span>
                        <span>Diff: {Math.round(t.components?.difficulty ?? 0)}%</span>
                        <span>Trend: {Math.round(t.components?.trend ?? 0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">
                Measured Learning Gains (Pre-Test vs Post-Reassessment)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Score and mastery deltas following targeted practice
              </p>

              {learningGains.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="pb-3 font-semibold">Topic</th>
                        <th className="pb-3 font-semibold text-center">
                          Pre-Test
                        </th>
                        <th className="pb-3 font-semibold text-center">
                          Post-Test
                        </th>
                        <th className="pb-3 font-semibold text-center">
                          Score Gain
                        </th>
                        <th className="pb-3 font-semibold text-right">
                          Mastery Delta
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {learningGains.map((g, idx) => {
                        const sGain = Math.round(Number(g.score_gain ?? 0));
                        const mGain = Math.round(Number(g.mastery_gain ?? 0));
                        return (
                          <tr
                            key={g.id || idx}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3 font-semibold text-slate-800">
                              {g.topic_title || `Topic #${g.topic_id}`}
                            </td>
                            <td className="py-3 text-center font-mono text-slate-500">
                              {Math.round(g.pre_score ?? 0)}%
                            </td>
                            <td className="py-3 text-center font-mono font-bold text-slate-800">
                              {Math.round(g.post_score ?? 0)}%
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                                  sGain >= 0
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {sGain >= 0 ? `+${sGain}%` : `${sGain}%`}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono text-xs font-bold text-blue-600">
                              {mGain >= 0 ? `+${mGain}%` : `${mGain}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4">
                  No pre/post reassessment pairs completed yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TEACHER FEEDBACK */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="pb-2">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Teacher Feedback &amp; Observations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Faculty observations evaluating progress, strengths, and focus
                areas
              </p>
            </div>

            {feedback.length > 0 ? (
              <div className="space-y-3.5">
                {feedback.map((item) => {
                  const initials = (item.teacher_name || "Faculty")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                          <div>
                            <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900">
                              {item.teacher_name}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium">
                              {item.subject} Faculty
                            </p>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono self-start sm:self-auto">
                            {item.date}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                          "{item.comment}"
                        </p>

                        {Array.isArray(item.tags) && item.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {item.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center text-[10px] font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 shadow-2xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                No teacher feedback notes have been recorded for your account
                yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACHIEVEMENTS */}
        {activeTab === "achievement" && (
          <div className="space-y-4">
            <div className="pb-2">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Academic Achievements &amp; Milestones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Milestones, practice streaks, and mastery badges earned on your
                account
              </p>
            </div>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((ach) => {
                  const iconColor =
                    ICON_BG_BY_THEME[ach.color] || "bg-blue-100 text-blue-700";
                  const awardedLabel = ach.awarded_at
                    ? new Date(ach.awarded_at).toLocaleDateString()
                    : "";
                  return (
                    <div
                      key={ach.id}
                      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-start gap-4 hover:border-slate-300 transition-all"
                    >
                      <div
                        className={`w-12 h-12 rounded-2xl ${iconColor} flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900 truncate">
                            {ach.title}
                          </h4>
                          {awardedLabel && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {awardedLabel}
                            </span>
                          )}
                        </div>

                        {ach.badge && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                              {ach.badge}
                            </span>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          {ach.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                No badges or achievements earned yet. Start practicing and build
                a study streak to unlock milestones!
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
