import { useEffect, useState } from "react";
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
import { getReportCard } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";

export default function ReportCard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("marks"); // "marks" | "performance" | "feedback" | "achievement"
  const [selectedExam, setSelectedExam] = useState("halfYearly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getReportCard(user?.id || "stu_001", activeTab)
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, activeTab]);

  function handlePrint() {
    window.print();
  }

  if (loading || !data) {
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

  const {
    studentName,
    rollNo,
    classSection,
    academicYear,
    schoolName,
    attendance,
    overallScore,
    overallMastery,
    rank,
    lastUpdated,
    assessments,
    performance,
    feedback,
    achievements,
  } = data;

  const currentExamList = assessments?.[selectedExam] || assessments?.halfYearly || [];
  const totalObtained = currentExamList.reduce((acc, cur) => acc + cur.marks, 0);
  const totalMax = currentExamList.reduce((acc, cur) => acc + cur.maxMarks, 0);
  const examPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;

  return (
    <PageShell>
      <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
        {/* ============================================================== */}
        {/* 1. TOP STUDENT PROFILE BANNER (Modeled after reference image)  */}
        {/* ============================================================== */}
        <div className="rounded-3xl bg-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-md shadow-blue-500/20 relative overflow-hidden print:bg-white print:text-slate-900 print:border print:border-slate-300">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Student Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm backdrop-blur-xs">
                  {studentName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white print:text-slate-900 flex items-center gap-2">
                    <span>{studentName}</span>
                    <span className="text-xs font-normal opacity-80 print:text-slate-500">
                      ({rollNo})
                    </span>
                  </h1>
                </div>
              </div>

              {/* Badges / Metadata */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-blue-100 print:text-slate-600">
                <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium print:bg-slate-100">
                  {classSection}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-xs font-medium print:bg-slate-100">
                  Session {academicYear}
                </span>
                <span>•</span>
                <span className="opacity-90">{schoolName}</span>
              </div>

              {/* Attendance */}
              <div className="pt-1 flex items-center gap-2 text-xs text-blue-100/90 print:text-slate-600">
                <svg className="w-4 h-4 text-blue-200 print:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  Attendance: <strong className="text-white print:text-slate-900">{attendance.present}/{attendance.total} Days</strong> ({attendance.percentage}%)
                </span>
              </div>
            </div>

            {/* Circular Gauge / Overall Score badge */}
            <div className="shrink-0 flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-xs border border-white/15 print:bg-slate-50 print:border-slate-200">
              {/* Circular Gauge */}
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
                    strokeDashoffset={2 * Math.PI * 32 * (1 - overallScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display font-bold text-lg leading-tight text-white print:text-slate-900">
                    {Math.round(overallScore)}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-blue-100 print:text-slate-500">
                    Overall
                  </span>
                </div>
              </div>

              {/* Standing / Cohort rank */}
              <div className="text-left space-y-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-900 shadow-2xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span>{rank}</span>
                </div>
                <p className="text-xs text-blue-100 print:text-slate-600 font-medium">
                  Mastery: {overallMastery}% (Proficient)
                </p>
                <p className="text-[11px] text-blue-200/80 print:text-slate-400">
                  Class 9 Academic Merit
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. REPORT HEADER & ACTION BUTTONS                              */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
              Progress Report
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Last Updated: {lastUpdated}</p>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Download / Print Report</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FOUR TAB NAVIGATION (Matching the reference image pills)    */}
        {/* ============================================================== */}
        <div className="border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-sm font-semibold pb-1">
            {[
              { id: "marks", label: "Marks" },
              { id: "performance", label: "Performance" },
              { id: "feedback", label: "Feedback" },
              { id: "achievement", label: "Achievement" },
            ].map((tab) => (
              <button
                key={tab.id}
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

        {/* ============================================================== */}
        {/* TAB 1: MARKS (Traditional & Exam-wise Results)                 */}
        {/* ============================================================== */}
        {activeTab === "marks" && (
          <div className="space-y-6">
            {/* Exam Period Selector */}
            <div className="flex items-center gap-2 overflow-x-auto print:hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Examination:
              </span>
              {[
                { id: "halfYearly", label: "Half Yearly Exam (Term 1)" },
                { id: "unitTest2", label: "Unit Test 2 (Mid-Term)" },
                { id: "unitTest1", label: "Unit Test 1 (Baseline)" },
              ].map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedExam === exam.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {exam.label}
                </button>
              ))}
            </div>

            {/* Assessment Marks Card (Matching reference card styling) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    {selectedExam === "halfYearly"
                      ? "Half Yearly Examination"
                      : selectedExam === "unitTest2"
                      ? "Unit Test 2 (Periodic Assessment)"
                      : "Unit Test 1 (Baseline Assessment)"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Class 9 Academic Curriculum · Total Score: {totalObtained}/{totalMax} ({examPercentage}%)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Passed with Distinction
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Cohort Rank: <strong className="text-slate-800">4 / 38</strong>
                  </span>
                </div>
              </div>

              {/* Subject Rows Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-semibold">Subject</th>
                      <th className="pb-3 font-semibold text-center">Marks Obtained</th>
                      <th className="pb-3 font-semibold text-center">Result</th>
                      <th className="pb-3 font-semibold text-center">Grade</th>
                      <th className="pb-3 font-semibold text-right">Percentile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentExamList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 font-semibold text-slate-800">
                          {item.subject}
                        </td>
                        <td className="py-3.5 text-center font-mono font-medium text-slate-700">
                          {item.marks} / {item.maxMarks}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            {item.result}
                          </span>
                        </td>
                        <td className="py-3.5 text-center font-bold text-blue-600">
                          {item.grade}
                        </td>
                        <td className="py-3.5 text-right font-mono text-xs text-slate-500">
                          {item.percentile ? `${item.percentile}th %ile` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-100 font-semibold text-slate-900 bg-slate-50/70">
                      <td className="py-3.5 pl-2">Total Score</td>
                      <td className="py-3.5 text-center font-mono font-bold text-blue-600">
                        {totalObtained} / {totalMax} ({examPercentage}%)
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="text-xs font-bold text-emerald-700">ALL PASSED</span>
                      </td>
                      <td className="py-3.5 text-center text-blue-600 font-bold">A</td>
                      <td className="py-3.5 text-right pr-2 text-xs font-mono text-slate-600">
                        Top 10%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: PERFORMANCE (Growth Trajectory & Subject Growth)        */}
        {/* ============================================================== */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {/* 1. Overview Growth Chart Card (Matching reference image) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    Overview Assessment Growth
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Longitudinal assessment scores across Unit Tests, Mid-Terms, and Reassessments
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    Total Growth: {performance.totalGrowth}
                  </span>
                </div>
              </div>

              {/* Composed Chart */}
              <div className="w-full h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={performance.growthTrajectory}
                    margin={{ top: 12, right: 15, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="scoreBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                              <p className="text-blue-300 font-bold mt-0.5">Score: {item.score}%</p>
                              <p className="text-slate-400 text-[10px]">Benchmark: 80%</p>
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
                      label={{
                        value: "Target 80%",
                        fill: "#059669",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <Bar
                      dataKey="score"
                      barSize={32}
                      radius={[6, 6, 0, 0]}
                      fill="url(#scoreBarGrad)"
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563eb"
                      strokeWidth={2.8}
                      dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#1d4ed8" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Subject Growth Cards (Matching reference screen 2) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">
                Subject Growth & Progress Insights
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Progress-wise diagnostic improvement across each Class 9 subject
              </p>

              <div className="space-y-3.5">
                {performance.subjectGrowth.map((subj, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-100 p-4 sm:p-5 hover:border-slate-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 md:w-56 shrink-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900">
                          {subj.subject}
                        </h4>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                          {subj.growth}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Term Mark: <strong className="text-slate-700">{subj.marks}/100</strong> · Mastery: {subj.mastery}%
                      </p>
                    </div>

                    <div className="flex-1 rounded-xl bg-slate-50/70 p-3 border border-slate-100/90 text-xs text-slate-700 leading-relaxed">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border ${subj.statusColor}`}>
                          {subj.status}
                        </span>
                      </div>
                      <p>{subj.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Diagnostic Topic Gains Table */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 mb-1">
                Mathematics Diagnostic Delta (Pre-Test vs Post-Intervention)
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Measured learning gains following targeted practice interventions
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-semibold">Topic</th>
                      <th className="pb-3 font-semibold text-center">Pre-Test Baseline</th>
                      <th className="pb-3 font-semibold text-center">Current Score</th>
                      <th className="pb-3 font-semibold text-center">Measured Gain</th>
                      <th className="pb-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {performance.topicGains.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 font-semibold text-slate-800">{t.topic}</td>
                        <td className="py-3 text-center font-mono text-slate-500">{t.preTest}%</td>
                        <td className="py-3 text-center font-mono font-bold text-slate-800">{t.postTest}%</td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            t.gain.startsWith("+")
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {t.gain}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-xs font-semibold text-slate-600">{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: FEEDBACK (Teacher Observations & Subject Notes)         */}
        {/* ============================================================== */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            <div className="pb-2">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Teacher Feedback & Observations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Individual teacher notes evaluating classroom engagement, strengths, and study next steps
              </p>
            </div>

            <div className="space-y-3.5">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4"
                >
                  {/* Teacher Avatar */}
                  <div
                    className={`w-12 h-12 rounded-2xl ${item.avatarBg} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    {item.avatarInitials}
                  </div>

                  {/* Comment Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                      <div>
                        <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900">
                          {item.teacherName}
                        </h4>
                        <p className="text-xs text-slate-400 font-medium">{item.role}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono self-start sm:self-auto">
                        {item.date}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                      "{item.comment}"
                    </p>

                    {/* Feedback Tags */}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ACHIEVEMENT (Milestones, Badges & Olympiad Ranks)        */}
        {/* ============================================================== */}
        {activeTab === "achievement" && (
          <div className="space-y-4">
            <div className="pb-2">
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Academic Achievements & Milestones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Awards, practice streaks, and competitive exam distinctions earned this academic session
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs flex items-start gap-4 hover:border-slate-300 transition-all"
                >
                  {/* Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded-2xl ${ach.color} flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    {ach.iconType === "olympiad" && (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    )}
                    {ach.iconType === "streak" && (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.61 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                      </svg>
                    )}
                    {ach.iconType === "tech" && (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    {ach.iconType === "mastery" && (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {ach.iconType === "award" && (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    )}
                  </div>

                  {/* Achievement Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display font-semibold text-sm sm:text-base text-slate-900 truncate">
                        {ach.title}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {ach.date}
                      </span>
                    </div>

                    <div className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {ach.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
