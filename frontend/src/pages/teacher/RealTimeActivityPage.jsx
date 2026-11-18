import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'
import { classesService } from '../../services/classesService'
import { studentsService } from '../../services/studentsService'

const DAY_OPTIONS = [
  { id: 'today', offset: 0, label: 'Today (Live)' },
  { id: 'yesterday', offset: 1, label: 'Yesterday' },
  { id: '2days', offset: 2, label: '2 Days Ago' },
]

export default function RealTimeActivityPage() {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [remindingId, setRemindingId] = useState(null)

  const classesApi = useApi(() => classesService.listForTeacher(), [])
  const assignedClasses = useMemo(() => classesApi.data || [], [classesApi.data])
  const effectiveClassId = selectedClassId ? Number(selectedClassId) : undefined

  const activityApi = useApi(
    () =>
      analyticsService.realtimeActivity({
        classId: effectiveClassId,
        dayOffset: selectedDayOffset,
      }),
    [effectiveClassId, selectedDayOffset]
  )

  const students = useMemo(() => activityApi.data?.students || [], [activityApi.data])
  const summary = activityApi.data?.summary || {
    total: 0,
    attended: 0,
    not_visited: 0,
    total_minutes: 0,
    avg_minutes: 0,
    attendance_rate: 0,
  }

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return students.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.roll_no && s.roll_no.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [students, statusFilter, searchQuery])

  async function handleSendNudge(student) {
    setRemindingId(student.id)
    setActionError(null)
    try {
      await studentsService.remind(student.id, {
        title: 'Study Reminder from Teacher',
        message: `Hi ${student.name.split(' ')[0]}, please open your recommended topic resource and complete a quick practice set today.`,
        reminder_type: 'nudge',
      })
      setToastMessage(`A learning reminder has been sent to ${student.name}.`)
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err) {
      setActionError(err.message || 'Could not send reminder.')
    } finally {
      setRemindingId(null)
    }
  }

  const loading = activityApi.status === 'loading' && !activityApi.data

  return (
    <>
      <Topbar
        title="Real-Time Student Learning Activity"
        breadcrumb="Teacher / Monitoring"
        subtitle="Live day-wise session participation, module engagement, and practice tracking"
        actions={
          <Link
            to="/teacher/classes"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            View Classes →
          </Link>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {toastMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 font-bold">
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

        {/* 1. TOP SELECTION & DAY FILTER BAR */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Activity Date {activityApi.data?.date ? `(${activityApi.data.date})` : ''}
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                {DAY_OPTIONS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDayOffset(tab.offset)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      selectedDayOffset === tab.offset
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter by Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">
                  {assignedClasses[0]
                    ? `Default (${assignedClasses[0].class_name})`
                    : 'No assigned classes'}
                </option>
                {assignedClasses.map((cls) => (
                  <option key={`${cls.class_id}-${cls.subject_id || 'all'}`} value={cls.class_id}>
                    {cls.class_name} ({cls.subject_name || 'Class'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search student or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden shadow-2xs"
            />
            <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {loading && <LoadingState label="Loading student activity stream..." rows={5} />}
        {activityApi.status === 'error' && (
          <ErrorState message={activityApi.error.message} onRetry={activityApi.refetch} />
        )}

        {!loading && activityApi.status === 'success' && !activityApi.data?.class_id && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No class assigned yet"
              description="Once an administrator assigns you to a class, student session participation and attendance will stream here."
            />
          </div>
        )}

        {!loading && activityApi.status === 'success' && activityApi.data?.class_id && (
          <>
            {/* 2. STATS KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Enrolled
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-slate-900">{summary.total}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    {activityApi.data.class_name || 'Cohort'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Active on Date
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-emerald-900">
                    {summary.attended}
                  </span>
                  <span className="text-xs text-emerald-700 font-bold">
                    {Math.round(summary.attendance_rate || 0)}% active
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                  No Activity Recorded
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-rose-900">
                    {summary.not_visited}
                  </span>
                  <span className="text-xs text-rose-700 font-normal">Students</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Study Time Logged
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-blue-900">
                    {summary.total_minutes}m
                  </span>
                  <span className="text-xs text-blue-700 font-normal">
                    avg {Math.round(summary.avg_minutes || 0)}m / student
                  </span>
                </div>
              </div>
            </div>

            {/* 3. STATUS FILTER PILLS & STUDENT ACTIVITY LIST */}
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Day-Wise Learning Progression Stream
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detailed record of sessions, practice drills executed, and latest assessment scores.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {[
                    { id: 'all', label: `All (${summary.total})` },
                    { id: 'attended', label: `Active (${summary.attended})` },
                    { id: 'not_visited', label: `Not Visited (${summary.not_visited})` },
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setStatusFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        statusFilter === pill.id
                          ? 'bg-slate-900 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  No students match the current filter criteria.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredStudents.map((s) => {
                    const isAttended = s.status === 'attended'
                    return (
                      <div key={s.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-[260px]">
                            <div
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                isAttended
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {s.name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-display text-sm font-bold text-slate-900">
                                  {s.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {s.class_name}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                {s.roll_no || `#${s.id}`} · {s.last_active_time ? `Last active: ${s.last_active_time}` : 'No session time logged'}
                              </div>

                              <div className="mt-1.5">
                                {isAttended ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Active ({s.active_minutes}m logged)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    <span>No Activity Recorded</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-1.5 max-w-xl">
                            <div className="text-xs font-bold text-slate-700">
                              {s.lectures_attended && s.lectures_attended.length > 0 ? (
                                <div className="space-y-1">
                                  {s.lectures_attended.map((lec, lIdx) => (
                                    <div key={lIdx} className="flex items-center gap-1.5 text-xs text-slate-800">
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                                        {lec.type}
                                      </span>
                                      <span className="truncate">{lec.title}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-400 italic text-xs">
                                  No sessions logged on this date.
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                              <span className="font-semibold text-slate-600">Latest module:</span>
                              <span className="font-medium text-slate-700">
                                {s.current_stage || 'Awaiting session start'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            {isAttended ? (
                              <div className="text-left lg:text-right">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Latest Score
                                </div>
                                <div className="font-display font-black text-sm text-slate-900">
                                  {s.quiz_score !== null && s.quiz_score !== undefined ? `${s.quiz_score}%` : '—'}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={remindingId === s.id}
                                onClick={() => handleSendNudge(s)}
                                className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <span>🔔</span>
                                <span>{remindingId === s.id ? 'Sending…' : 'Send Study Reminder'}</span>
                              </button>
                            )}

                            <Link
                              to={`/teacher/students/${s.id}`}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <span>Profile</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
