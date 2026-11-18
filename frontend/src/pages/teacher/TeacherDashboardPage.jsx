import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { analyticsService } from '../../services/analyticsService'
import { interventionsService } from '../../services/interventionsService'

export default function TeacherDashboardPage() {
  const { user } = useAuth()

  const [selectedClassId, setSelectedClassId] = useState('')
  const [quickActionNotice, setQuickActionNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)

  const classesApi = useApi(() => classesService.listForTeacher(), [])
  const assignedClasses = useMemo(() => classesApi.data || [], [classesApi.data])

  const effectiveClassId = useMemo(() => {
    if (selectedClassId) return Number(selectedClassId)
    return assignedClasses[0]?.class_id || null
  }, [selectedClassId, assignedClasses])

  const dashboardApi = useApi(
    () => analyticsService.teacherDashboard(effectiveClassId),
    [effectiveClassId],
    { skip: classesApi.status === 'loading' }
  )

  const activityApi = useApi(
    () => analyticsService.realtimeActivity({ classId: effectiveClassId }),
    [effectiveClassId],
    { skip: classesApi.status === 'loading' || !effectiveClassId }
  )

  const dash = dashboardApi.data
  const weeklyEngagement = useMemo(() => dash?.weekly_engagement || [], [dash])
  const maxWeeklyMinutes = useMemo(() => {
    const vals = weeklyEngagement.flatMap((pt) => [pt.this_week || 0, pt.last_week || 0])
    return Math.max(10, ...vals)
  }, [weeklyEngagement])

  const weekSummary = useMemo(() => {
    const thisWeekTotal = weeklyEngagement.reduce((acc, p) => acc + (p.this_week || 0), 0)
    const lastWeekTotal = weeklyEngagement.reduce((acc, p) => acc + (p.last_week || 0), 0)
    const deltaPct =
      lastWeekTotal > 0 ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0
    return { thisWeekTotal, lastWeekTotal, deltaPct }
  }, [weeklyEngagement])

  const hourlyBars = dash?.live_hourly_activity || []
  const maxHourlySessions = useMemo(
    () => Math.max(1, ...hourlyBars.map((b) => b.sessions || 0)),
    [hourlyBars]
  )

  const liveSummary = activityApi.data?.summary || { total: 0, attended: 0, attendance_rate: 0 }
  const topGainers = dash?.top_gainers || []
  const mostConsistent = dash?.most_consistent || []
  const needsAttention = dash?.needs_attention || []
  const pendingInterventions = dash?.pending_interventions || []
  const overview = dash?.class_overview || null

  const teacherFirstName = user?.name ? user.name.split(' ')[0] : 'Educator'
  const totalStudentsCount = overview?.total_enrolled ?? liveSummary.total ?? 0
  const activeCountToday = liveSummary.attended ?? 0
  const classMasteryPct = Math.round(overview?.overall_class_mastery || 0)
  const masteryBandLabel =
    classMasteryPct >= 80
      ? 'Secure cohort standing'
      : classMasteryPct >= 60
      ? 'Proficient cohort standing'
      : classMasteryPct >= 40
      ? 'Developing competency band'
      : totalStudentsCount > 0
      ? 'Needs strong support focus'
      : 'Awaiting student assessment evidence'

  async function handleQuickAccept(inv) {
    setActionError(null)
    try {
      await interventionsService.assign(inv.id, {})
      setQuickActionNotice(`Intervention "${inv.title}" assigned to affected students.`)
      dashboardApi.refetch()
      setTimeout(() => setQuickActionNotice(null), 4000)
    } catch (err) {
      setActionError(err.message || 'Could not assign intervention.')
    }
  }

  async function handleQuickDismiss(inv) {
    setActionError(null)
    try {
      await interventionsService.dismiss(inv.id)
      setQuickActionNotice(`Suggestion "${inv.title}" dismissed.`)
      dashboardApi.refetch()
      setTimeout(() => setQuickActionNotice(null), 4000)
    } catch (err) {
      setActionError(err.message || 'Could not dismiss intervention.')
    }
  }

  const isLoading = classesApi.status === 'loading' || (dashboardApi.status === 'loading' && !dash)
  const loadError = classesApi.error || dashboardApi.error

  return (
    <>
      <Topbar
        title="Teacher Weekly Performance Dashboard"
        breadcrumb="Teacher Overview"
        subtitle="Weekly student performance tracking, real-time activity pulse, and closed-loop interventions"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/activity"
              className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Real-time Activity ({activeCountToday})</span>
            </Link>
            <Link
              to="/teacher/classes"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>🏫</span>
              <span>Classes Hub</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-7 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {quickActionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{quickActionNotice}</span>
            </div>
            <button onClick={() => setQuickActionNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-700 font-bold">✕</button>
          </div>
        )}

        {isLoading && <LoadingState label="Loading live class telemetry and intervention queue..." rows={5} />}
        {loadError && (
          <ErrorState
            message={loadError.message}
            onRetry={() => {
              classesApi.refetch()
              dashboardApi.refetch()
            }}
          />
        )}

        {!isLoading && !loadError && dash && !dash.has_class && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No classes assigned to your account yet"
              description="Once an administrator assigns you to a class or homeroom cohort, live mastery telemetry, attendance activity, and intervention queues will appear here."
            />
          </div>
        )}

        {!isLoading && !loadError && dash?.has_class && (
          <>
            {/* 1. HERO GREETING & CONTEXT */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>{overview?.class_name || 'Assigned Cohort'} · Live Telemetry</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back, {teacherFirstName}!
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
                  {totalStudentsCount} enrolled students in {overview?.class_name || 'selected class'} · {activeCountToday} active today ·{' '}
                  {pendingInterventions.length} open intervention item{pendingInterventions.length === 1 ? '' : 's'}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/teacher/reports"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <span>📑</span>
                  <span>Compile Report Cards</span>
                </Link>
              </div>
            </div>

            {/* 2. TOP KPI CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Class Average Mastery
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-slate-900">{classMasteryPct}%</span>
                  <span className="text-xs font-bold text-slate-600">
                    {overview?.total_attempts_completed || 0} attempts
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{masteryBandLabel}</p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Active Students Today
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-blue-900">
                    {activeCountToday} / {totalStudentsCount}
                  </span>
                  <span className="text-xs font-bold text-blue-700">{Math.round(liveSummary.attendance_rate || 0)}%</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">Recorded sessions or attendance today</p>
              </div>

              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Weekly Practice Volume
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-emerald-900">
                    {weekSummary.thisWeekTotal}m
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">
                    {weekSummary.deltaPct >= 0 ? `+${weekSummary.deltaPct}%` : `${weekSummary.deltaPct}%`} vs prev wk
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Last week: {weekSummary.lastWeekTotal} mins logged
                </p>
              </div>

              <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Open Interventions
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-display text-3xl font-black text-amber-900">
                    {pendingInterventions.length}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">
                    {overview?.active_error_flags_count || 0} flags
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  {needsAttention.length} students flagged for targeted support
                </p>
              </div>
            </div>

            {/* 3. WEEKLY PERFORMANCE CURVE & LIVE ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base">📈</span>
                      <h2 className="font-display text-base font-bold text-slate-900">
                        Student Engagement & Practice Time
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daily total study minutes logged this week vs previous week
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">Class:</span>
                    <select
                      value={effectiveClassId || ''}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                    >
                      {assignedClasses.map((c) => (
                        <option key={`${c.class_id}-${c.subject_id || 'all'}`} value={c.class_id}>
                          {c.class_name} ({c.subject_name || 'Class'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-xs">
                    <span className="text-slate-400">Last Week:</span>
                    <span className="font-bold">{weekSummary.lastWeekTotal} mins</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">This Week:</span>
                    <span className="font-bold text-emerald-400">
                      {weekSummary.thisWeekTotal} mins
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-2 rounded-xs bg-blue-600" />
                      <span>This Week</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-2 rounded-xs bg-slate-300" />
                      <span>Previous Week</span>
                    </span>
                  </div>
                </div>

                <div className="relative pt-4 pb-2">
                  <div className="h-44 w-full flex items-end justify-between gap-2 border-b border-slate-100 px-2">
                    {weeklyEngagement.map((pt) => {
                      const heightPct = Math.round(((pt.this_week || 0) / maxWeeklyMinutes) * 100)
                      const prevPct = Math.round(((pt.last_week || 0) / maxWeeklyMinutes) * 100)
                      const isHovered = (hoveredDay || weeklyEngagement[weeklyEngagement.length - 1]?.day) === pt.day
                      return (
                        <div
                          key={pt.day}
                          onMouseEnter={() => setHoveredDay(pt.day)}
                          className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                        >
                          {isHovered && (
                            <div className="mb-2 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-md text-center whitespace-nowrap">
                              <div>{pt.day}</div>
                              <div className="text-emerald-400">
                                {pt.this_week}m (prev: {pt.last_week}m)
                              </div>
                            </div>
                          )}

                          <div className="w-full max-w-[36px] flex items-end justify-center gap-1 h-32">
                            <div
                              className="w-2.5 bg-slate-300 rounded-t-md"
                              style={{ height: `${Math.max(4, prevPct)}%` }}
                              title={`Previous week: ${pt.last_week}m`}
                            />
                            <div
                              className={`w-3.5 rounded-t-md transition-all ${
                                isHovered ? 'bg-blue-600' : 'bg-blue-500/80 group-hover:bg-blue-600'
                              }`}
                              style={{ height: `${Math.max(4, heightPct)}%` }}
                              title={`This week: ${pt.this_week}m`}
                            />
                          </div>

                          <span className="text-[10px] font-bold text-slate-500 mt-2">{pt.day}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Live Learning Activity Pulse */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Live Activity Pulse
                      </h3>
                    </div>
                    <Link to="/teacher/activity" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      View All →
                    </Link>
                  </div>

                  <div>
                    <div className="font-display text-3xl font-black text-slate-900">
                      {activeCountToday}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Students active today in {overview?.class_name || 'class'}
                    </div>
                  </div>

                  <div className="flex items-end gap-1.5 h-16 mt-4 pt-2 border-b border-slate-100 pb-1">
                    {hourlyBars.map((bar) => (
                      <div
                        key={bar.hour}
                        className="flex-1 bg-blue-500 rounded-xs hover:bg-blue-600 transition-colors"
                        style={{
                          height: `${Math.max(8, Math.round(((bar.sessions || 0) / maxHourlySessions) * 100))}%`,
                        }}
                        title={`${bar.hour}: ${bar.sessions} sessions`}
                      />
                    ))}
                  </div>

                  <div className="space-y-3 mt-4">
                    {assignedClasses.map((cls) => (
                      <div key={`${cls.class_id}-${cls.subject_id || 'all'}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {cls.class_name} ({cls.subject_name || 'Class'})
                          </span>
                          <span className="font-mono font-bold text-blue-700">
                            {cls.enrolled_students_count} students
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/teacher/activity"
                  className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 text-center transition-colors shadow-2xs block"
                >
                  Open Day-Wise Activity Stream →
                </Link>
              </div>
            </div>

            {/* 4. WEEKLY RECOGNITIONS & STUDENT HIGHLIGHTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>🎖️</span>
                    <span>Weekly Student Performance Highlights</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Measured learning gains, practice consistency, and students flagged for support
                  </p>
                </div>
                <Link to="/teacher/classes" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                  View Full Class Rosters →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Highest Learning Gains */}
                <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                      🚀
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">Highest Learning Gains</h3>
                      <p className="text-[11px] text-slate-400">Reassessment mastery improvement</p>
                    </div>
                  </div>

                  {topGainers.length === 0 ? (
                    <p className="text-xs text-slate-400">No reassessment gain records yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {topGainers.map((st, sIdx) => (
                        <Link
                          key={st.student_id || sIdx}
                          to={`/teacher/students/${st.student_id}`}
                          className="flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-800">{st.name}</div>
                              <div className="text-[10px] text-slate-400">{st.topic || 'Assessed Topic'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-700">
                              {st.gain >= 0 ? `+${st.gain}%` : `${st.gain}%`}
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-bold uppercase">
                              {st.band}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 2: Most Consistent Practice */}
                <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-blue-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
                      ⏱️
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">Most Consistent Practice</h3>
                      <p className="text-[11px] text-slate-400">Active learning streaks & time</p>
                    </div>
                  </div>

                  {mostConsistent.length === 0 ? (
                    <p className="text-xs text-slate-400">No daily activity streaks recorded yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {mostConsistent.map((st, sIdx) => (
                        <Link
                          key={st.student_id || sIdx}
                          to={`/teacher/students/${st.student_id}`}
                          className="flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-800">{st.name}</div>
                              <div className="text-[10px] text-slate-400">{st.active_days} active days</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-700">{st.total_minutes}m</div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 font-bold uppercase">
                              {st.streak}-day streak
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 3: Needs Support Attention */}
                <div className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-amber-100">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">
                      ⚠️
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">Needs Support Attention</h3>
                      <p className="text-[11px] text-slate-400">Flagged for targeted teacher assistance</p>
                    </div>
                  </div>

                  {needsAttention.length === 0 ? (
                    <p className="text-xs text-slate-400">No students currently flagged for support.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {needsAttention.slice(0, 5).map((st, sIdx) => (
                        <Link
                          key={st.student_id || sIdx}
                          to={`/teacher/students/${st.student_id}`}
                          className="flex items-center justify-between text-xs hover:bg-slate-50 p-1.5 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                            <div>
                              <div className="font-bold text-slate-800">{st.name}</div>
                              <div className="text-[10px] text-amber-800 truncate max-w-[140px]">
                                {st.issue}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{Math.round(st.mastery || 0)}%</div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold uppercase">
                              {st.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. URGENT INTERVENTION ACTION QUEUE */}
            <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h2 className="font-display text-base font-bold text-slate-900">
                      Urgent Intervention Action Queue
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diagnostic evidence shows suspected recurrent error patterns. Review and approve closed-loop next steps.
                  </p>
                </div>
                <Link
                  to="/teacher/interventions"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Full Intervention Queue ({pendingInterventions.length})</span>
                  <span>→</span>
                </Link>
              </div>

              {pendingInterventions.length === 0 ? (
                <div className="p-6 text-xs text-slate-500">
                  No open interventions for this class yet. Visit the Intervention Queue to generate suggestions from class diagnostics.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingInterventions.map((inv) => (
                    <div key={inv.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                              {inv.topic_name || inv.title}
                            </span>
                            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                              {inv.affected_count} students · {inv.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Evidence & Reason: </strong>
                            <span>{inv.reason}</span>
                          </div>

                          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <strong className="text-blue-900">Suggested Action: </strong>
                            <span>{inv.recommended_action}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/teacher/interventions/${inv.id}`}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                          >
                            Review
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleQuickDismiss(inv)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                          {inv.status === 'suggested' && (
                            <button
                              type="button"
                              onClick={() => handleQuickAccept(inv)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>✓</span>
                              <span>Accept & Assign</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
