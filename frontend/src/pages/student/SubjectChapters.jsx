import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageShell from "../../components/PageShell";
import SubjectComingSoon from "./SubjectComingSoon";
import {
  getRoadmap,
  getSubjectChapters,
  toggleSubjectBookmark,
  markResourceReviewed,
} from "../../api/client";

export default function SubjectChapters() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const routeKey = subjectId || "math";

  const [subject, setSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [comingSoonSlug, setComingSoonSlug] = useState(null);

  const [activeView, setActiveView] = useState("roadmap");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [bookmarked, setBookmarked] = useState(false);
  const [showInfoAccordion, setShowInfoAccordion] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Slide-over Drawer / Sidebar state
  const [activeDrawer, setActiveDrawer] = useState(null); // { type: 'chapter' | 'subtopic', data, chapter }
  const [sidebarTab, setSidebarTab] = useState("resources");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([]);

  // Track user's local study markers + reviewed resources synced to DB
  const [itemStatuses, setItemStatuses] = useState({});
  const [reviewedResources, setReviewedResources] = useState(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr("");
    setComingSoonSlug(null);

    async function load() {
      let resolvedId = Number(routeKey);
      let matchedMeta = null;

      if (!Number.isFinite(resolvedId) || String(resolvedId) !== String(routeKey)) {
        const roadmapRes = await getRoadmap();
        const list = roadmapRes?.subjects || [];
        matchedMeta = list.find(
          (s) =>
            String(s.code || "").toLowerCase() === String(routeKey).toLowerCase() ||
            String(s.id) === String(routeKey)
        );
        if (!matchedMeta) {
          if (active) setComingSoonSlug(routeKey);
          return;
        }
        resolvedId = matchedMeta.id;
      }

      const detail = await getSubjectChapters(resolvedId);
      if (!active) return;

      const subj = detail?.subject || matchedMeta;
      const chList = detail?.chapters || [];

      if (subj?.status === "coming_soon" || chList.length === 0) {
        setComingSoonSlug(subj?.code || routeKey);
        setSubject(subj);
        return;
      }

      setSubject(subj);
      setBookmarked(Boolean(subj?.bookmarked));

      // Compute recommended chapter dynamically from live mastery data (lowest mastery < 70 with pilot priority)
      const pilotCandidates = chList
        .filter((c) => Number(c.mastery ?? 0) < 70 && Number(c.evidence_count ?? 0) > 0)
        .sort((a, b) => Number(a.mastery ?? 0) - Number(b.mastery ?? 0));
      const recommendedId = pilotCandidates[0]?.id ?? null;

      const initialReviewed = new Set();
      const mapped = chList.map((ch, idx) => {
        (ch.resources || []).forEach((r) => {
          if (r.reviewed) initialReviewed.add(r.id);
        });
        const evidence = Number(ch.evidence_count ?? 0);
        const masteryVal = Math.round(Number(ch.mastery ?? 0));
        const derivedStatus =
          ch.status ||
          (masteryVal >= 80
            ? "completed"
            : evidence > 0
            ? "in_progress"
            : "not_started");
        return {
          ...ch,
          chapterNumber: ch.chapter_number ?? idx + 1,
          unit: ch.unit || "General",
          side: idx % 2 === 0 ? "right" : "left",
          status: derivedStatus,
          mastery: masteryVal,
          recommended: ch.id === recommendedId,
          subtopics: (ch.subtopics || []).map((st) => ({
            ...st,
            status: st.status || (Number(st.mastery ?? 0) >= 80 ? "completed" : evidence > 0 ? "in_progress" : "not_started"),
          })),
          resources: ch.resources || [],
        };
      });

      setReviewedResources(initialReviewed);
      setChapters(mapped);
    }

    load()
      .catch(() => active && setErr("Couldn't load subject chapters. Please try again."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [routeKey]);

  // Esc closes drawer
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setActiveDrawer(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const unitOptions = useMemo(() => {
    const counts = new Map();
    chapters.forEach((ch) => {
      const label = ch.unit || "General";
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [
      { id: "all", label: "All Units", count: chapters.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({
        id: label,
        label,
        count,
      })),
    ];
  }, [chapters]);

  const chaptersToRender = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return chapters.filter((ch) => {
      const matchesUnit = selectedUnit === "all" || ch.unit === selectedUnit;
      const matchesSearch =
        !q ||
        (ch.title || "").toLowerCase().includes(q) ||
        (ch.unit || "").toLowerCase().includes(q) ||
        (ch.subtopics || []).some((s) => (s.title || "").toLowerCase().includes(q));
      return matchesUnit && matchesSearch;
    });
  }, [chapters, selectedUnit, searchQuery]);

  if (!loading && !err && comingSoonSlug) {
    return <SubjectComingSoon subjectId={comingSoonSlug} />;
  }

  async function handleToggleBookmark() {
    if (!subject?.id) return;
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const res = await toggleSubjectBookmark(subject.id);
      if (typeof res?.bookmarked === "boolean") setBookmarked(res.bookmarked);
    } catch {
      setBookmarked(prev);
    }
  }

  function openDrawer(item) {
    setActiveDrawer(item);
    setSidebarTab("resources");
    setAiQuestion("");
    setAiChatHistory([]);
  }

  function closeDrawer() {
    setActiveDrawer(null);
  }

  function handleStatusUpdate(newStatus) {
    if (!activeDrawer) return;
    const key =
      activeDrawer.type === "chapter"
        ? `ch-${activeDrawer.data.id}`
        : `sub-${activeDrawer.data.id}`;
    setItemStatuses((prev) => ({ ...prev, [key]: newStatus }));
  }

  async function handleResourceClick(res) {
    if (res?.id && !reviewedResources.has(res.id)) {
      setReviewedResources((prev) => new Set([...prev, res.id]));
      try {
        await markResourceReviewed(res.id);
      } catch {
        // non-blocking
      }
    }
  }

  function handleAskAi(customPrompt) {
    const q = customPrompt || aiQuestion;
    if (!q.trim() || !activeDrawer) return;

    const topicTitle = activeDrawer.data.title;
    const chapterRef =
      activeDrawer.type === "chapter" ? activeDrawer.data : activeDrawer.chapter;
    const tip = chapterRef?.common_mistake;

    const responseText = tip
      ? `For **${topicTitle}**: Start from the foundational definition, write every step before substituting numbers, and watch out for this common pitfall — ${tip}`
      : `For **${topicTitle}**: Review the core definitions and worked examples in the Resources tab, then take the checkpoint quiz to verify your understanding.`;

    setAiChatHistory((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: responseText },
    ]);
    setAiQuestion("");
  }

  const currentDrawerPayload = (() => {
    if (!activeDrawer) return null;
    if (activeDrawer.type === "chapter") {
      const ch = activeDrawer.data;
      return {
        id: ch.id,
        topicId: ch.id,
        title: ch.title,
        unit: ch.unit,
        description:
          ch.description ||
          `Study guide and practice resources for Chapter ${ch.chapterNumber}: ${ch.title}.`,
        recommended: {
          title: `${ch.title} Practice Checkpoint`,
          duration: `${ch.subtopics?.length || 4} subtopics · ${ch.mastery}% mastery`,
        },
        resources: ch.resources || [],
        commonMistake:
          ch.common_mistake ||
          "Verify signs, units, and boundary conditions carefully at each intermediate step.",
        quizId: ch.quiz_id,
        status: itemStatuses[`ch-${ch.id}`] || ch.status,
      };
    }

    const sub = activeDrawer.data;
    const parentCh = activeDrawer.chapter;
    return {
      id: sub.id,
      topicId: parentCh.id,
      title: sub.title,
      unit: `${parentCh.title} · ${parentCh.unit}`,
      description: `Subtopic covering ${sub.title} within ${parentCh.title}${
        sub.cognitive_domain ? ` (${sub.cognitive_domain})` : ""
      }.`,
      recommended: {
        title: `${parentCh.title} Focused Practice`,
        duration: "Targeted subtopic drill",
      },
      resources: parentCh.resources || [],
      commonMistake:
        parentCh.common_mistake ||
        `Double check each step while applying definitions in ${sub.title}.`,
      quizId: parentCh.quiz_id,
      status: itemStatuses[`sub-${sub.id}`] || sub.status,
    };
  })();

  const firstQuizChapter = chapters.find((c) => c.quiz_id) || chapters[0];
  const recommendedChapter = chapters.find((c) => c.recommended) || chapters[0];

  if (loading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 animate-pulse space-y-6">
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
          <div className="h-6 w-96 bg-slate-200 rounded-lg" />
          <div className="h-96 bg-slate-200/70 rounded-3xl" />
        </div>
      </PageShell>
    );
  }

  if (err) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto p-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 flex items-center justify-between">
            <span>{err}</span>
            <Link
              to="/roadmap"
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700"
            >
              Back to Roadmaps
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="bg-[#fafbfd] min-h-screen pb-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          {/* Top navigation row */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
            <button
              type="button"
              onClick={() => navigate("/roadmap")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group"
            >
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span>All Roadmaps</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleBookmark}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-slate-500 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
                title="Bookmark Roadmap"
              >
                <svg
                  className={`w-4 h-4 ${
                    bookmarked ? "text-blue-600 fill-blue-600" : "fill-none"
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 font-bold text-xs text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Title Hero */}
          <div className="pt-6 pb-4">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 tracking-tight">
              {subject?.curriculum || "Class 9"} {subject?.name || "Mathematics"}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl font-normal leading-relaxed">
              {subject?.description ||
                "Step by step guide to mastering Class 9 topics. Click any chapter node or subtopic card to view resources, common pitfalls, and checkpoint quizzes."}
            </p>
          </div>

          {/* Subnav & View Switcher Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-6 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveView("roadmap")}
                className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "roadmap"
                    ? "text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
                }`}
              >
                <span>🗺 Roadmap View</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("grid")}
                className={`pb-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "grid"
                    ? "text-blue-600 border-b-2 border-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-900 border-b-2 border-transparent"
                }`}
              >
                <span>📋 Card Grid View</span>
              </button>
              <Link
                to="/practice"
                className="pb-2 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <span>🎯 Practice Quizzes</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter chapter..."
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 w-36 sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {unitOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} ({u.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible Info Accordion */}
          <div className="rounded-2xl border border-slate-200/80 bg-white mb-8 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInfoAccordion(!showInfoAccordion)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-50/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-600 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  What is the {subject?.name || "Mathematics"} Roadmap?
                </span>
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showInfoAccordion ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showInfoAccordion && (
              <div className="p-4 pt-1 border-t border-slate-100 text-xs text-slate-500 leading-relaxed bg-slate-50/50">
                This roadmap shows all {chapters.length} chapters for{" "}
                {subject?.name || "this subject"} synchronized with your live
                mastery scores. Click any chapter or subtopic node to review
                resources and launch targeted practice.
              </div>
            )}
          </div>
        </div>

        {/* MAIN ROADMAP VIEW */}
        {activeView === "roadmap" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
              {/* Left Floating Sidebar */}
              <div className="hidden lg:flex flex-col gap-5 sticky top-20">
                <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_#0f172a]">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-3">
                    Roadmap Legend
                  </h4>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                        <svg
                          className="w-2.5 h-2.5"
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
                      </span>
                      <span className="font-medium">Focus Recommendation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                        <svg
                          className="w-2.5 h-2.5"
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
                      </span>
                      <span className="font-medium">Mastered (80%+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      </span>
                      <span className="font-medium">In Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100 shrink-0" />
                      <span className="font-medium text-slate-500">
                        Not Started
                      </span>
                    </div>
                  </div>
                </div>

                {firstQuizChapter && (
                  <Link
                    to={`/quiz/${firstQuizChapter.id}?mode=practice${
                      firstQuizChapter.quiz_id
                        ? `&activityId=${firstQuizChapter.quiz_id}`
                        : ""
                    }`}
                    className="rounded-2xl border-2 border-slate-900 bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-xs p-3.5 text-center shadow-[3px_3px_0px_#0f172a] transition-all block cursor-pointer"
                  >
                    Take Diagnostic Checkpoint →
                  </Link>
                )}

                <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[3px_3px_0px_#0f172a]">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-2.5">
                    Curriculum Units
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {unitOptions
                      .filter((u) => u.id !== "all")
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setSelectedUnit(selectedUnit === u.id ? "all" : u.id)
                          }
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            selectedUnit === u.id
                              ? "bg-blue-50 text-blue-700 font-bold"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate">{u.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({u.count})
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {recommendedChapter && (
                  <div className="rounded-2xl border-2 border-slate-200/90 bg-white p-4 text-xs text-slate-600 shadow-2xs">
                    <p className="font-medium leading-relaxed">
                      Start with <strong>{recommendedChapter.title}</strong> to
                      build confidence and review foundational steps before
                      reassessment.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        openDrawer({
                          type: "chapter",
                          data: recommendedChapter,
                        })
                      }
                      className="mt-3 block w-full text-center font-bold text-[11px] text-slate-800 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      View {recommendedChapter.title} Resources
                    </button>
                  </div>
                )}
              </div>

              {/* Center Canvas */}
              <div className="relative py-4 flex flex-col items-center">
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-blue-500 z-0" />

                <div className="relative z-10 mb-8">
                  <div className="rounded-2xl border-2 border-slate-900 bg-white px-6 py-2.5 font-display font-extrabold text-sm sm:text-base text-slate-950 shadow-[3px_3px_0px_#0f172a] text-center">
                    {subject?.curriculum || "Class 9"}{" "}
                    {subject?.name || "Mathematics"}
                  </div>
                </div>

                {chaptersToRender.map((ch) => {
                  const isRight = ch.side === "right";
                  const subCount = Math.max(ch.subtopics.length, 1);
                  const itemHeight = 36;
                  const itemGap = 8;
                  const totalHeight = Math.max(
                    80,
                    subCount * itemHeight + (subCount - 1) * itemGap
                  );
                  const centerY = totalHeight / 2;
                  const chStatus = itemStatuses[`ch-${ch.id}`] || ch.status;

                  return (
                    <div
                      key={ch.id}
                      className="w-full relative z-10 my-4 sm:my-6"
                    >
                      {/* Desktop 3-Column Branching Node */}
                      <div className="hidden md:grid md:grid-cols-[1fr_240px_1fr] lg:grid-cols-[1fr_260px_1fr] items-center gap-0 w-full">
                        {/* LEFT COLUMN */}
                        <div className="flex justify-end pr-0">
                          {!isRight && ch.subtopics.length > 0 ? (
                            <div className="flex items-center justify-end w-full">
                              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                                {ch.subtopics.map((sub) => {
                                  const subStatus =
                                    itemStatuses[`sub-${sub.id}`] || sub.status;
                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() =>
                                        openDrawer({
                                          type: "subtopic",
                                          data: sub,
                                          chapter: ch,
                                        })
                                      }
                                      className="rounded-xl border border-slate-900 bg-[#fffbeb] hover:bg-[#fef3c7] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-between gap-2 text-left group"
                                      style={{ height: `${itemHeight}px` }}
                                      title="Click to open resources & notes sidebar"
                                    >
                                      <span className="truncate group-hover:text-blue-700">
                                        {sub.title}
                                      </span>
                                      {subStatus === "completed" ? (
                                        <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                                          <svg
                                            className="w-2.5 h-2.5"
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
                                        </span>
                                      ) : ch.recommended ? (
                                        <span className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                                          <svg
                                            className="w-2.5 h-2.5"
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
                                        </span>
                                      ) : subStatus === "in_progress" ? (
                                        <span className="w-4 h-4 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </span>
                                      ) : (
                                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <svg
                                className="w-12 shrink-0 pointer-events-none"
                                style={{ height: `${totalHeight}px` }}
                                viewBox={`0 0 48 ${totalHeight}`}
                              >
                                {ch.subtopics.map((sub, sIdx) => {
                                  const targetY =
                                    sIdx * (itemHeight + itemGap) +
                                    itemHeight / 2;
                                  return (
                                    <path
                                      key={sub.id}
                                      d={`M 48,${centerY} C 24,${centerY} 24,${targetY} 0,${targetY}`}
                                      stroke="#3b82f6"
                                      strokeWidth="2"
                                      strokeDasharray="4 4"
                                      fill="none"
                                    />
                                  );
                                })}
                              </svg>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>

                        {/* CENTER COLUMN: Main Chapter Node */}
                        <div className="flex flex-col items-center justify-center relative px-2">
                          <div
                            onClick={() =>
                              openDrawer({ type: "chapter", data: ch })
                            }
                            className={`w-full rounded-xl border-2 border-slate-900 p-3 sm:p-3.5 text-center font-display font-extrabold text-xs sm:text-sm text-slate-950 shadow-[3px_3px_0px_#0f172a] hover:-translate-y-0.5 transition-all cursor-pointer relative group ${
                              ch.recommended
                                ? "bg-[#ffd000] ring-2 ring-purple-500/40"
                                : "bg-[#ffd000] hover:bg-[#ffe033]"
                            }`}
                            title="Click to open chapter resources & notes sidebar"
                          >
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-800/80 mb-0.5">
                              Chapter {ch.chapterNumber} · {ch.mastery}%
                            </div>
                            <div className="font-extrabold leading-snug line-clamp-2">
                              {ch.title}
                            </div>

                            {ch.recommended && (
                              <span className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                                Recommended
                              </span>
                            )}
                            {chStatus === "completed" && !ch.recommended && (
                              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
                                <svg
                                  className="w-3 h-3"
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
                              </span>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex justify-start pl-0">
                          {isRight && ch.subtopics.length > 0 ? (
                            <div className="flex items-center justify-start w-full">
                              <svg
                                className="w-12 shrink-0 pointer-events-none"
                                style={{ height: `${totalHeight}px` }}
                                viewBox={`0 0 48 ${totalHeight}`}
                              >
                                {ch.subtopics.map((sub, sIdx) => {
                                  const targetY =
                                    sIdx * (itemHeight + itemGap) +
                                    itemHeight / 2;
                                  return (
                                    <path
                                      key={sub.id}
                                      d={`M 0,${centerY} C 24,${centerY} 24,${targetY} 48,${targetY}`}
                                      stroke="#3b82f6"
                                      strokeWidth="2"
                                      strokeDasharray="4 4"
                                      fill="none"
                                    />
                                  );
                                })}
                              </svg>

                              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                                {ch.subtopics.map((sub) => {
                                  const subStatus =
                                    itemStatuses[`sub-${sub.id}`] || sub.status;
                                  return (
                                    <div
                                      key={sub.id}
                                      onClick={() =>
                                        openDrawer({
                                          type: "subtopic",
                                          data: sub,
                                          chapter: ch,
                                        })
                                      }
                                      className="rounded-xl border border-slate-900 bg-[#fffbeb] hover:bg-[#fef3c7] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] transition-all cursor-pointer flex items-center justify-between gap-2 text-left group"
                                      style={{ height: `${itemHeight}px` }}
                                      title="Click to open resources & notes sidebar"
                                    >
                                      <span className="truncate group-hover:text-blue-700">
                                        {sub.title}
                                      </span>
                                      {subStatus === "completed" ? (
                                        <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0">
                                          <svg
                                            className="w-2.5 h-2.5"
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
                                        </span>
                                      ) : ch.recommended ? (
                                        <span className="w-4 h-4 rounded-full bg-[#8b5cf6] text-white flex items-center justify-center shrink-0">
                                          <svg
                                            className="w-2.5 h-2.5"
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
                                        </span>
                                      ) : subStatus === "in_progress" ? (
                                        <span className="w-4 h-4 rounded-full border border-blue-500 bg-blue-50 flex items-center justify-center shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        </span>
                                      ) : (
                                        <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div className="md:hidden flex flex-col items-center">
                        <div
                          onClick={() =>
                            openDrawer({ type: "chapter", data: ch })
                          }
                          className="w-full max-w-sm rounded-xl border-2 border-slate-900 bg-[#ffd000] p-3 text-center font-display font-extrabold text-sm text-slate-950 shadow-[3px_3px_0px_#0f172a] mb-3 cursor-pointer"
                        >
                          <div className="text-[10px] font-mono uppercase text-slate-800">
                            Chapter {ch.chapterNumber} · {ch.unit}
                          </div>
                          <div>{ch.title}</div>
                        </div>

                        {ch.subtopics.length > 0 && (
                          <div className="w-full max-w-sm pl-4 border-l-2 border-dashed border-blue-500 space-y-2">
                            {ch.subtopics.map((sub) => {
                              const subStatus =
                                itemStatuses[`sub-${sub.id}`] || sub.status;
                              return (
                                <div
                                  key={sub.id}
                                  onClick={() =>
                                    openDrawer({
                                      type: "subtopic",
                                      data: sub,
                                      chapter: ch,
                                    })
                                  }
                                  className="rounded-xl border border-slate-900 bg-[#fffbeb] p-2 text-xs font-semibold text-slate-900 shadow-[2px_2px_0px_#0f172a] flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <span className="truncate">{sub.title}</span>
                                  {subStatus === "completed" ? (
                                    <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center shrink-0 text-[10px]">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="relative z-10 mt-8 mb-4">
                  <div className="rounded-2xl border-2 border-slate-900 bg-emerald-400 px-6 py-3 font-display font-extrabold text-sm sm:text-base text-slate-950 shadow-[3px_3px_0px_#0f172a] text-center flex items-center gap-2">
                    <span>
                      🎉 {subject?.name || "Class 9 Mathematics"} Target Mastery
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARD GRID VIEW */}
        {activeView === "grid" && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {chaptersToRender.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => openDrawer({ type: "chapter", data: ch })}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between group cursor-pointer ${
                    ch.recommended
                      ? "border-blue-400 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-sm"
                      : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        Ch {ch.chapterNumber}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400 truncate">
                        {ch.unit}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {ch.title}
                    </h3>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        {ch.subtopics.length} Subtopics
                      </div>
                      <div className="space-y-1">
                        {ch.subtopics.slice(0, 3).map((sub) => (
                          <div
                            key={sub.id}
                            className="text-xs text-slate-600 flex items-center gap-1.5 truncate"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="truncate">{sub.title}</span>
                          </div>
                        ))}
                        {ch.subtopics.length > 3 && (
                          <div className="text-[11px] font-medium text-blue-600">
                            +{ch.subtopics.length - 3} more subtopics
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {ch.mastery}% Mastery
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDrawer({ type: "chapter", data: ch });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                    >
                      View Resources →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE-OVER DRAWER */}
        {activeDrawer && currentDrawerPayload && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              onClick={closeDrawer}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-lg sm:max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSidebarTab("resources")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sidebarTab === "resources"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Resources</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSidebarTab("ai_tutor")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sidebarTab === "ai_tutor"
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Study Helper</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-slate-200 p-0.5 text-xs font-semibold text-slate-600 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("in_progress")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          currentDrawerPayload.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 font-bold"
                            : "hover:text-slate-900"
                        }`}
                      >
                        <span>📖 Learning</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("completed")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          currentDrawerPayload.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : "hover:text-slate-900"
                        }`}
                      >
                        <span>✓ Done</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {sidebarTab === "resources" && (
                  <div className="p-6 sm:p-7 space-y-6 flex-1 overflow-y-auto">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span>{currentDrawerPayload.unit}</span>
                        {currentDrawerPayload.status === "completed" && (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full font-bold text-[10px] border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </div>
                      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-950 tracking-tight">
                        {currentDrawerPayload.title}
                      </h2>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed font-normal">
                        {currentDrawerPayload.description}
                      </p>
                      <Link
                        to={`/topic/${currentDrawerPayload.topicId}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                      >
                        <span>Open full mastery breakdown for this topic</span>
                        <span>→</span>
                      </Link>
                    </div>

                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4 sm:p-5 relative shadow-xs">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <span>★ Recommended Next Step</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                          CBSE CORE
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 mt-2">
                        <div>
                          <h4 className="font-display font-bold text-sm sm:text-base text-slate-950">
                            {currentDrawerPayload.recommended.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {currentDrawerPayload.recommended.duration}
                          </p>
                        </div>

                        <Link
                          to={`/quiz/${currentDrawerPayload.topicId}?mode=practice${
                            currentDrawerPayload.quizId
                              ? `&activityId=${currentDrawerPayload.quizId}`
                              : ""
                          }`}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 font-bold text-xs text-slate-950 shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Start ↗</span>
                        </Link>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-3">
                        <span>💚 Curated Resources</span>
                      </h3>
                      {currentDrawerPayload.resources.length > 0 ? (
                        <div className="space-y-2">
                          {currentDrawerPayload.resources.map((res) => {
                            const isExternal =
                              typeof res.url_or_path === "string" &&
                              /^https?:\/\//i.test(res.url_or_path);
                            const isReviewed = reviewedResources.has(res.id);
                            return (
                              <div
                                key={res.id || res.title}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200/90 hover:border-blue-300 transition-all bg-white"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 shrink-0">
                                    {res.type || "Resource"}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                                      {res.title}
                                    </p>
                                    {res.description && (
                                      <p className="text-[11px] text-slate-400 truncate">
                                        {res.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isExternal && (
                                    <a
                                      href={res.url_or_path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => handleResourceClick(res)}
                                      className="text-xs font-semibold text-blue-600 hover:underline"
                                    >
                                      Open ↗
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleResourceClick(res)}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                      isReviewed
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    }`}
                                  >
                                    {isReviewed ? "Reviewed ✓" : "Mark Reviewed"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Resources are available inside the full topic view.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 text-xs text-amber-900">
                        <span className="font-bold block mb-1">
                          Common Error Watch-out:
                        </span>
                        {currentDrawerPayload.commonMistake}
                      </div>
                    </div>
                  </div>
                )}

                {sidebarTab === "ai_tutor" && (
                  <div className="p-6 sm:p-7 space-y-5 flex-1 overflow-y-auto flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                          ✨
                        </span>
                        <h3 className="font-display font-bold text-base text-slate-900">
                          Concept Helper · {currentDrawerPayload.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        Quick revision prompts aligned with this chapter's
                        syllabus notes and common error traps.
                      </p>

                      <div className="space-y-2 mb-4">
                        {[
                          `Explain the core concept for ${currentDrawerPayload.title}`,
                          `What are the most common mistakes in this topic?`,
                          `How should I prepare for the checkpoint quiz?`,
                        ].map((promptText, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleAskAi(promptText)}
                            className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-xs font-medium text-slate-700 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span className="truncate">{promptText}</span>
                            <span className="text-purple-600 text-xs ml-2">
                              →
                            </span>
                          </button>
                        ))}
                      </div>

                      {aiChatHistory.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          {aiChatHistory.map((msg, mIdx) => (
                            <div
                              key={mIdx}
                              className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-slate-100 text-slate-900 font-semibold ml-6"
                                  : "bg-purple-50 border border-purple-200/80 text-purple-950 mr-4"
                              }`}
                            >
                              {msg.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <div className="relative">
                        <input
                          type="text"
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
                          placeholder={`Ask about ${currentDrawerPayload.title}...`}
                          className="w-full pl-4 pr-20 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleAskAi()}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                      Esc
                    </kbd>{" "}
                    or click backdrop to close
                  </span>
                  <Link
                    to={`/quiz/${currentDrawerPayload.topicId}?mode=practice${
                      currentDrawerPayload.quizId
                        ? `&activityId=${currentDrawerPayload.quizId}`
                        : ""
                    }`}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Practice Questions</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
