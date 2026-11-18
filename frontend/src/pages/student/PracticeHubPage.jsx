import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/PageShell";
import StudentNavbar from "../../components/StudentNavbar";
import { getPracticeHub } from "../../api/client";

function getSubjectTheme(sub) {
  const code = String(sub?.code || sub?.name || "").toLowerCase();
  if (code.includes("math")) {
    return {
      gradient: "from-blue-600 to-indigo-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-700",
      border: "border-blue-200/80",
      fallbackIcon: "📐",
    };
  }
  if (code.includes("sci")) {
    return {
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      border: "border-emerald-200/80",
      fallbackIcon: "🔬",
    };
  }
  if (code.includes("soc")) {
    return {
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
      border: "border-amber-200/80",
      fallbackIcon: "🌍",
    };
  }
  if (code.includes("eng") || code.includes("hindi") || code.includes("sans")) {
    return {
      gradient: "from-purple-500 to-violet-600",
      bgLight: "bg-purple-50",
      textColor: "text-purple-700",
      border: "border-purple-200/80",
      fallbackIcon: "📚",
    };
  }
  return {
    gradient: "from-slate-600 to-slate-800",
    bgLight: "bg-slate-100",
    textColor: "text-slate-700",
    border: "border-slate-200",
    fallbackIcon: "📘",
  };
}

function getBandMeta(score, bandText) {
  const numeric = Math.round(Number(score ?? 0));
  if (numeric >= 80) {
    return {
      label: bandText || "Secure",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (numeric >= 60) {
    return {
      label: bandText || "Proficient",
      color: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (numeric >= 40) {
    return {
      label: bandText || "Developing",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  return {
    label: numeric === 0 && !bandText ? "Not Started" : bandText || "Needs Support",
    color:
      numeric === 0
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : "bg-rose-50 text-rose-700 border-rose-200",
  };
}

function formatDueDate(isoDate) {
  if (!isoDate) return "Self-paced";
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return String(isoDate);
  return `Due ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function PracticeHubPage() {
  const navigate = useNavigate();
  const params = useParams();

  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Level navigation state: route param `subjectId` may be numeric id or code slug
  const routeSubjectKey = params.subjectId || null;
  const routeChapterId = params.chapterId ? Number(params.chapterId) || params.chapterId : null;

  const [activeTab, setActiveTab] = useState("quizzes");
  const [subjectCategoryFilter, setSubjectCategoryFilter] = useState("all");
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterStatusFilter, setChapterStatusFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr("");

    async function load() {
      const numericParam =
        routeSubjectKey && /^\d+$/.test(String(routeSubjectKey))
          ? Number(routeSubjectKey)
          : null;

      let res = await getPracticeHub(numericParam);
      if (!active) return;

      const list = res?.subjects || [];
      if (routeSubjectKey && !numericParam && list.length > 0) {
        const lowerKey = String(routeSubjectKey).toLowerCase();
        const matched = list.find(
          (s) =>
            String(s.code || "").toLowerCase() === lowerKey ||
            String(s.code || "").toLowerCase().startsWith(lowerKey) ||
            String(s.name || "").toLowerCase().includes(lowerKey)
        );
        if (matched && matched.id !== res?.active_subject_id) {
          res = await getPracticeHub(matched.id);
          if (!active) return;
        }
      }

      setSubjects(res?.subjects || []);
      setActiveSubjectId(res?.active_subject_id ?? null);
      setChapters(res?.chapters || []);
    }

    load()
      .catch(() => active && setErr("Couldn't load Practice Hub. Try refreshing."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [routeSubjectKey]);

  const currentSubject = useMemo(() => {
    if (!routeSubjectKey) return null;
    const numericKey = Number(routeSubjectKey);
    return (
      subjects.find(
        (s) =>
          s.id === numericKey ||
          String(s.code || "").toLowerCase() === String(routeSubjectKey).toLowerCase() ||
          s.id === activeSubjectId
      ) || subjects[0] || null
    );
  }, [routeSubjectKey, subjects, activeSubjectId]);

  const currentChapter = useMemo(() => {
    if (!routeChapterId) return null;
    return (
      chapters.find((c) => String(c.id) === String(routeChapterId)) || null
    );
  }, [routeChapterId, chapters]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      if (subjectCategoryFilter === "core") return sub.category === "core";
      if (subjectCategoryFilter === "skill") return sub.category !== "core";
      return true;
    });
  }, [subjects, subjectCategoryFilter]);

  const filteredChapters = useMemo(() => {
    const q = chapterSearch.toLowerCase().trim();
    return chapters.filter((ch) => {
      const matchSearch =
        !q ||
        (ch.title || "").toLowerCase().includes(q) ||
        (ch.domain || "").toLowerCase().includes(q) ||
        (ch.overview || "").toLowerCase().includes(q);

      const score = Number(ch.mastery_score ?? 0);
      const matchStatus =
        chapterStatusFilter === "all" ||
        (chapterStatusFilter === "developing" && score < 60) ||
        (chapterStatusFilter === "proficient" && score >= 60 && score < 80) ||
        (chapterStatusFilter === "secure" && score >= 80);

      return matchSearch && matchStatus;
    });
  }, [chapters, chapterSearch, chapterStatusFilter]);

  // Real Level-1 summary metrics calculated directly from backend subjects & chapters
  const hubMetrics = useMemo(() => {
    const totalActivities = chapters.reduce(
      (sum, c) => sum + Number(c.total_activities ?? 0),
      0
    );
    const completedActivities = chapters.reduce(
      (sum, c) => sum + Number(c.completed_count ?? 0),
      0
    );
    const totalAssignments = subjects.reduce(
      (sum, s) => sum + Number(s.total_assignments ?? 0),
      0
    );
    const totalTests = subjects.reduce(
      (sum, s) => sum + Number(s.total_tests ?? 0),
      0
    );
    const assessed = chapters.filter((c) => Number(c.mastery_score ?? 0) > 0);
    const avgMastery = assessed.length
      ? Math.round(
          assessed.reduce((sum, c) => sum + Number(c.mastery_score ?? 0), 0) /
            assessed.length
        )
      : 0;
    const activeSubjects = subjects.filter((s) => s.status !== "coming_soon").length;
    return {
      totalActivities,
      completedActivities,
      totalAssignments,
      totalTests,
      avgMastery,
      activeSubjects,
    };
  }, [subjects, chapters]);

  function handleSelectSubject(subjectId) {
    navigate(`/practice/${subjectId}`);
  }

  function handleSelectChapter(chapterId) {
    navigate(`/practice/${currentSubject?.id || activeSubjectId}/${chapterId}`);
  }

  function handleBackToChapters() {
    navigate(`/practice/${currentSubject?.id || activeSubjectId}`);
  }

  function handleBackToSubjects() {
    navigate("/practice");
  }

  function handleStartActivity(activity, type = "practice") {
    const chapter = currentChapter || chapters[0];
    const subId = currentSubject?.id || activeSubjectId || "";
    navigate(
      `/quiz/${chapter?.id || activity.id}?mode=${type}&activityId=${
        activity.assessment_id || activity.id
      }&title=${encodeURIComponent(activity.title)}&exercise=${encodeURIComponent(
        activity.exercise || ""
      )}&subjectId=${subId}`
    );
  }

  const firstActiveSubject = subjects.find(
    (s) => s.status !== "coming_soon" && Number(s.total_chapters ?? 0) > 0
  );

  return (
    <PageShell>
      <div className="flex-1 bg-[#f8fafd] min-h-screen">
        <StudentNavbar />

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* 1. TOP HEADER & BREADCRUMBS */}
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
                {routeSubjectKey ? (
                  <button
                    type="button"
                    onClick={handleBackToSubjects}
                    className="hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Practice &amp; Quizzes
                  </button>
                ) : (
                  <span className="text-blue-600 font-bold">
                    Practice &amp; Quizzes
                  </span>
                )}
                {routeSubjectKey && currentSubject && (
                  <>
                    <span>/</span>
                    {routeChapterId ? (
                      <button
                        type="button"
                        onClick={handleBackToChapters}
                        className="hover:text-blue-600 transition-colors font-medium cursor-pointer"
                      >
                        {currentSubject.name}
                      </button>
                    ) : (
                      <span className="text-blue-600 font-bold">
                        {currentSubject.name}
                      </span>
                    )}
                  </>
                )}
                {routeChapterId && currentChapter && (
                  <>
                    <span>/</span>
                    <span className="text-blue-600 font-bold">
                      Chapter {currentChapter.chapter_number}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex flex-wrap items-center gap-2.5">
                <span>
                  {currentChapter
                    ? `Chapter ${currentChapter.chapter_number}: ${currentChapter.title}`
                    : currentSubject
                    ? `${currentSubject.name} · Practice & Question Bank`
                    : "Practice, Quizzes & Assessments Hub"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70">
                  Class 9 CBSE
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {currentChapter
                  ? currentChapter.overview
                  : currentSubject
                  ? `${currentSubject.total_chapters || chapters.length} chapters with topic-wise assignments, exercise drills, and assessments.`
                  : "Explore exercise-wise assignments, practice drills, and assessments synced to your mastery profile."}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {routeChapterId ? (
                <button
                  type="button"
                  onClick={handleBackToChapters}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>Back to Chapters</span>
                </button>
              ) : routeSubjectKey ? (
                <button
                  type="button"
                  onClick={handleBackToSubjects}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span>All Subjects</span>
                </button>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5"
                >
                  <span>←</span>
                  <span>Back to Dashboard</span>
                </Link>
              )}
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-56 rounded-3xl bg-slate-200/70" />
              ))}
            </div>
          )}

          {err && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 text-sm">
              {err}
            </div>
          )}

          {/* LEVEL 1: ALL SUBJECTS VIEW */}
          {!loading && !err && !routeSubjectKey && (
            <div className="space-y-6">
              {/* 4 Live Summary Metric Banner Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Completed Activities
                    </p>
                    <h3 className="font-display text-xl font-bold text-slate-900">
                      {hubMetrics.completedActivities} Completed
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      of {hubMetrics.totalActivities} published drills
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shrink-0">
                    🎯
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Average Mastery
                    </p>
                    <h3 className="font-display text-xl font-bold text-slate-900">
                      {hubMetrics.avgMastery}% Average
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {hubMetrics.avgMastery > 0
                        ? "Across assessed topics"
                        : "Start a drill to measure"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">
                    📝
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Assignments Catalog
                    </p>
                    <h3 className="font-display text-xl font-bold text-slate-900">
                      {hubMetrics.totalAssignments} Available
                    </h3>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Across {hubMetrics.activeSubjects} active subject
                      {hubMetrics.activeSubjects === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                    🏆
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Diagnostics &amp; Tests
                    </p>
                    <h3 className="font-display text-xl font-bold text-slate-900">
                      {hubMetrics.totalTests} Configured
                    </h3>
                    <p className="text-[11px] text-indigo-600 font-medium">
                      Pre-test &amp; reassessments
                    </p>
                  </div>
                </div>
              </div>

              {/* Subject Category Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSubjectCategoryFilter("all")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subjectCategoryFilter === "all"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Subjects ({subjects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectCategoryFilter("core")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subjectCategoryFilter === "core"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Core Academic
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectCategoryFilter("skill")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      subjectCategoryFilter === "skill"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Skill &amp; Enrichment
                  </button>
                </div>

                <span className="text-xs text-slate-400 font-medium">
                  Select a subject to view chapters, assignments &amp; quizzes
                </span>
              </div>

              {/* Subject Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSubjects.map((sub) => {
                  const theme = getSubjectTheme(sub);
                  const pct = Math.round(Number(sub.practiced_percentage ?? 0));
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleSelectSubject(sub.id)}
                      className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div
                        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.gradient}`}
                      />

                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                            {sub.icon || theme.fallbackIcon}
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.bgLight} ${theme.textColor} border ${theme.border}`}
                          >
                            {sub.badge ||
                              (sub.status === "coming_soon"
                                ? "Coming Soon"
                                : "Active Pilot")}
                          </span>
                        </div>

                        <h2 className="font-display text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {sub.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {sub.description}
                        </p>

                        <div className="mt-5 mb-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-600">
                              Curriculum Practiced
                            </span>
                            <span className="font-bold text-slate-900">
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${theme.gradient} transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center py-2.5 px-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
                          <div>
                            <p className="font-bold text-slate-800">
                              {sub.total_quizzes ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-400">Quizzes</p>
                          </div>
                          <div className="border-x border-slate-200">
                            <p className="font-bold text-slate-800">
                              {sub.total_assignments ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Assignments
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {sub.total_tests ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-400">Tests</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <span>
                          {sub.total_chapters > 0
                            ? "Explore Chapters & Drills"
                            : "View Subject Status"}
                        </span>
                        <span className="group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2: CHAPTERS LIST FOR SELECTED SUBJECT */}
          {!loading && !err && routeSubjectKey && !routeChapterId && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  {subjects.map((s) => {
                    const theme = getSubjectTheme(s);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSubject(s.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                          currentSubject?.id === s.id
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
                        }`}
                      >
                        <span>{s.icon || theme.fallbackIcon}</span>
                        <span>{s.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      placeholder="Search chapter or topic..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <svg
                      className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>

                  <select
                    value={chapterStatusFilter}
                    onChange={(e) => setChapterStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">All Bands</option>
                    <option value="developing">Developing (&lt;60%)</option>
                    <option value="proficient">Proficient (60–79%)</option>
                    <option value="secure">Secure (80%+)</option>
                  </select>
                </div>
              </div>

              {chapters.length === 0 && (
                <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📘</span>
                    <div>
                      <p className="font-bold text-sm">
                        {currentSubject?.name} Coming Soon to Practice Hub
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Published chapters and interactive drills are currently
                        active for Class 9 Mathematics.
                      </p>
                    </div>
                  </div>
                  {firstActiveSubject && (
                    <button
                      type="button"
                      onClick={() => handleSelectSubject(firstActiveSubject.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
                    >
                      Switch to {firstActiveSubject.name}
                    </button>
                  )}
                </div>
              )}

              {chapters.length > 0 && filteredChapters.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                  No chapters match your current search or mastery filter.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredChapters.map((ch) => {
                  const bandMeta = getBandMeta(ch.mastery_score, ch.band);
                  const chNum =
                    ch.chapter_number < 10
                      ? `0${ch.chapter_number}`
                      : ch.chapter_number;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => handleSelectChapter(ch.id)}
                      className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-extrabold font-mono">
                            Chapter {chNum}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${bandMeta.color}`}
                          >
                            {bandMeta.label} ({Math.round(ch.mastery_score ?? 0)}
                            %)
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {ch.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-blue-600 mt-0.5">
                          {ch.domain} · {ch.completed_count ?? 0}/
                          {ch.total_activities ?? 0} Done
                        </p>

                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                          {ch.overview}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <span>📝</span>
                            <strong>{ch.assignments_count ?? 0}</strong>{" "}
                            Assignments
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <span>⚡</span>
                            <strong>{ch.quizzes_count ?? 0}</strong> Quizzes
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            <span>🏆</span>
                            <strong>{ch.tests_count ?? 0}</strong> Tests
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                        <span>Open Exercises, Quizzes &amp; Tests</span>
                        <span className="group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 3: CHAPTER DETAIL WITH 3 SECTION TABS */}
          {!loading && !err && routeSubjectKey && routeChapterId && currentChapter && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-display font-extrabold text-lg shadow-sm shadow-blue-500/25 shrink-0">
                      <span>
                        {currentChapter.chapter_number < 10
                          ? `0${currentChapter.chapter_number}`
                          : currentChapter.chapter_number}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="font-display text-2xl font-bold text-slate-900">
                          {currentChapter.title}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            getBandMeta(
                              currentChapter.mastery_score,
                              currentChapter.band
                            ).color
                          }`}
                        >
                          {
                            getBandMeta(
                              currentChapter.mastery_score,
                              currentChapter.band
                            ).label
                          }{" "}
                          ({Math.round(currentChapter.mastery_score ?? 0)}%)
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Curriculum Domain:{" "}
                        <strong>{currentChapter.domain}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                      {currentChapter.completed_count ?? 0}/
                      {currentChapter.total_activities ?? 0} Completed
                    </span>
                    <Link
                      to={`/topic/${currentChapter.id}`}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Topic Mastery Details →
                    </Link>
                  </div>
                </div>

                {currentChapter.recommendation_note && (
                  <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
                    <span className="text-lg">💡</span>
                    <p className="font-medium">
                      {currentChapter.recommendation_note}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 border-b border-slate-200 pb-px overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab("assignments")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeTab === "assignments"
                        ? "bg-blue-600 text-white shadow-2xs shadow-blue-500/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>📝</span>
                    <span>Assignments</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeTab === "assignments"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {currentChapter.assignments?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("quizzes")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeTab === "quizzes"
                        ? "bg-blue-600 text-white shadow-2xs shadow-blue-500/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>⚡</span>
                    <span>Practice Quizzes</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeTab === "quizzes"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {currentChapter.quizzes?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("tests")}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      activeTab === "tests"
                        ? "bg-blue-600 text-white shadow-2xs shadow-blue-500/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>🏆</span>
                    <span>Tests &amp; Reassessments</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeTab === "tests"
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {currentChapter.tests?.length || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB 1: ASSIGNMENTS */}
              {activeTab === "assignments" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Topic-wise &amp; Exercise Assignments
                      </h3>
                      <p className="text-xs text-slate-400">
                        Structured problem sets stored directly in your learning
                        record
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {currentChapter.assignments?.length || 0} Assignments
                    </span>
                  </div>

                  {currentChapter.assignments?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentChapter.assignments.map((asg) => (
                        <div
                          key={asg.id}
                          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold font-mono">
                                {asg.exercise || "Assignment"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  asg.status === "completed"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : asg.status === "in_progress"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {asg.status === "completed" &&
                                asg.best_score != null
                                  ? `Best: ${Math.round(asg.best_score)}%`
                                  : formatDueDate(asg.due_date)}
                              </span>
                            </div>

                            <h4 className="font-display text-sm font-bold text-slate-900">
                              {asg.title}
                            </h4>

                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                              <span>
                                📄 {asg.questions_count ?? 0} Questions
                              </span>
                              <span>•</span>
                              <span>
                                ⏱ {asg.estimated_minutes || 15} mins
                              </span>
                              {asg.difficulty && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-slate-700 capitalize">
                                    {asg.difficulty}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {asg.status === "completed"
                                ? "Submitted & Graded"
                                : "Graded Assignment"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStartActivity(asg, "assignment")
                              }
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              {asg.status === "completed"
                                ? asg.allow_retakes
                                  ? "Retake / Practice →"
                                  : "Submitted"
                                : "Start Assignment →"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                      No assignments published for this chapter yet. Check the
                      Practice Quizzes or Tests tab.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PRACTICE QUIZZES */}
              {activeTab === "quizzes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Exercise-wise Practice Drills &amp; Conceptual Quizzes
                      </h3>
                      <p className="text-xs text-slate-400">
                        Practice questions with post-submission explanations and
                        similar remediation drills
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {currentChapter.quizzes?.length || 0} Drills
                    </span>
                  </div>

                  {currentChapter.quizzes?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentChapter.quizzes.map((quiz) => (
                        <div
                          key={quiz.id}
                          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold font-mono">
                                {quiz.exercise || "Practice"}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 capitalize">
                                {quiz.difficulty || "Adaptive"}
                              </span>
                            </div>

                            <h4 className="font-display text-sm font-bold text-slate-900">
                              {quiz.title}
                            </h4>

                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                              <span>❓ {quiz.questions_count ?? 0} Questions</span>
                              <span>•</span>
                              <span>⏱ {quiz.estimated_minutes || 10} mins</span>
                              {quiz.best_score != null && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-emerald-700">
                                    Best: {Math.round(quiz.best_score)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {quiz.best_score != null
                                ? `${quiz.attempts_count} attempt${
                                    quiz.attempts_count === 1 ? "" : "s"
                                  }`
                                : "Untimed Practice"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleStartActivity(quiz, "practice")
                              }
                              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                {quiz.best_score != null
                                  ? "Practice Again"
                                  : "Start Drill"}
                              </span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                      No practice quizzes published for this chapter yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TESTS & REASSESSMENTS */}
              {activeTab === "tests" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Chapter Tests, Diagnostics &amp; Reassessments
                      </h3>
                      <p className="text-xs text-slate-400">
                        Assessments measuring pre/post learning gain and mastery
                        progression
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {currentChapter.tests?.length || 0} Tests Configured
                    </span>
                  </div>

                  {currentChapter.tests?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentChapter.tests.map((test) => (
                        <div
                          key={test.id}
                          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold capitalize">
                                {test.assessment_type || test.category || "Test"}
                              </span>
                              {test.best_score != null && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Score: {Math.round(test.best_score)}%
                                </span>
                              )}
                            </div>

                            <h4 className="font-display text-sm font-bold text-slate-900">
                              {test.title}
                            </h4>

                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                              <span>
                                📋 {test.questions_count ?? 0} Questions
                              </span>
                              <span>•</span>
                              <span>
                                ⏱ {test.estimated_minutes || 20} mins
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700">
                                Graded Format
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">
                              {test.best_score != null
                                ? test.allow_retakes
                                  ? "Reassessment Ready"
                                  : "Completed"
                                : "Diagnostic / Test"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartActivity(test, "test")}
                              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              {test.best_score != null
                                ? test.allow_retakes
                                  ? "Retake Test →"
                                  : "View Status →"
                                : "Start Test →"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                      No formal tests configured for this chapter yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !err && routeSubjectKey && routeChapterId && !currentChapter && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex items-center justify-between">
              <span className="text-sm font-medium">
                Chapter not found in {currentSubject?.name || "this subject"}.
              </span>
              <button
                type="button"
                onClick={handleBackToChapters}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Back to Chapters
              </button>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
}
