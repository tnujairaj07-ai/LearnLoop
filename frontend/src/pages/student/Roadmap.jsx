import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/PageShell";
import { getRoadmap, toggleSubjectBookmark } from "../../api/client";

export default function Roadmap() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("roadmaps");

  const loadRoadmap = () => {
    setLoading(true);
    setErr("");
    return getRoadmap()
      .then((res) => {
        setSubjects(res?.subjects || []);
        setBookmarkedIds(new Set(res?.bookmarked_ids || []));
      })
      .catch(() => setErr("Couldn't load learning roadmaps. Please try again."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getRoadmap()
      .then((res) => {
        if (!active) return;
        setSubjects(res?.subjects || []);
        setBookmarkedIds(new Set(res?.bookmarked_ids || []));
      })
      .catch(() => active && setErr("Couldn't load learning roadmaps. Please try again."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search input
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleToggleBookmark(e, subjectId) {
    e.stopPropagation();
    const wasBookmarked = bookmarkedIds.has(subjectId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
    try {
      const res = await toggleSubjectBookmark(subjectId);
      if (typeof res?.bookmarked === "boolean") {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (res.bookmarked) next.add(subjectId);
          else next.delete(subjectId);
          return next;
        });
      }
    } catch {
      // Revert on failure
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(subjectId);
        else next.delete(subjectId);
        return next;
      });
    }
  }

  // Filter subjects based on search query and active tab
  const filteredSubjects = subjects.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (sub.name || "").toLowerCase().includes(q) ||
      (sub.description || "").toLowerCase().includes(q) ||
      (sub.curriculum || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (activeTab === "bookmarked") return bookmarkedIds.has(sub.id);
    if (activeTab === "core") return sub.category === "core";
    if (activeTab === "skill") return sub.category === "skill";
    return true;
  });

  return (
    <PageShell>
      <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto">
        {/* 1. HERO SECTION */}
        <div className="text-center pt-3 pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 mb-3 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Class 9 CBSE / NCERT Curriculum</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Class 9 Learning Roadmaps
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Follow curriculum roadmaps, track chapter competencies, and master
            each topic step by step with targeted practice.
          </p>

          <div className="mt-7 max-w-2xl mx-auto">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you want to learn today?"
                className="w-full pl-12 pr-20 py-3.5 sm:py-4 text-sm sm:text-base bg-white rounded-2xl border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm transition-all"
              />
              <svg
                className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
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
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
                <kbd className="px-2 py-1 text-[11px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg shadow-2xs">
                  Ctrl K
                </kbd>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2.5">
              Search available subjects, skill tracks, competencies, or
              electives.
            </p>
          </div>
        </div>

        {/* 2. NAVIGATION TABS */}
        <div className="border-b border-slate-200 mb-6">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("roadmaps")}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "roadmaps"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Roadmaps
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("core")}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "core"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Core Academic
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("skill")}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === "skill"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Skill Tracks</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 shadow-2xs">
                NEW
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bookmarked")}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === "bookmarked"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Saved</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {bookmarkedIds.size}
              </span>
            </button>
          </div>
        </div>

        {/* 3. SECTION SUBHEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-semibold text-sm sm:text-base text-slate-800 tracking-tight">
              {activeTab === "core"
                ? "Core Subjects"
                : activeTab === "skill"
                ? "Skill & Enrichment Tracks"
                : activeTab === "bookmarked"
                ? "Saved Subjects"
                : "Class 9 Subjects Archive"}
            </h2>
            <span className="text-xs text-slate-400">
              · Click any subject to open its chapters
            </span>
          </div>
          <span className="font-mono text-xs sm:text-sm text-slate-400 font-semibold">
            {filteredSubjects.length} Subjects
          </span>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-36 rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        )}

        {err && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 flex items-center justify-between mb-8">
            <span className="text-sm">{err}</span>
            <button
              type="button"
              onClick={loadRoadmap}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 4. 3-COLUMN CARD GRID */}
        {!loading && !err && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 mb-10">
            {/* Featured Action Card */}
            <div
              onClick={() => navigate("/practice")}
              className="rounded-2xl bg-blue-600 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-4 sm:p-5 text-white shadow-sm shadow-blue-500/20 hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-xs">
                  <svg
                    className="w-5 h-5 text-white"
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
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-1.5">
                    <span>Quick Diagnostic Check</span>
                  </h3>
                  <p className="text-[11px] text-blue-100/90 mt-0.5 font-medium">
                    Assess Class 9 Math baseline
                  </p>
                </div>
              </div>

              <span className="text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-all">
                <svg
                  className="w-4 h-4"
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
              </span>
            </div>

            {filteredSubjects.map((sub) => {
              const isBookmarked = bookmarkedIds.has(sub.id);
              const isActive = sub.status !== "coming_soon";
              const routeKey = sub.code || sub.id;

              return (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/roadmap/${routeKey}`)}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-sm sm:text-[15px] text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate">
                            {sub.name}
                          </h3>
                          {sub.badge ? (
                            <span
                              className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                isActive
                                  ? "text-blue-700 bg-blue-50 border-blue-200/70"
                                  : "text-amber-800 bg-amber-50 border-amber-200/80"
                              }`}
                            >
                              {sub.badge}
                            </span>
                          ) : !isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 shrink-0">
                              Coming Soon
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-normal leading-relaxed">
                          {sub.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleToggleBookmark(e, sub.id)}
                        aria-label="Bookmark subject"
                        className="p-1 -mr-1 text-slate-300 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                      >
                        <svg
                          className={`w-4 h-4 ${
                            isBookmarked
                              ? "text-blue-600 fill-blue-600"
                              : "fill-none"
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
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">
                      {sub.topics_count ?? 0} Chapters · {sub.curriculum}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 font-semibold transition-transform group-hover:translate-x-0.5 ${
                        isActive ? "text-blue-600" : "text-amber-700"
                      }`}
                    >
                      <span>
                        {isActive
                          ? `${Math.round(sub.mastery ?? 0)}% Mastery`
                          : "Coming Soon"}
                      </span>
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredSubjects.length === 0 && (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                No subjects match the current filter.
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
