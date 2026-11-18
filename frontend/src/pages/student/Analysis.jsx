import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

function getBandColors(score, evidenceCount) {
  if (!evidenceCount && score === 0) {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-blue-50 text-blue-700 border-blue-200";
  if (score >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

const COMPONENT_COLORS = {
  accuracy: "bg-blue-500",
  difficulty: "bg-indigo-500",
  recency: "bg-emerald-500",
  trend: "bg-teal-500",
};

const COMPONENT_DESCRIPTIONS = {
  accuracy: "Weighted balance of recent and historical correctness",
  difficulty: "Performance weighted by question difficulty tier",
  recency: "Decay-weighted recency of active practice attempts",
  trend: "Momentum across consecutive assessment submissions",
};

export default function Analysis() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const loadAnalysis = () => {
    setLoading(true);
    setErr("");
    return getStudentAnalysis(365)
      .then((res) => setData(res))
      .catch(() => setErr("Couldn't load your analysis report. Please retry."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getStudentAnalysis(365)
      .then((res) => active && setData(res))
      .catch(() => active && setErr("Couldn't load your analysis report. Please retry."))
      .finally(() => active && setLoading(false));
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

  if (err) {
    return (
      <PageShell>
        <div className="p-8 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 flex items-center justify-between">
            <span>{err}</span>
            <button
              type="button"
              onClick={loadAnalysis}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const topics = data?.topics || [];
  const assessedTopics = topics.filter((t) => Number(t.evidence_count ?? 0) > 0);
  const overallMastery = Math.round(Number(data?.overall_mastery ?? 0));
  const overallBandLabel =
    assessedTopics.length === 0 && overallMastery === 0
      ? "Getting Started"
      : data?.overall_band || "Developing";

  const sortedByMastery = [...assessedTopics].sort(
    (a, b) => Number(b.mastery_score ?? 0) - Number(a.mastery_score ?? 0)
  );
  const strongestTopic = sortedByMastery[0] || null;
  const leverageTopic =
    sortedByMastery.length > 1
      ? sortedByMastery[sortedByMastery.length - 1]
      : sortedByMastery[0] || topics[0] || null;

  const formulaItems = (data?.mastery_formula_breakdown || []).map((comp) => {
    const scoreNum = Math.round(Number(comp.score ?? 0));
    const weightNum = Number(comp.weight ?? 0);
    const pts = Math.round(scoreNum * weightNum * 10) / 10;
    return {
      key: comp.key,
      name: comp.name,
      weightLabel: `${Math.round(weightNum * 100)}%`,
      scoreLabel: `${scoreNum}%`,
      scorePct: Math.min(100, Math.max(0, scoreNum)),
      contribution: `${pts} pts`,
      description:
        COMPONENT_DESCRIPTIONS[comp.key] || "Weighted mastery signal",
      color: COMPONENT_COLORS[comp.key] || "bg-blue-500",
    };
  });

  const trajectoryData = (data?.trajectory || []).map((item, idx) => ({
    period: item.assessment_title
      ? item.assessment_title.slice(0, 18)
      : `Attempt ${idx + 1}`,
    fullTitle: item.assessment_title || `Attempt ${idx + 1}`,
    mastery: Math.round(Number(item.percentage ?? item.score ?? 0)),
    target: 80,
  }));

  const trajectoryGain =
    trajectoryData.length >= 2
      ? trajectoryData[trajectoryData.length - 1].mastery -
        trajectoryData[0].mastery
      : null;

  const competencyDomains = (data?.competency_domains || []).map((d) => ({
    domain: d.domain,
    score: Math.round(Number(d.score ?? 0)),
    fullMark: d.full_mark || 100,
    evidenceCount: Number(d.evidence_count ?? 0),
  }));

  const sortedCompetencies = [...competencyDomains]
    .filter((d) => d.evidenceCount > 0)
    .sort((a, b) => b.score - a.score);
  const topCompetency = sortedCompetencies[0] || null;
  const focusCompetency =
    sortedCompetencies.length > 1
      ? sortedCompetencies[sortedCompetencies.length - 1]
      : null;

  const errorPatterns = data?.error_patterns || [];
  const activePatternsCount = errorPatterns.filter(
    (p) => p.status !== "dismissed" && p.status !== "resolved"
  ).length;
  const focusTopics = topics.filter((t) => Number(t.mastery_score ?? 0) < 60);

  const studentName = user?.name || "Student";
  const classLabel = user?.class_name || user?.grade || "Class 9";

  return (
    <PageShell>
      <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
        {/* 1. TOP HEADER */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{classLabel} · Mathematics Core</span>
            </span>
            <span className="text-xs text-slate-400">
              Student:{" "}
              <span className="font-semibold text-slate-700">{studentName}</span>
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Progress &amp; Mastery Intelligence
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Explainable diagnostics, daily practice consistency, and actionable
            next steps based on your recorded assessment evidence.
          </p>
        </div>

        {/* 2. OVERALL MASTERY & EXPLAINABLE FORMULA BREAKDOWN */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-3">
                <span className="font-display text-5xl font-extrabold text-slate-900 tracking-tight">
                  {overallMastery}%
                </span>
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBandColors(
                      overallMastery,
                      assessedTopics.length
                    )}`}
                  >
                    {overallBandLabel}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Target: <strong className="text-slate-700">80% Secure</strong>{" "}
                    · {assessedTopics.length} of {topics.length} topics assessed
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {assessedTopics.length > 0 ? (
                  <p>
                    <strong>Why is your score {overallMastery}%?</strong>{" "}
                    {strongestTopic && (
                      <>
                        Your highest topic is{" "}
                        <strong className="text-slate-900">
                          {strongestTopic.topic_title} (
                          {Math.round(strongestTopic.mastery_score)}%)
                        </strong>
                        .{" "}
                      </>
                    )}
                    {leverageTopic && leverageTopic.topic_id !== strongestTopic?.topic_id && (
                      <>
                        Your main growth opportunity is{" "}
                        <strong className="text-blue-700">
                          {leverageTopic.topic_title} (
                          {Math.round(leverageTopic.mastery_score)}%)
                        </strong>
                        .
                      </>
                    )}
                  </p>
                ) : (
                  <p>
                    <strong>No assessment evidence yet.</strong> Complete an
                    initial diagnostic or chapter practice drill to generate your
                    explainable mastery breakdown.
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <svg
                  className="w-4 h-4 text-blue-600"
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
                <span>Recommended Next Step</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                {leverageTopic
                  ? `Focus on ${leverageTopic.topic_title} to raise your overall mastery toward the 80% target.`
                  : "Visit the Practice Hub to choose your first diagnostic assessment."}
              </p>
              <Link
                to={
                  leverageTopic
                    ? `/quiz/${leverageTopic.topic_id}?mode=practice`
                    : "/practice"
                }
                className="mt-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
              >
                <span>Start Targeted Practice</span>
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

          <div className="mt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Explainable Mastery Components (Weighted Formula)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {formulaItems.map((comp) => (
                <div
                  key={comp.key}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">
                      {comp.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Weight: {comp.weightLabel}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-lg font-bold text-slate-900">
                      {comp.scoreLabel}
                    </span>
                    <span className="text-xs font-semibold text-blue-600">
                      {comp.contribution}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${comp.color}`}
                      style={{ width: `${comp.scorePct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 line-clamp-1">
                    {comp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. ACTIVITY HEATMAP */}
        <div>
          <GitHubActivityHeatmap heatmapData={data?.activity_heatmap} />
        </div>

        {/* 4. GROWTH TRAJECTORY & COMPETENCY RADAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Assessment Score Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological progression toward the 80% mastery benchmark
                </p>
              </div>

              {trajectoryGain !== null && (
                <span
                  className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${
                    trajectoryGain >= 0
                      ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                      : "text-amber-700 bg-amber-50 border-amber-200"
                  }`}
                >
                  {trajectoryGain >= 0 ? `+${trajectoryGain}%` : `${trajectoryGain}%`} Change
                </span>
              )}
            </div>

            {trajectoryData.length > 0 ? (
              <div className="w-full h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trajectoryData}
                    margin={{ top: 10, right: 15, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="growthGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
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
                              <p className="font-semibold">{item.fullTitle}</p>
                              <p className="text-blue-300 mt-0.5">
                                Score: {item.mastery}%
                              </p>
                              <p className="text-slate-400 text-[10px]">
                                Benchmark: 80%
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
                      dot={{
                        r: 4,
                        fill: "#2563eb",
                        stroke: "#fff",
                        strokeWidth: 2,
                      }}
                      activeDot={{ r: 6, fill: "#1d4ed8" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center text-center p-6">
                <p className="text-sm font-semibold text-slate-700">
                  No scored assessments yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Complete assessments to plot your longitudinal progress curve.
                </p>
              </div>
            )}
          </div>

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
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                  />
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
                            <span className="font-semibold">
                              {item.domain}:{" "}
                            </span>
                            <span className="text-blue-300 font-bold">
                              {item.score}%
                            </span>
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
              {topCompetency ? (
                <>
                  Highest:{" "}
                  <strong className="text-slate-700">
                    {topCompetency.domain} ({topCompetency.score}%)
                  </strong>
                  {focusCompetency && (
                    <>
                      {" "}
                      · Growth:{" "}
                      <strong className="text-blue-600">
                        {focusCompetency.domain} ({focusCompetency.score}%)
                      </strong>
                    </>
                  )}
                </>
              ) : (
                "No competency evidence recorded yet"
              )}
            </div>
          </div>
        </div>

        {/* 5. TOPIC-WISE MASTERY TABLE */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Class 9 Mathematics · Topic Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evidence count, component accuracy rates, and mastery bands per
                chapter
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Topics ({topics.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("active")}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeFilter === "active"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Needs Focus ({focusTopics.length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {topics
              .filter((t) =>
                activeFilter === "active" ? Number(t.mastery_score ?? 0) < 60 : true
              )
              .map((topic) => {
                const scoreVal = Math.round(Number(topic.mastery_score ?? 0));
                const evCount = Number(topic.evidence_count ?? 0);
                const accVal = Math.round(Number(topic.components?.accuracy ?? 0));
                const isNextFocus =
                  leverageTopic && leverageTopic.topic_id === topic.topic_id && evCount > 0;
                const bandLabel =
                  evCount === 0 && scoreVal === 0
                    ? "Not Started"
                    : topic.band || "Developing";

                return (
                  <div
                    key={topic.topic_id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isNextFocus
                        ? "border-blue-300 bg-blue-50/20 ring-1 ring-blue-400/20"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
                          {topic.topic_title}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border ${getBandColors(
                            scoreVal,
                            evCount
                          )}`}
                        >
                          {bandLabel}
                        </span>
                        {isNextFocus && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                            Next Focus
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {evCount > 0
                          ? `Based on ${evCount} scored response${
                              evCount === 1 ? "" : "s"
                            } · Model ${topic.model_version || "heuristic-v1"}`
                          : "No evidence recorded yet · Start practice to establish baseline"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-6 sm:gap-8">
                      <div className="w-36 sm:w-44">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400 font-medium">
                            Mastery
                          </span>
                          <span className="font-bold text-slate-900">
                            {scoreVal}%
                          </span>
                        </div>
                        <MasteryBar value={scoreVal} size="sm" />
                      </div>

                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-slate-800">
                          {evCount} items
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {accVal}% accuracy
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link
                          to={`/topic/${topic.topic_id}`}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1 ${
                            isNextFocus
                              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <span>{isNextFocus ? "Practice" : "View"}</span>
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
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 6. SUSPECTED RECURRENT ERROR PATTERNS */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                Patterns Worth Noticing (Suspected Error Categories)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Recurring tagged error patterns tracked across multiple attempts
                and reviewed with your teacher
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">
              {activePatternsCount} active pattern
              {activePatternsCount === 1 ? "" : "s"}
            </span>
          </div>

          {errorPatterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {errorPatterns.map((pattern) => {
                const isResolved =
                  pattern.status === "dismissed" || pattern.status === "resolved";
                const statusBadge = isResolved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200";
                return (
                  <div
                    key={pattern.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {pattern.topic || "Mathematics"}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-semibold border capitalize ${statusBadge}`}
                        >
                          {pattern.status || "flagged"}
                        </span>
                      </div>

                      <h4 className="font-display font-semibold text-sm text-slate-900 leading-snug">
                        {pattern.title}
                      </h4>

                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Evidence:{" "}
                        <span className="text-slate-700">
                          {pattern.match_count ?? 0} tagged matches across{" "}
                          {pattern.evidence_count ?? 0} attempts
                        </span>
                      </p>

                      {(pattern.teacher_note || pattern.description) && (
                        <div className="rounded-xl bg-white p-2.5 border border-slate-100 mt-3 text-[11px] text-slate-600 leading-relaxed">
                          <p>
                            <strong>
                              {pattern.teacher_note
                                ? "Teacher note: "
                                : "Pattern detail: "}
                            </strong>
                            {pattern.teacher_note || pattern.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {pattern.topic_id && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <Link
                          to={`/topic/${pattern.topic_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <span>Review Topic Resources →</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-400">
              No recurrent error patterns are currently flagged for your
              account.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
