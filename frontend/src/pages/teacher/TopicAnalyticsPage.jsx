import { useParams } from 'react-router-dom'
import { DistributionBarChart } from '../../components/charts/DistributionBarChart'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { Table } from '../../components/ui/Table'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'

export default function TopicAnalyticsPage() {
  const { classId, topicId } = useParams()
  const { status, data, error, refetch } = useApi(
    () => analyticsService.topicAnalytics(classId, topicId),
    [classId, topicId]
  )

  return (
    <>
      <Topbar title={data ? `${data.topicName} · topic analytics` : 'Topic analytics'} breadcrumb="Teacher / Class analytics / Topic" />
      <main className="flex-1 space-y-6 p-6">
        {status === 'loading' && <LoadingState label="Loading topic analytics" rows={6} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && (
          <>
            <Panel accent="teal">
              <PanelHeader title="Mastery distribution" subtitle="How many students are low, medium or high on this topic" />
              {data.distribution?.length ? (
                <DistributionBarChart data={data.distribution} />
              ) : (
                <EmptyState title="No attempts yet" description="Distribution appears once students attempt this topic." />
              )}
            </Panel>

            <Panel accent="amber">
              <PanelHeader
                title="Most-missed questions"
                subtitle="Ranked by how often students got them wrong"
              />
              {data.questions?.length ? (
                <Table columns={['Question', 'Difficulty', 'Correct rate', 'Missed by']}>
                  {data.questions.map((q) => (
                    <tr key={q.id}>
                      <td className="max-w-md px-3 py-2">{q.text}</td>
                      <td className="px-3 py-2 capitalize">{q.difficulty}</td>
                      <td className="px-3 py-2 tabular-nums">{q.correctRate != null ? `${q.correctRate}%` : '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{q.missedCount} students</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <EmptyState title="No question data yet" description="This fills in once students attempt questions on this topic." />
              )}
            </Panel>

            <Panel accent="clay">
              <PanelHeader title="Common error patterns" subtitle="Tagged misconceptions across this topic" />
              {data.errorPatterns?.length ? (
                <ul className="space-y-2">
                  {data.errorPatterns.map((pattern) => (
                    <li key={pattern.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                      <span>{pattern.label}</span>
                      <span className="tabular-nums text-ink-faint">{pattern.count} students</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No error patterns flagged" description="Nothing has crossed the misconception threshold yet." />
              )}
            </Panel>
          </>
        )}
      </main>
    </>
  )
}
