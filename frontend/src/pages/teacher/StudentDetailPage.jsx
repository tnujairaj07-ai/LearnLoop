import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { GrowthLineChart } from '../../components/charts/GrowthLineChart'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { StatusPill } from '../../components/ui/StatusPill'
import { FormField, TextArea, TextInput } from '../../components/ui/FormField'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'
import { studentsService } from '../../services/studentsService'

export default function StudentDetailPage() {
  const { studentId } = useParams()

  const studentApi = useApi(() => studentsService.get(studentId), [studentId])
  const growthApi = useApi(() => analyticsService.studentGrowth(studentId), [studentId])
  const errorApi = useApi(() => analyticsService.studentErrorPatterns(studentId), [studentId])
  const recommendationsApi = useApi(() => studentsService.recommendations(studentId), [studentId])
  const interventionsApi = useApi(() => studentsService.interventionHistory(studentId), [studentId])

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteError, setNoteError] = useState(null)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTopic, setAssignTopic] = useState('')
  const [assignSet, setAssignSet] = useState('')
  const [assignError, setAssignError] = useState(null)

  async function submitNote() {
    if (!noteText.trim()) {
      setNoteError('Write a note before saving.')
      return
    }
    try {
      await studentsService.addNote(studentId, { text: noteText })
      setNoteOpen(false)
      setNoteText('')
      setNoteError(null)
    } catch (err) {
      setNoteError(err.message)
    }
  }

  async function submitAssign() {
    if (!assignTopic.trim()) {
      setAssignError('Choose a topic to assign practice for.')
      return
    }
    try {
      await studentsService.assignPractice(studentId, { topic: assignTopic, practiceSet: assignSet })
      setAssignOpen(false)
      setAssignTopic('')
      setAssignSet('')
      setAssignError(null)
    } catch (err) {
      setAssignError(err.message)
    }
  }

  async function overridePattern(patternId) {
    try {
      await analyticsService.overrideErrorPattern(studentId, patternId, { overridden: true })
      errorApi.refetch()
    } catch {
      /* surfaced via panel-level error state on next load */
    }
  }

  return (
    <>
      <Topbar title={studentApi.data ? studentApi.data.name : 'Student detail'} breadcrumb="Teacher / Student" />
      <main className="flex-1 space-y-6 p-6">
        {studentApi.status === 'loading' && <LoadingState label="Loading student" rows={3} />}
        {studentApi.status === 'error' && <ErrorState message={studentApi.error.message} onRetry={studentApi.refetch} />}

        {studentApi.status === 'success' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setNoteOpen(true)}>
              Add note
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(true)}>
              Manually assign practice
            </button>
          </div>
        )}

        <Panel accent="teal">
          <PanelHeader title="Mastery per topic" />
          {studentApi.status === 'loading' && <LoadingState rows={3} />}
          {studentApi.status === 'success' && studentApi.data.topicMastery?.length ? (
            <ul className="space-y-2">
              {studentApi.data.topicMastery.map((t) => (
                <li key={t.topicId} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0">{t.topicName}</span>
                  <div className="h-2 flex-1 rounded-full bg-surface-sunken">
                    <div
                      className="h-2 rounded-full bg-teal"
                      style={{ width: `${Math.min(100, Math.max(0, t.mastery))}%` }}
                    />
                  </div>
                  <span className="w-10 text-right tabular-nums">{t.mastery}%</span>
                </li>
              ))}
            </ul>
          ) : (
            studentApi.status === 'success' && <EmptyState title="No mastery data yet" />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Growth over time" />
          {growthApi.status === 'loading' && <LoadingState rows={3} />}
          {growthApi.status === 'error' && <ErrorState message={growthApi.error.message} onRetry={growthApi.refetch} />}
          {growthApi.status === 'success' && (growthApi.data?.length ? (
            <GrowthLineChart data={growthApi.data} />
          ) : (
            <EmptyState title="Not enough attempts yet" description="Growth appears after a few assessments." />
          ))}
        </Panel>

        <Panel accent="clay">
          <PanelHeader title="Error patterns" />
          {errorApi.status === 'loading' && <LoadingState rows={2} />}
          {errorApi.status === 'error' && <ErrorState message={errorApi.error.message} onRetry={errorApi.refetch} />}
          {errorApi.status === 'success' && (errorApi.data?.length ? (
            <ul className="space-y-2">
              {errorApi.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span>{p.label}</span>
                  <div className="flex items-center gap-3">
                    {p.overridden ? (
                      <span className="text-xs text-ink-faint">Overridden</span>
                    ) : (
                      <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => overridePattern(p.id)}>
                        Mark as not a pattern
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No flagged patterns" />
          ))}
        </Panel>

        <Panel>
          <PanelHeader title="Current recommendations" />
          {recommendationsApi.status === 'loading' && <LoadingState rows={2} />}
          {recommendationsApi.status === 'error' && (
            <ErrorState message={recommendationsApi.error.message} onRetry={recommendationsApi.refetch} />
          )}
          {recommendationsApi.status === 'success' && (recommendationsApi.data?.length ? (
            <ul className="space-y-2 text-sm">
              {recommendationsApi.data.map((r) => (
                <li key={r.id} className="rounded border border-border px-3 py-2">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-ink-faint">{r.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No open recommendations" />
          ))}
        </Panel>

        <Panel>
          <PanelHeader title="Past interventions" />
          {interventionsApi.status === 'loading' && <LoadingState rows={2} />}
          {interventionsApi.status === 'error' && (
            <ErrorState message={interventionsApi.error.message} onRetry={interventionsApi.refetch} />
          )}
          {interventionsApi.status === 'success' && (interventionsApi.data?.length ? (
            <ul className="divide-y divide-border">
              {interventionsApi.data.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{i.topicName}</p>
                    <p className="text-ink-faint">{i.outcome || 'Outcome pending'}</p>
                  </div>
                  <StatusPill status={i.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No past interventions" />
          ))}
        </Panel>
      </main>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add a note"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setNoteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitNote}>
              Save note
            </button>
          </>
        }
      >
        <FormField label="Note" htmlFor="note" error={noteError} required>
          <TextArea id="note" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
        </FormField>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Manually assign practice"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={submitAssign}>
              Assign
            </button>
          </>
        }
      >
        <FormField label="Topic" htmlFor="assignTopic" error={assignError} required>
          <TextInput id="assignTopic" value={assignTopic} onChange={(e) => setAssignTopic(e.target.value)} />
        </FormField>
        <FormField label="Practice set" htmlFor="assignSet" hint="Optional">
          <TextInput id="assignSet" value={assignSet} onChange={(e) => setAssignSet(e.target.value)} />
        </FormField>
      </Modal>
    </>
  )
}
