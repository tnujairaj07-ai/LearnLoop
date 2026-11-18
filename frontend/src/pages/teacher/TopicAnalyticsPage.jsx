import { useParams, Link } from 'react-router-dom'
import { DistributionBarChart } from '../../components/charts/DistributionBarChart'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'

export default function TopicAnalyticsPage() {
  const { classId, topicId } = useParams()

  const { status, data, error, refetch } = useApi(
    () => analyticsService.topicAnalytics(classId, topicId),
    [classId, topicId]
  )

  const topicName = data?.topic_name || 'Topic Diagnostics'
  const questions = data?.questions || []
  const errorPatterns = data?.error_patterns || []
  const distribution = data?.distribution || []
  const students = data?.students || []
  const hasAttempts = distribution.some((d) => (d.students || 0) > 0) && students.some((s) => (s.evidence_count || 0) > 0)

  return (
    <>
      <Topbar
        title={`${topicName} · Item & Misconception Analysis`}
        breadcrumb="Class Analytics / Topic"
        subtitle="Question-level accuracy, band distribution, and tagged error patterns"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/teacher/classes/${classId}`}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              ← Back to Class Analytics
            </Link>
            <Link
              to="/teacher/interventions"
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-xs font-bold text-slate-950 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Create Intervention</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {status === 'loading' && <LoadingState label="Loading topic analytics and item analysis" rows={6} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && (
          <>
            {/* Top Header Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Diagnostic Deep Dive
                </span>
                <h2 className="font-display text-2xl font-extrabold text-slate-950 mt-1 tracking-tight">
                  {topicName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Class Average Mastery: <strong>{Math.round(data?.average_mastery || 0)}%</strong> · Examine item accuracy to guide targeted intervention.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Questions
                  </span>
                  <span className="font-display font-extrabold text-xl text-slate-900">
                    {questions.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                    Error Patterns
                  </span>
                  <span className="font-display font-extrabold text-xl text-amber-950">
                    {errorPatterns.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid: Mastery Distribution + Identified Misconception Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Mastery Band Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Number of students in each mastery band for {topicName}.
                  </p>
                  <div className="my-5">
                    {distribution.length && hasAttempts ? (
                      <DistributionBarChart data={distribution} />
                    ) : (
                      <EmptyState
                        title="No student evidence yet"
                        description="Distribution appears once students attempt questions in this topic."
                      />
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Target: &ge; 60% Proficient</span>
                  <span className="font-semibold text-blue-600">Calculated from live attempts</span>
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                      Tagged Recurrent Error Patterns
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Suspected Hypotheses
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Patterns appear only after repeated evidence across related questions and remain open to teacher review.
                  </p>

                  <div className="my-4 space-y-2.5">
                    {errorPatterns.length > 0 ? (
                      errorPatterns.map((pattern) => (
                        <div
                          key={pattern.id || pattern.label}
                          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{pattern.label}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Suspected recurrent misconception under teacher oversight
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 text-amber-950 shrink-0">
                            {pattern.count} flag{pattern.count === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No error patterns flagged"
                        description="No recurrent misconception has crossed the detection threshold for this topic yet."
                      />
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Review & override available in Class Error Patterns &amp; Interventions
                  </span>
                  <Link
                    to="/teacher/interventions"
                    className="text-xs font-bold text-amber-900 hover:underline"
                  >
                    Open Interventions →
                  </Link>
                </div>
              </div>
            </div>

            {/* Assessment Question Item & Accuracy Table */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Question Bank Item Accuracy Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Question-by-question class accuracy across submitted assessments and practice attempts.
                  </p>
                </div>

                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {questions.length} Question{questions.length === 1 ? '' : 's'}
                </span>
              </div>

              {questions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3 font-bold text-slate-800">Question Text</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Difficulty</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Responses</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Class Accuracy</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Missed Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 font-medium max-w-md">{q.text}</td>
                          <td className="px-3 py-3 text-center">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                q.difficulty === 'hard'
                                  ? 'bg-rose-100 text-rose-800'
                                  : q.difficulty === 'medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                            {q.total_responses ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-bold text-slate-900 tabular-nums">
                                {q.total_responses > 0 ? `${Math.round(q.correct_rate || 0)}%` : '—'}
                              </span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    (q.correct_rate || 0) >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.round(q.correct_rate || 0)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-rose-700 tabular-nums">
                            {q.missed_count ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No question responses yet"
                  description="Question-by-question metrics appear once questions exist and students submit attempts."
                />
              )}
            </div>

            {/* Per-student topic scores */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Student Mastery in {topicName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any student to inspect their topic breakdown and assign targeted practice.
                  </p>
                </div>
              </div>

              {students.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3 font-bold text-slate-800">Student</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Mastery Score</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Band</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Evidence Items</th>
                        <th className="px-4 py-3 font-bold text-slate-800 text-right">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((st) => (
                        <tr key={st.student_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-slate-900">
                            {st.student_name}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold tabular-nums">
                            {st.evidence_count > 0 ? `${Math.round(st.mastery_score)}%` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              {st.evidence_count > 0 ? st.band : 'Unassessed'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-slate-600">
                            {st.evidence_count ?? 0}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              to={`/teacher/students/${st.student_id}?classId=${classId}`}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No enrolled students" description="No students are enrolled in this class yet." />
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
