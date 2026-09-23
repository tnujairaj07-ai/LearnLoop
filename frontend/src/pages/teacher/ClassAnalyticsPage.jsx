import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MasteryHeatmap } from '../../components/charts/MasteryHeatmap'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { masteryService } from '../../services/masteryService'

export default function ClassAnalyticsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [topicFilter, setTopicFilter] = useState('')

  const { status, data, error, refetch, isEmpty } = useApi(
    () => masteryService.classHeatmap(classId, { topicId: topicFilter || undefined }),
    [classId, topicFilter],
    { emptyWhen: (d) => !d?.rows?.length }
  )

  const topics = useMemo(() => data?.topics ?? [], [data])

  return (
    <>
      <Topbar title={data ? `${data.className} · ${data.subjectName}` : 'Class analytics'} breadcrumb="Teacher / Class analytics" />
      <main className="flex-1 space-y-6 p-6">
        {status === 'loading' && <LoadingState label="Loading class analytics" rows={6} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && (
          <>
            <Panel accent="teal">
              <PanelHeader
                title="Mastery heatmap"
                subtitle={`${data.rows.length} students · below-threshold students are flagged`}
                action={
                  <select
                    className="input w-48"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    aria-label="Filter by topic"
                  >
                    <option value="">All topics</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                }
              />
              {isEmpty ? (
                <EmptyState title="No student data yet" description="Mastery will appear once students start practicing." />
              ) : (
                <MasteryHeatmap
                  topics={topics}
                  rows={data.rows}
                  threshold={data.threshold}
                  onSelectStudent={(studentId) => navigate(`/teacher/students/${studentId}`)}
                />
              )}
            </Panel>

            {!isEmpty && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => navigate(`/teacher/classes/${classId}/topics/${topic.id}`)}
                    className="panel p-4 text-left hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-ink">{topic.name}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      Avg mastery {topic.average != null ? `${topic.average}%` : '—'} · view topic analytics
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
