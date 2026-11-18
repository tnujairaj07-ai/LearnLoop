import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MasteryHeatmap } from '../../components/charts/MasteryHeatmap'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { masteryService } from '../../services/masteryService'
import { studentsService } from '../../services/studentsService'

export default function ClassAnalyticsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('roster')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewMessage, setReviewMessage] = useState(null)
  const [reviewError, setReviewError] = useState(null)

  const analyticsApi = useApi(async () => {
    const [dashboard, heatmap, rosterRes, errorPatternsRes] = await Promise.all([
      classesService.getDashboard(classId),
      masteryService.classHeatmap(classId),
      studentsService.getClassDiagnostics(classId),
      masteryService.classErrorPatterns(classId),
    ])
    return {
      dashboard,
      heatmap,
      students: rosterRes?.students || [],
      errorPatterns: errorPatternsRes?.error_patterns || [],
    }
  }, [classId])

  const dashboard = analyticsApi.data?.dashboard
  const matrixTopics = useMemo(
    () => analyticsApi.data?.heatmap?.topics || [],
    [analyticsApi.data]
  )
  const roster = useMemo(() => analyticsApi.data?.students || [], [analyticsApi.data])
  const errorPatterns = useMemo(
    () => analyticsApi.data?.errorPatterns || [],
    [analyticsApi.data]
  )

  const { heatmapTopics, heatmapRows } = useMemo(() => {
    const hTopics = matrixTopics.map((t) => ({
      id: t.topic_id,
      name: t.topic_title,
      average: Math.round(t.average_mastery || 0),
    }))

    const byStudent = new Map()
    matrixTopics.forEach((t) => {
      ;(t.students || []).forEach((s) => {
        if (!byStudent.has(s.student_id)) {
          byStudent.set(s.student_id, {
            studentId: s.student_id,
            studentName: s.student_name || `Student ${s.student_id}`,
            belowThreshold: false,
            mastery: {},
          })
        }
        const entry = byStudent.get(s.student_id)
        const val = s.evidence_count > 0 ? Math.round(s.mastery_score) : null
        entry.mastery[t.topic_id] = val
        if (val !== null && val < 60) {
          entry.belowThreshold = true
        }
      })
    })

    return {
      heatmapTopics: hTopics,
      heatmapRows: Array.from(byStudent.values()),
    }
  }, [matrixTopics])

  const filteredRoster = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return roster.filter(
      (s) =>
        !q ||
        (s.student_name || '').toLowerCase().includes(q) ||
        (s.student_email || '').toLowerCase().includes(q)
    )
  }, [roster, searchQuery])

  const className = dashboard?.class_name || `Class #${classId}`
  const overallMastery = Math.round(dashboard?.overall_class_mastery || 0)

  function getSupportBadge(category) {
    if (category === 'Ready for next level' || category === 'Secure') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
          {category}
        </span>
      )
    }
    if (category === 'Proficient') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
          {category}
        </span>
      )
    }
    if (category === 'Developing') {
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
          {category}
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
        {category || 'Needs teacher support'}
      </span>
    )
  }

  async function handleReviewFlag(flagId, decision) {
    setReviewError(null)
    try {
      await masteryService.reviewErrorPattern(flagId, {
        decision,
        comments: `Teacher marked pattern as ${decision} during class analytics review.`,
      })
      setReviewMessage(`Flag #${flagId} updated to "${decision}".`)
      analyticsApi.refetch()
      setTimeout(() => setReviewMessage(null), 3500)
    } catch (err) {
      setReviewError(err.message || 'Failed to update error pattern flag.')
    }
  }

  const badgeCode =
    dashboard?.grade && dashboard?.section
      ? `${dashboard.grade}${dashboard.section}`
      : className.replace('Class ', '').slice(0, 4)

  return (
    <>
      <Topbar
        title={`${className} · Diagnostic Analytics & Roster`}
        breadcrumb="Teacher / Assigned Classes"
        subtitle="Explainable topic mastery, class heatmap, misconception flags, and student diagnostics"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/classes"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              ← Back to Assigned Classes
            </Link>
            <Link
              to="/teacher/interventions"
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Interventions ({dashboard?.active_interventions_count ?? 0})</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {reviewMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between">
            <span>{reviewMessage}</span>
            <button onClick={() => setReviewMessage(null)} className="font-bold">✕</button>
          </div>
        )}
        {reviewError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between">
            <span>{reviewError}</span>
            <button onClick={() => setReviewError(null)} className="font-bold">✕</button>
          </div>
        )}

        {analyticsApi.status === 'loading' && (
          <LoadingState label="Loading class diagnostics and mastery heatmap..." rows={6} />
        )}
        {analyticsApi.status === 'error' && (
          <ErrorState message={analyticsApi.error.message} onRetry={analyticsApi.refetch} />
        )}

        {analyticsApi.status === 'success' && (
          <>
            {/* 1. CLASS PROFILE CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center font-display font-black text-xl shadow-sm shadow-purple-500/25 shrink-0">
                    <span>{badgeCode}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-black text-slate-900">{className}</h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                        Grade {dashboard?.grade || '—'} · Section {dashboard?.section || '—'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      {dashboard?.total_enrolled ?? 0} enrolled students · {dashboard?.total_assessments ?? 0}{' '}
                      published/draft assessments
                    </p>
                  </div>
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="inline-flex flex-wrap rounded-2xl bg-slate-100 p-1 text-xs font-bold">
                  {[
                    { id: 'roster', label: `Students (${roster.length})` },
                    { id: 'curriculum', label: `Topics (${matrixTopics.length})` },
                    { id: 'heatmap', label: 'Mastery Heatmap' },
                    { id: 'errors', label: `Error Flags (${errorPatterns.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Performance Profile KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Class Average Mastery
                  </div>
                  <div className="font-display text-2xl font-black text-purple-950 mt-1">
                    {overallMastery}%
                  </div>
                  <div className="text-[11px] text-purple-700 font-semibold mt-0.5">
                    Calculated from live evidence
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Completed Attempts
                  </div>
                  <div className="font-display text-2xl font-black text-slate-900 mt-1">
                    {dashboard?.total_attempts_completed ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Across {dashboard?.total_assessments ?? 0} assessments
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active Interventions
                  </div>
                  <div className="font-display text-2xl font-black text-emerald-700 mt-1">
                    {dashboard?.active_interventions_count ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    In progress or pending review
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Suspected Error Flags
                  </div>
                  <div className="font-display text-2xl font-black text-amber-900 mt-1">
                    {dashboard?.active_error_flags_count ?? 0}
                  </div>
                  <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                    Open for teacher verification
                  </div>
                </div>
              </div>
            </div>

            {/* TAB 1: STUDENT ROSTER */}
            {activeTab === 'roster' && (
              <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>👥</span>
                      <span>
                        Enrolled Students in {className} ({filteredRoster.length})
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click any student row to review detailed mastery evidence, feedback notes, and error history.
                    </p>
                  </div>

                  <div className="relative max-w-xs w-full">
                    <input
                      type="text"
                      placeholder="Search student name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-500 focus:outline-hidden"
                    />
                    <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                  </div>
                </div>

                {filteredRoster.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      title="No students found"
                      description="No enrolled students match your current filter."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-3 py-3 text-center">Average Mastery</th>
                          <th className="px-3 py-3 text-center">Support Standing</th>
                          <th className="px-3 py-3">Latest Assessment</th>
                          <th className="px-3 py-3 text-center">Active Flags</th>
                          <th className="px-5 py-3 text-right">Profile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRoster.map((s) => (
                          <tr
                            key={s.student_id}
                            onClick={() => navigate(`/teacher/students/${s.student_id}?classId=${classId}`)}
                            className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs shrink-0">
                                  {s.student_name
                                    .split(' ')
                                    .map((p) => p[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{s.student_name}</div>
                                  <div className="text-[10px] text-slate-400">{s.student_email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3.5 text-center font-display font-black text-slate-900">
                              {Math.round(s.average_mastery || 0)}%
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              {getSupportBadge(s.support_category)}
                            </td>

                            <td className="px-3 py-3.5">
                              {s.latest_activity ? (
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {s.latest_activity.assessment_title}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Score: {Math.round(s.latest_activity.percentage || 0)}%
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400">No submissions yet</span>
                              )}
                            </td>

                            <td className="px-3 py-3.5 text-center font-bold">
                              {s.active_flags_count > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px]">
                                  {s.active_flags_count} Flag{s.active_flags_count === 1 ? '' : 's'}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right">
                              <span className="px-3 py-1 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-purple-700 shadow-2xs inline-flex items-center gap-1">
                                <span>Inspect</span>
                                <span>→</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TOPIC PROGRESSION */}
            {activeTab === 'curriculum' && (
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Curriculum Topic Progression · {className}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any topic to view question-by-question item accuracy and tagged misconceptions.
                  </p>
                </div>

                {matrixTopics.length === 0 ? (
                  <EmptyState title="No topics configured" description="Add topics under Content Management to track topic progression." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {matrixTopics.map((t) => {
                      const avg = Math.round(t.average_mastery || 0)
                      return (
                        <Link
                          key={t.topic_id}
                          to={`/teacher/classes/${classId}/topics/${t.topic_id}`}
                          className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-xs transition-all space-y-2 block"
                        >
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-900">{t.topic_title}</span>
                            <span className={avg >= 60 ? 'text-emerald-700' : 'text-amber-800'}>
                              {avg}% average
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${avg >= 60 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>
                              Needs support: {t.band_distribution?.['Needs strong support'] ?? 0} · Developing:{' '}
                              {t.band_distribution?.Developing ?? 0}
                            </span>
                            <span className="text-purple-700 font-bold">Item Analysis →</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FULL MASTERY HEATMAP MATRIX */}
            {activeTab === 'heatmap' && (
              <div className="space-y-4">
                {heatmapRows.length === 0 || heatmapTopics.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-8">
                    <EmptyState
                      title="No heatmap data yet"
                      description="Once students are enrolled and topics are configured, their mastery grid appears here."
                    />
                  </div>
                ) : (
                  <MasteryHeatmap
                    topics={heatmapTopics}
                    rows={heatmapRows}
                    onSelectStudent={(sid) => navigate(`/teacher/students/${sid}?classId=${classId}`)}
                  />
                )}
              </div>
            )}

            {/* TAB 4: CLASS ERROR PATTERNS REVIEW */}
            {activeTab === 'errors' && (
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Suspected Recurrent Error Patterns
                  </h3>
                  <p className="text-xs text-slate-500">
                    System flags are hypotheses triggered only after repeated wrong-answer evidence. Teachers confirm or dismiss each flag.
                  </p>
                </div>

                {errorPatterns.length === 0 ? (
                  <EmptyState
                    title="No active error flags"
                    description="No recurrent misconception flags are pending review in this class."
                  />
                ) : (
                  <div className="space-y-4">
                    {errorPatterns.map((pattern) => (
                      <div
                        key={pattern.tag_id}
                        className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className="font-display text-sm font-bold text-slate-900">
                              {pattern.tag_name}
                            </h4>
                            <p className="text-xs text-slate-600">
                              {pattern.topic_title ? `Topic: ${pattern.topic_title} · ` : ''}
                              {pattern.description || 'Recurrent misconception pattern'}
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-950 text-xs font-bold">
                            {pattern.affected_students_count} student
                            {pattern.affected_students_count === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200/70">
                          {pattern.affected_students.map((st) => (
                            <div
                              key={st.flag_id}
                              className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div>
                                <Link
                                  to={`/teacher/students/${st.student_id}?classId=${classId}`}
                                  className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                >
                                  {st.student_name}
                                </Link>
                                <span className="ml-2 text-slate-500">
                                  Matched {st.match_count} / {st.incorrect_count} missed items · Status:{' '}
                                  <strong className="capitalize">{st.status}</strong>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleReviewFlag(st.flag_id, 'dismissed')}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
                                >
                                  Dismiss
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewFlag(st.flag_id, 'confirmed')}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 font-bold text-white cursor-pointer"
                                >
                                  Confirm Pattern
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
