import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { getStudentAnalysis } from "../../api/client";
import PageShell from "../../components/PageShell";
import MasteryBar from "../../components/MasteryBar";
import GitHubActivityHeatmap from "../../components/charts/GitHubActivityHeatmap";

export default function Analysis() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let active = true;
    getStudentAnalysis(user?.id || "stu_001")
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
  }, [user?.id]);

  if (loading) {
    return (
      <PageShell>
        <div className="p-8 max-w-6xl mx-auto animate-pulse space-y-6">
          <div className="h-8 w-60 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>
      </PageShell>
    );
  }

  const overallMastery = data?.overallMastery ?? 63;

  // Explainable mastery calculation breakdown (0.40 accuracy + 0.20 difficulty + 0.20 recency + 0.20 trend)
  const masteryFormulaBreakdown = [
    {
      name: "Accuracy Component",
      weight: "40%",
      score: "68%",
      contribution: "27.2 pts",
      description: "Recent vs. historical correctness across attempts",
      color: "bg-blue-500",
    },
    {
      name: "Difficulty Weight",
      weight: "20%",
      score: "Level 2.4",
      contribution: "13.0 pts",
      description: "Handling Level-2 and Level-3 multi-step problems",
      color: "bg-indigo-500",
    },
    {
      name: "Practice Recency",
      weight: "20%",
      score: "82%",
      contribution: "16.4 pts",
      description: "Active practice within the last 3 days",
      color: "bg-emerald-500",
    },
    {
      name: "Growth Trend",
      weight: "20%",
      score: "+8%",
      contribution: "6.4 pts",
      description: "Consistent positive trajectory over 5 attempts",
      color: "bg-teal-500",
    },
  ];

  // Detailed Class 9 Mathematics topic mastery metrics
  const class9Topics = [
    {
      id: "t1",
      name: "Fractions & Decimals",
      curriculum: "Number Systems",
      mastery: 84,
      band: "Secure",
      bandColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      attempts: 18,
      accuracy: 88,
      trend: "+12%",
      trendDirection: "up",
      activeErrors: 0,
      statusNote: "Mastered · Ready for challenge problems",
    },
    {
      id: "t2",
      name: "Linear Equations in One Variable",
      curriculum: "Algebra",
      mastery: 47,
      band: "Developing",
      bandColor: "bg-amber-50 text-amber-700 border-amber-200",
      attempts: 14,
      accuracy: 54,
      trend: "-3%",
      trendDirection: "down",
      activeErrors: 1,
      statusNote: "Recurrent sign transposition errors detected",
      recommended: true,
    },
    {
      id: "t3",
      name: "Polynomials",
      curriculum: "Algebra",
      mastery: 62,
      band: "Proficient",
      bandColor: "bg-blue-50 text-blue-700 border-blue-200",
      attempts: 10,
      accuracy: 66,
      trend: "+7%",
      trendDirection: "up",
      activeErrors: 0,
      statusNote: "On track · Eligible for reassessment",
    },
    {
      id: "t4",
      name: "Geometry (Lines & Angles)",
      curriculum: "Geometry",
      mastery: 48,
      band: "Developing",
      bandColor: "bg-amber-50 text-amber-700 border-amber-200",
      attempts: 8,
      accuracy: 52,
      trend: "+4%",
      trendDirection: "up",
      activeErrors: 1,
      statusNote: "Angle relationship identification practice needed",
    },
    {
      id: "t5",
      name: "Statistics & Probability",
      curriculum: "Data & Statistics",
      mastery: 15,
      band: "Needs Support",
      bandColor: "bg-rose-50 text-rose-700 border-rose-200",
      attempts: 2,
      accuracy: 30,
      trend: "—",
      trendDirection: "neutral",
      activeErrors: 0,
      statusNote: "Baseline check pending · Diagnostic available",
    },
  ];

  // Extended growth history across 8 weeks
  const trajectoryData = [
    { period: "Week 1", mastery: 36, target: 80 },
    { period: "Week 2", mastery: 42, target: 80 },
    { period: "Week 3", mastery: 48, target: 80 },
    { period: "Week 4", mastery: 52, target: 80 },
    { period: "Week 5", mastery: 55, target: 80 },
    { period: "Week 6", mastery: 59, target: 80 },
    { period: "Week 7", mastery: 61, target: 80 },
    { period: "Week 8", mastery: 63, target: 80 },
  ];

  // Cognitive competency domain radar data
  const competencyDomains = [
    { domain: "Conceptual", score: 68, fullMark: 100 },
    { domain: "Fluency", score: 74, fullMark: 100 },
    { domain: "Problem Solving", score: 50, fullMark: 100 },
    { domain: "Reasoning", score: 58, fullMark: 100 },
    { domain: "Accuracy", score: 65, fullMark: 100 },
  ];

  // Tagged cognitive error patterns with explainable evidence
  const taggedErrorPatterns = [
    {
      id: "err-1",
      title: "Sign reversal when transposing across equality",
      topic: "Linear Equations",
      evidence: "6 of last 10 attempts (60% recurrence threshold met)",
      severity: "High recurrence",
      status: "Active Focus",
      statusBadge: "bg-amber-50 text-amber-700 border-amber-200",
      teacherNote: "Reviewed by Mr. Evans: Focus on inverse operations step before division.",
      remedy: "Watch 3-minute worked sign-rule walkthrough and solve 5 guided problems.",
      actionLink: "/quiz/t3?mode=practice",
    },
    {
      id: "err-2",
      title: "Translating multi-step word problems into algebraic equations",
      topic: "Word Problems & Equations",
      evidence: "3 of last 10 attempts (30% recurrence)",
      severity: "Moderate",
      status: "Developing",
      statusBadge: "bg-blue-50 text-blue-700 border-blue-200",
      teacherNote: "Under observation · Guided practice recommended.",
      remedy: "Review the 'Translate Sentences to Equations' worked examples.",
      actionLink: "/topic/t3",
    },
    {
      id: "err-3",
      title: "Direct denominator subtraction without common LCM",
      topic: "Fractions & Decimals",
      evidence: "0 of last 10 attempts (resolved over 3 consecutive tests)",
      severity: "Resolved",
      status: "Mastered",
      statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      teacherNote: "Demonstrated secure mastery on 18 Sep diagnostic.",
      remedy: "No action required. Retain procedural fluency.",
      actionLink: null,
    },
  ];

  const studentName = user?.name || "Aanya Sharma";

  return (
    <PageShell>
      <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
        {/* ============================================================== */}
        {/* 1. TOP HEADER & EXPLAINABLE DIAGNOSIS HERO                    */}
        {/* ============================================================== */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Class 9-A · Mathematics Core</span>
            </span>
            <span className="text-xs text-slate-400">
              Student: <span className="font-semibold text-slate-700">{studentName}</span>
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Progress & Mastery Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Explainable diagnostics, daily practice consistency, and actionable next steps based on your Class 9 assessment evidence.
          </p>
        </div>

        {/* ============================================================== */}
        {/* 2. OVERALL MASTERY & EXPLAINABLE FORMULA BREAKDOWN             */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            {/* Left: Score & Diagnostic Summary */}
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <span className="font-display text-5xl font-extrabold text-slate-900 tracking-tight">
                  {overallMastery}%
                </span>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Proficient Band (60–79%)
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Target: <strong className="text-slate-700">80% Secure</strong> · 4 of 5 topics active
                  </p>
                </div>
              </div>

              {/* Explainable plain-language summary */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p>
                  <strong>Why is your score 63%?</strong> You demonstrate strong foundations in{" "}
                  <strong className="text-slate-900">Fractions (84%)</strong> and{" "}
                  <strong className="text-slate-900">Polynomials (62%)</strong>. Your main leverage point is{" "}
                  <strong className="text-blue-700">Linear Equations (47%)</strong>, where recurring sign errors in 2-step equations are lowering your accuracy.
                </p>
              </div>
            </div>

            {/* Right: Quick Action Pill */}
            <div className="shrink-0 flex flex-col gap-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Recommended Next Step</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Solve 10 targeted sign-rule questions in Linear Equations to move into the 70%+ range.
              </p>
              <Link
                to="/quiz/t3?mode=practice"
                className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
              >
                <span>Start Targeted Practice</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Bottom: 4 Transparent Formula Weights */}
          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Explainable Mastery Components (Weighted Formula)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {masteryFormulaBreakdown.map((comp) => (
                <div key={comp.name} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{comp.name}</span>
                    <span className="text-[11px] font-mono text-slate-400">Weight: {comp.weight}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-lg font-bold text-slate-900">{comp.score}</span>
                    <span className="text-xs font-semibold text-blue-600">{comp.contribution}</span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${comp.color}`} style={{ width: comp.score }} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">{comp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. GITHUB-STYLE YEARLY PRACTICE & ASSESSMENT HEATMAP           */}
        {/* ============================================================== */}
        <div>
          <GitHubActivityHeatmap />
        </div>

        {/* ============================================================== */}
        {/* 4. CHARTS ROW: GROWTH TRAJECTORY & COMPETENCY RADAR           */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Mastery Growth Over Time (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Mastery Growth Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consistent weekly gain from 36% to 63% mastery towards the 80% benchmark
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                +27% Gain
              </span>
            </div>

            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trajectoryData}
                  margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="period"
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
                            <p className="font-semibold">{item.period}</p>
                            <p className="text-blue-300 mt-0.5">Mastery: {item.mastery}%</p>
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
                  <Area
                    type="monotone"
                    dataKey="mastery"
                    fill="url(#growthGradient)"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="mastery"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "#1d4ed8" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Cognitive Domain Radar (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Cognitive Competency Domains
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation across mathematical skill dimensions
              </p>
            </div>

            <div className="w-full h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={competencyDomains} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="domain"
                    tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs rounded-xl py-1.5 px-2.5 shadow-md">
                            <span className="font-semibold">{item.domain}: </span>
                            <span className="text-blue-300 font-bold">{item.score}%</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
              Highest: <strong className="text-slate-700">Procedural Fluency (74%)</strong> · Growth:{" "}
              <strong className="text-blue-600">Problem Solving (50%)</strong>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. TOPIC-WISE MASTERY & LEARNING GAIN TABLE                   */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Class 9 Mathematics · Topic Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evidence count, accuracy rates, and error pattern tags for each curriculum unit
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === "all"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Topics (5)
              </button>
              <button
                onClick={() => setActiveFilter("active")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeFilter === "active"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Needs Focus (2)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {class9Topics
              .filter((t) => (activeFilter === "active" ? t.mastery < 60 : true))
              .map((topic) => (
                <div
                  key={topic.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    topic.recommended
                      ? "border-blue-300 bg-blue-50/20 ring-1 ring-blue-400/20"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  {/* Topic Title & Curriculum Tag */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                        {topic.name}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border ${topic.bandColor}`}>
                        {topic.band}
                      </span>
                      {topic.recommended && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          Next Focus
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {topic.statusNote}
                    </p>
                  </div>

                  {/* Progress & Stat Metrics */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 sm:gap-8">
                    {/* Mastery Bar */}
                    <div className="w-36 sm:w-44">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 font-medium">Mastery</span>
                        <span className="font-bold text-slate-900">{topic.mastery}%</span>
                      </div>
                      <MasteryBar value={topic.mastery} size="sm" />
                    </div>

                    {/* Attempts & Accuracy */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-slate-800">
                        {topic.attempts} attempts
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {topic.accuracy}% accuracy · {topic.trend}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      <Link
                        to={topic.mastery > 0 ? `/quiz/${topic.id}?mode=practice` : `/topic/${topic.id}`}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1 ${
                          topic.recommended
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <span>{topic.recommended ? "Practice" : "View"}</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. COGNITIVE ERROR PATTERNS & MISCONCEPTIONS                   */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Patterns Worth Noticing (Cognitive Misconceptions)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tagged error patterns tracked across multiple attempts — framed as targeted learning opportunities
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {taggedErrorPatterns.filter((p) => p.status !== "Mastered").length} active patterns
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {taggedErrorPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {pattern.topic}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border ${pattern.statusBadge}`}>
                      {pattern.status}
                    </span>
                  </div>

                  <h4 className="font-display font-semibold text-sm text-slate-900 leading-snug">
                    {pattern.title}
                  </h4>

                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Evidence: <span className="text-slate-700">{pattern.evidence}</span>
                  </p>

                  <div className="rounded-xl bg-white p-2.5 border border-slate-100 mt-3 text-[11px] text-slate-600 leading-relaxed">
                    <p>
                      <strong>Teacher guidance:</strong> {pattern.teacherNote}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <p className="text-[11px] text-slate-500 mb-2">
                    {pattern.remedy}
                  </p>
                  {pattern.actionLink && (
                    <Link
                      to={pattern.actionLink}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <span>Review Walkthrough →</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
