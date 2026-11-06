import { useParams, useNavigate, Link } from 'react-router-dom'
import { DistributionBarChart } from '../../components/charts/DistributionBarChart'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'

export default function TopicAnalyticsPage() {
  const { classId, topicId } = useParams()
  const navigate = useNavigate()

  const { status, data, error, refetch } = useApi(
    () => analyticsService.topicAnalytics(classId, topicId),
    [classId, topicId]
  )

  const topicName = data?.topicName || 'Topic Diagnostics'

  return (
    <>
      <Topbar
        title={`${topicName} · Item & Misconception Analysis`}
        breadcrumb="Class Analytics / Topic"
        subtitle="Question-level accuracy, distractor choices, and tagged error patterns"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/teacher/classes/${classId}`}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              ← Back to Class Heatmap
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
                  Examine how students answered specific questions to identify targeted intervention needs.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Questions</span>
                  <span className="font-display font-extrabold text-xl text-slate-900">{data.questions?.length || 5}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">Error Patterns</span>
                  <span className="font-display font-extrabold text-xl text-amber-950">{data.errorPatterns?.length || 2}</span>
                </div>
              </div>
            </div>

            {/* Grid: Mastery Distribution + Identified Misconception Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Mastery Distribution Chart (6 cols) */}
              <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Mastery Band Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proportion of students in each proficiency band for {topicName}.
                  </p>
                  <div className="my-5">
                    {data.distribution?.length ? (
                      <DistributionBarChart data={data.distribution} />
                    ) : (
                      <EmptyState title="No attempts yet" description="Distribution appears once students attempt this topic." />
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Target: &gt; 60% Proficient</span>
                  <span className="font-semibold text-blue-600">Updated in real time</span>
                </div>
              </div>

              {/* Tagged Misconception Clusters (6 cols) */}
              <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                      Tagged Recurrent Error Patterns
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Misconceptions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    System flags a misconception only when evidence is repeatedly observed across questions.
                  </p>

                  <div className="my-4 space-y-2.5">
                    {data.errorPatterns?.length ? (
                      data.errorPatterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{pattern.label}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Repeated mistake hypothesis under teacher oversight
                            </p>
                          </div>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200 text-amber-950 shrink-0">
                            {pattern.count} students affected
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
                  <span className="text-[11px] text-slate-400">Teacher override allowed in Interventions Queue</span>
                  <Link
                    to="/teacher/interventions"
                    className="text-xs font-bold text-amber-900 hover:underline"
                  >
                    Act on these errors →
                  </Link>
                </div>
              </div>
            </div>

            {/* Assessment Question Item & Distractor Analysis Table */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Assessment Item &amp; Distractor Analysis
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Question-by-question class accuracy and which distractors students selected most often.
                  </p>
                </div>

                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  {data.questions?.length || 0} Questions Evaluated
                </span>
              </div>

              {data.questions?.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3 font-bold text-slate-800">Question Text</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Difficulty</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Class Accuracy</th>
                        <th className="px-3 py-3 font-bold text-slate-800 text-center">Missed Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.questions.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-900 font-medium max-w-md">
                            {q.text}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              q.difficulty === 'hard'
                                ? 'bg-rose-100 text-rose-800'
                                : q.difficulty === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <span className="font-bold text-slate-900 tabular-nums">
                                {q.correctRate != null ? `${q.correctRate}%` : '—'}
                              </span>
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div
                                  className={`h-full rounded-full ${
                                    (q.correctRate || 50) >= 60 ? 'bg-blue-600' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${q.correctRate || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-rose-700 tabular-nums">
                            {q.missedCount} students
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No question responses yet"
                  description="Question-by-question metrics appear once students submit their checkpoint assessments."
                />
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
