import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'

export default function TeacherClassesPage() {
  const navigate = useNavigate()
  const [searchFilter, setSearchFilter] = useState('')

  const classesApi = useApi(async () => {
    const baseClasses = await classesService.listForTeacher()
    if (!baseClasses || baseClasses.length === 0) return []
    const uniqueIds = Array.from(new Set(baseClasses.map((cls) => cls.class_id).filter(Boolean)))
    const dashboardList = await Promise.all(
      uniqueIds.map((cid) => classesService.getDashboard(cid).catch(() => null))
    )
    const dashboardByClassId = Object.fromEntries(
      uniqueIds.map((cid, idx) => [cid, dashboardList[idx] || null])
    )
    return baseClasses.map((cls) => ({
      ...cls,
      dashboard: dashboardByClassId[cls.class_id] || null,
    }))
  }, [])

  const assignedClasses = useMemo(() => classesApi.data || [], [classesApi.data])

  const filtered = useMemo(() => {
    const q = searchFilter.toLowerCase().trim()
    return assignedClasses.filter(
      (c) =>
        !q ||
        (c.class_name || '').toLowerCase().includes(q) ||
        (c.subject_name || '').toLowerCase().includes(q)
    )
  }, [assignedClasses, searchFilter])

  const summary = useMemo(() => {
    const totalStudents = assignedClasses.reduce(
      (acc, c) => acc + (c.enrolled_students_count || 0),
      0
    )
    const masteryVals = assignedClasses
      .map((c) => c.dashboard?.overall_class_mastery)
      .filter((v) => typeof v === 'number')
    const avgMastery =
      masteryVals.length > 0
        ? Math.round(masteryVals.reduce((a, b) => a + b, 0) / masteryVals.length)
        : 0
    const pendingInterventions = assignedClasses.reduce(
      (acc, c) => acc + (c.dashboard?.active_interventions_count || 0),
      0
    )
    return { totalStudents, avgMastery, pendingInterventions }
  }, [assignedClasses])

  return (
    <>
      <Topbar
        title="Assigned Classes · Subject Teacher Workspace"
        breadcrumb="Teacher / Assigned Classes"
        subtitle="Classes assigned to you for subject instruction. Click any class to inspect its diagnostic heatmap and student roster."
        actions={
          <Link
            to="/teacher/my-class"
            className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 transition-colors shadow-2xs"
          >
            👑 Open My Class (Class Teacher) →
          </Link>
        }
      />

      <main className="flex-1 space-y-7 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* 1. TOP SWITCHER PILL */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <Link
              to="/teacher/my-class"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
            >
              <span>👑</span>
              <span>My Class (Class Teacher)</span>
            </Link>
            <span className="px-4 py-2 rounded-xl bg-white text-slate-900 shadow-2xs font-extrabold flex items-center gap-1.5">
              <span>📐</span>
              <span>Assigned Classes (Subject Teacher)</span>
            </span>
          </div>

          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-3 py-1 rounded-full">
            Subject Teacher Allocations ({assignedClasses.length})
          </span>
        </div>

        {classesApi.status === 'loading' && <LoadingState label="Loading assigned classes..." rows={4} />}
        {classesApi.status === 'error' && (
          <ErrorState message={classesApi.error.message} onRetry={classesApi.refetch} />
        )}

        {classesApi.status === 'success' && assignedClasses.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No classes assigned yet"
              description="Once an administrator assigns you to teach a class and subject, those cohorts will appear here."
            />
          </div>
        )}

        {classesApi.status === 'success' && assignedClasses.length > 0 && (
          <>
            {/* 2. STATS KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Cohorts
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-slate-900">
                    {assignedClasses.length}
                  </span>
                  <span className="text-xs text-slate-500 font-normal">Subject Classes</span>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  Total Students
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-purple-900">
                    {summary.totalStudents}
                  </span>
                  <span className="text-xs text-purple-700 font-normal">Under instruction</span>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Average Mastery
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-blue-900">
                    {summary.avgMastery}%
                  </span>
                  <span className="text-xs text-blue-700 font-normal">Across assigned cohorts</span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Open Interventions
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-amber-900">
                    {summary.pendingInterventions}
                  </span>
                  <span className="text-xs text-amber-700 font-normal">Active cohorts</span>
                </div>
              </div>
            </div>

            {/* 3. ASSIGNED CLASSES LIST CARDS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Assigned Subject Classes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any class card to open its topic mastery heatmap, error pattern flags, and student roster.
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Search class or subject..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-500 focus:outline-hidden"
                  />
                  <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5">
                {filtered.map((cls) => {
                  const d = cls.dashboard
                  const badgeShort =
                    `${cls.grade || ''}${cls.section || ''}` ||
                    (cls.class_name || '').replace('Class ', '').slice(0, 4)

                  return (
                    <div
                      key={`${cls.class_id}-${cls.subject_id || 'all'}`}
                      onClick={() => navigate(`/teacher/classes/${cls.class_id}`)}
                      className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:border-purple-400 hover:shadow-md cursor-pointer transition-all space-y-5 group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center font-display font-black text-lg shadow-sm shadow-purple-500/25 shrink-0 group-hover:scale-105 transition-transform">
                            <span>{badgeShort}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                {cls.class_name}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                                {cls.subject_name || 'Subject'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Grade {cls.grade || '—'} · Section {cls.section || '—'} · Academic Year{' '}
                              {cls.academic_year || '—'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/teacher/classes/${cls.class_id}`)
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-purple-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Open {cls.class_name} Analytics & Roster</span>
                          <span>→</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Enrolled Students
                          </div>
                          <div className="font-display text-lg font-black text-slate-900 mt-0.5">
                            {cls.enrolled_students_count ?? 0} Students
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Class Mastery
                          </div>
                          <div className="font-display text-lg font-black text-purple-700 mt-0.5">
                            {d ? `${Math.round(d.overall_class_mastery || 0)}%` : '—'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Completed Attempts
                          </div>
                          <div className="font-display text-lg font-black text-emerald-700 mt-0.5">
                            {d ? d.total_attempts_completed ?? 0 : '—'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Error Flags / Interventions
                          </div>
                          <div className="font-display text-sm font-bold text-slate-800 mt-1">
                            {d
                              ? `${d.active_error_flags_count ?? 0} flags · ${d.active_interventions_count ?? 0} open`
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
