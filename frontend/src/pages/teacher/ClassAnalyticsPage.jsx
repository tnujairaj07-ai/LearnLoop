import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MasteryHeatmap } from '../../components/charts/MasteryHeatmap'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { masteryService } from '../../services/masteryService'

export default function ClassAnalyticsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [topicFilter, setTopicFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { status, data, error, refetch, isEmpty } = useApi(
    () => masteryService.classHeatmap(classId, { topicId: topicFilter || undefined }),
    [classId, topicFilter],
    { emptyWhen: (d) => !d?.rows?.length }
  )

  const topics = useMemo(() => data?.topics ?? [], [data])
  const rows = useMemo(() => {
    if (!data?.rows) return []
    if (!searchQuery.trim()) return data.rows
    return data.rows.filter((r) =>
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
  }, [data, searchQuery])

  const className = data?.className || 'Class 9-A'
  const subjectName = data?.subjectName || 'Mathematics'

  return (
    <>
      <Topbar
        title={`${className} · Class Mastery Matrix`}
        breadcrumb="Class Analytics"
        subtitle={`Competency matrix across ${topics.length} topics and ${data?.rows?.length || 20} students`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              ← Back to Classes
            </Link>
            <Link
              to="/teacher/interventions"
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Interventions Queue</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {status === 'loading' && <LoadingState label="Loading class analytics and mastery heatmap" rows={6} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && (
          <>
            {/* ========================================================== */}
            {/* 1. CLASS HEADER & STATS BANNER                             */}
            {/* ========================================================== */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {subjectName} Core
                  </span>
                  <span className="text-xs text-slate-400">· Term 1 Pilot</span>
                </div>
                <h2 className="font-display text-2xl font-extrabold text-slate-900 tracking-tight">
                  {className} Mastery Heatmap &amp; Diagnostic Roster
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Click on any student's name to view individual growth curves, or select a topic to inspect item &amp; distractor analytics.
                </p>
              </div>

              {/* Quick stats on the right */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Students</span>
                  <span className="font-display font-extrabold text-xl text-slate-900">{data.rows.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[90px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Topics</span>
                  <span className="font-display font-extrabold text-xl text-slate-900">{topics.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Threshold</span>
                  <span className="font-display font-extrabold text-xl text-blue-800">{data.threshold || 60}%</span>
                </div>
              </div>
            </div>

            {/* ========================================================== */}
            {/* 2. FILTER & COLOR LEGEND BAR                               */}
            {/* ========================================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              {/* Left: Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-48 sm:w-60">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student in roster..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 shadow-2xs focus:bg-white focus:outline-none"
                  aria-label="Filter by topic"
                >
                  <option value="">All Topics ({topics.length})</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: Mastery Bands Legend */}
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 flex-wrap">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Mastery Bands:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  0–39% Support
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  40–59% Developing
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  60–79% Proficient
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  80–100% Secure
                </span>
              </div>
            </div>

            {/* ========================================================== */}
            {/* 3. HEATMAP TABLE                                           */}
            {/* ========================================================== */}
            {isEmpty ? (
              <EmptyState title="No student data yet" description="Mastery will appear once students start practicing." />
            ) : (
              <MasteryHeatmap
                topics={topics}
                rows={rows}
                threshold={data.threshold || 60}
                onSelectStudent={(studentId) => navigate(`/teacher/students/${studentId}`)}
              />
            )}

            {/* ========================================================== */}
            {/* 4. TOPIC ANALYTICS CARDS (Click to View Item Analysis)     */}
            {/* ========================================================== */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-base text-slate-900 tracking-tight">
                  Curriculum Topic Diagnostics &amp; Item Analysis
                </h3>
                <span className="text-xs text-slate-400">Click a card to evaluate most-missed questions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => navigate(`/teacher/classes/${classId}/topics/${topic.id}`)}
                    className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {subjectName}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (topic.average || 50) >= 60
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          Avg {topic.average != null ? `${topic.average}%` : '—'}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                        {topic.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Inspect question correct rates, distractor choice distributions, and tagged errors.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Item &amp; Distractor Analysis</span>
                      <span className="font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        <span>Inspect</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
