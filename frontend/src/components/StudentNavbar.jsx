import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStudentDashboard, markReminderRead } from "../api/client";
import AccessibilityToggle from "./AccessibilityToggle";

const BASE_PORTAL_SHORTCUTS = [
  { id: "nav-roadmap", title: "My Courses & Roadmaps", chapter: "Curriculum", type: "Course", to: "/roadmap" },
  { id: "nav-practice", title: "Practice & Assessment Hub", chapter: "Assessments", type: "Quiz", to: "/practice" },
  { id: "nav-analysis", title: "Mastery Trajectory & Heatmap", chapter: "Analytics", type: "Report", to: "/analysis" },
  { id: "nav-weekly", title: "Weekly Progress & Schedule", chapter: "Analytics", type: "Report", to: "/weekly-progress" },
  { id: "nav-report", title: "Academic Report Card", chapter: "Reports", type: "Report", to: "/report-card" },
];

function formatReminderTime(isoString) {
  if (!isoString) return "";
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return String(isoString);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StudentNavbar({
  searchQuery,
  setSearchQuery,
  onSearchSelect,
  reminders: remindersProp,
  topics: topicsProp,
  nextAction: nextActionProp,
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState("");
  const activeSearch = searchQuery !== undefined ? searchQuery : localSearch;
  const updateSearch = (val) => {
    if (setSearchQuery) setSearchQuery(val);
    else setLocalSearch(val);
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const studentFullName = user?.name || "Student";
  const studentEmail = user?.email || "";
  const studentPublicId = user?.public_id || (user?.id ? `STU-${user.id}` : "STUDENT");
  const [classNameLabel, setClassNameLabel] = useState(user?.class_name || "");
  const gradeLabel = user?.grade || "Class 9";

  const [notifications, setNotifications] = useState([]);
  const [topicItems, setTopicItems] = useState([]);
  const [nextAction, setNextAction] = useState(nextActionProp || null);

  useEffect(() => {
    if (Array.isArray(remindersProp)) {
      setNotifications(
        remindersProp.map((r) => ({
          id: r.id,
          title: r.title,
          desc: r.message || r.desc || "",
          time: formatReminderTime(r.created_at),
          read: Boolean(r.is_read),
          link: r.reminder_type === "assessment" ? "/practice" : "/analysis",
        }))
      );
    }
  }, [remindersProp]);

  useEffect(() => {
    if (Array.isArray(topicsProp)) {
      setTopicItems(topicsProp);
    }
  }, [topicsProp]);

  useEffect(() => {
    if (nextActionProp !== undefined) {
      setNextAction(nextActionProp);
    }
  }, [nextActionProp]);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    if (Array.isArray(remindersProp) && Array.isArray(topicsProp)) return;

    let active = true;
    getStudentDashboard()
      .then((res) => {
        if (!active || !res) return;
        if (!Array.isArray(remindersProp) && Array.isArray(res.reminders)) {
          setNotifications(
            res.reminders.map((r) => ({
              id: r.id,
              title: r.title,
              desc: r.message || "",
              time: formatReminderTime(r.created_at),
              read: Boolean(r.is_read),
              link: r.reminder_type === "assessment" ? "/practice" : "/analysis",
            }))
          );
        }
        if (!Array.isArray(topicsProp) && Array.isArray(res.topic_summaries)) {
          setTopicItems(res.topic_summaries);
        }
        if (nextActionProp === undefined && res.next_recommended_action) {
          setNextAction(res.next_recommended_action);
        }
        if (Array.isArray(res.classes) && res.classes[0]?.class_name) {
          setClassNameLabel(res.classes[0].class_name);
        }
      })
      .catch(() => {
        // Silently degrade header notifications/search enhancements when offline
      });

    return () => {
      active = false;
    };
  }, [user, remindersProp, topicsProp, nextActionProp]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const quickSearchItems = useMemo(() => {
    const dynamicTopics = (topicItems || []).map((t) => ({
      id: `topic-${t.topic_id}`,
      title: t.title,
      chapter: t.band || "Topic",
      type: "Topic",
      to: `/topic/${t.topic_id}`,
    }));
    const recShortcut = nextAction?.topic_id
      ? [
          {
            id: "nav-recommended",
            title: `Next Step: ${nextAction.topic}`,
            chapter: nextAction.action_type || "Recommended",
            type: "Quiz",
            to: `/topic/${nextAction.topic_id}`,
          },
        ]
      : [];
    return [...recShortcut, ...dynamicTopics, ...BASE_PORTAL_SHORTCUTS];
  }, [topicItems, nextAction]);

  // Filter search results
  const searchResults = activeSearch.trim()
    ? quickSearchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
          item.chapter.toLowerCase().includes(activeSearch.toLowerCase()) ||
          item.type.toLowerCase().includes(activeSearch.toLowerCase())
      )
    : [];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search, Escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSignOut() {
    setProfileOpen(false);
    await signOut();
    navigate("/login");
  }

  async function markNotificationRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markReminderRead(id);
    } catch {
      // ignore optimistic sync failure
    }
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(unreadIds.map((id) => markReminderRead(id)));
    } catch {
      // ignore optimistic sync failure
    }
  }

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* ========================================================== */}
          {/* 1. LEFT: Breadcrumb & Portal Identifier                     */}
          {/* ========================================================== */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden xs:flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span>LearnLoop</span>
                <span>/</span>
                <span className="text-blue-600 font-bold">Student Portal</span>
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                <span>{gradeLabel} Mathematics</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Active Academic Session" />
              </h2>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. CENTER: Search Bar with Live Suggestions                 */}
          {/* ========================================================== */}
          <div ref={searchRef} className="flex-1 max-w-lg mx-auto relative hidden md:block">
            <div className="relative w-full">
              <input
                ref={searchInputRef}
                type="text"
                value={activeSearch}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  updateSearch(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search topics, questions, formulas... (Ctrl + K)"
                className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white rounded-full border border-slate-200/90 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>

              {activeSearch ? (
                <button
                  type="button"
                  onClick={() => updateSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center gap-0.5 absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-400 pointer-events-none">
                  <span>⌘K</span>
                </kbd>
              )}
            </div>

            {/* Live Search Quick Results Dropdown */}
            {searchFocused && (activeSearch.trim().length > 0 || searchResults.length > 0) && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Quick Results ({searchResults.length})</span>
                  <span className="text-slate-400 font-normal">Press Esc to close</span>
                </div>
                {searchResults.length > 0 ? (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {searchResults.map((item) => (
                      <Link
                        key={item.id}
                        to={item.to}
                        onClick={() => {
                          setSearchFocused(false);
                          if (onSearchSelect) onSearchSelect(item);
                        }}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-blue-50/70 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            item.type === "Quiz"
                              ? "bg-amber-100 text-amber-800"
                              : item.type === "Report"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0 font-medium ml-2">
                          {item.chapter} →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No results found for "{activeSearch}". Try searching "Linear Equations", "Polynomials", or "Quiz".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* 3. RIGHT: Actions + Notification Bell + Profile Pill       */}
          {/* ========================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Quick Practice Pill */}
            <Link
              to={nextAction?.topic_id ? `/topic/${nextAction.topic_id}` : "/practice"}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/70 transition-colors"
              title="Start Practice Session"
            >
              <span className="text-blue-600">🎯</span>
              <span>Practice</span>
            </Link>

            {/* Notification Bell */}
            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-2xs cursor-pointer"
                title="Notifications"
                aria-label="View notifications"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100">
                    <span className="font-display text-xs font-bold text-slate-900">
                      Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.link}
                          onClick={() => {
                            if (!n.read) markNotificationRead(n.id);
                            setNotificationsOpen(false);
                          }}
                          className={`p-3 flex items-start gap-2.5 rounded-xl hover:bg-slate-50 transition-colors block ${
                            !n.read ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? "bg-blue-600" : "bg-slate-300"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                            {n.time && <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No reminders yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================== */}
            {/* 4. Small Profile Image with Name & Email ID (Requested)    */}
            {/* ========================================================== */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 bg-white/95 hover:bg-white py-1.5 pl-1.5 pr-2.5 rounded-full border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                aria-expanded={profileOpen}
                aria-label="Student profile menu"
              >
                {/* Small Profile Image Avatar */}
                <div className="relative">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-slate-600 border border-slate-200/90 flex items-center justify-center shadow-2xs overflow-hidden shrink-0 group-hover:border-blue-400 transition-colors">
                    {/* Small avatar SVG representing student */}
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Subtle active status indicator dot */}
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                </div>

                {/* Name and Email ID text (as specified by user) */}
                <div className="hidden sm:block text-left max-w-[130px] md:max-w-[170px]">
                  <p className="text-xs font-semibold text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors">
                    {studentFullName}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate font-mono">
                    {studentEmail}
                  </p>
                </div>

                {/* Chevron icon */}
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95">
                  {/* Profile Header Details */}
                  <div className="p-3 bg-slate-50/80 rounded-xl mb-1.5 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                        <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {studentFullName}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {studentEmail}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {studentPublicId}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {classNameLabel || gradeLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nav Links */}
                  <div className="space-y-0.5 text-xs font-medium text-slate-700">
                    <Link
                      to="/roadmap"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-sm">🗺</span>
                      <span>My Courses &amp; Roadmaps</span>
                    </Link>
                    <Link
                      to="/analysis"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-sm">📊</span>
                      <span>Progress Analysis &amp; Heatmap</span>
                    </Link>
                    <Link
                      to="/report-card"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <span className="text-sm">📄</span>
                      <span>Academic Report Card</span>
                    </Link>
                  </div>

                  {/* Accessibility Quick Toggle */}
                  <div className="pt-2 mt-2 border-t border-slate-100 px-3 py-1">
                    <AccessibilityToggle compact />
                  </div>

                  {/* Sign Out */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Row (Collapsible) */}
        {mobileSearchOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 md:hidden">
            <div className="relative w-full">
              <input
                type="text"
                value={activeSearch}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search topics, questions, formulas..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
