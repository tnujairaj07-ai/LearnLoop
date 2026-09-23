import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { StatusPill } from '../../components/ui/StatusPill'
import { FormField, Select, TextInput } from '../../components/ui/FormField'
import { useApi } from '../../hooks/useApi'
import { interventionsService } from '../../services/interventionsService'

export default function InterventionDetailPage() {
  const { interventionId } = useParams()
  const { status, data, error, refetch } = useApi(
    () => interventionsService.get(interventionId),
    [interventionId]
  )

  const [assignMode, setAssignMode] = useState('class')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [reassessDate, setReassessDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  function toggleStudent(id) {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  async function handleAssign() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await interventionsService.assign(interventionId, {
        scope: assignMode,
        studentIds: assignMode === 'selected' ? selectedStudents : undefined,
        reassessmentDate: reassessDate || undefined,
      })
      setSaved(true)
      refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title={data ? `Intervention · ${data.topicName}` : 'Intervention'} breadcrumb="Teacher / Interventions" />
      <main className="flex-1 space-y-6 p-6">
        {status === 'loading' && <LoadingState label="Loading intervention" rows={5} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && (
          <>
            <Panel accent="amber">
              <PanelHeader title={data.topicName} subtitle={`Main error pattern: ${data.mainErrorPattern}`} action={<StatusPill status={data.status} />} />
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-ink-faint">Affected students</dt>
                  <dd className="font-medium">{data.affectedStudents?.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Recommended activity</dt>
                  <dd className="font-medium">{data.recommendedActivity}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Practice set</dt>
                  <dd className="font-medium">{data.recommendedPracticeSet || '—'}</dd>
                </div>
                <div>
                  <dt className="text-ink-faint">Threshold</dt>
                  <dd className="font-medium">{data.threshold}%</dd>
                </div>
              </dl>
            </Panel>

            <Panel>
              <PanelHeader title="Affected students" />
              {data.affectedStudents?.length ? (
                <ul className="divide-y divide-border">
                  {data.affectedStudents.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                      <label className="flex items-center gap-2">
                        {assignMode === 'selected' && (
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => toggleStudent(s.id)}
                          />
                        )}
                        {s.name}
                      </label>
                      <span className="tabular-nums text-ink-faint">{s.mastery}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No students listed" description="Affected students will show once available." />
              )}
            </Panel>

            <Panel accent="teal">
              <PanelHeader title="Assign this intervention" />
              <FormField label="Assign to" htmlFor="assignMode">
                <Select id="assignMode" value={assignMode} onChange={(e) => setAssignMode(e.target.value)}>
                  <option value="class">Whole class</option>
                  <option value="selected">Selected students</option>
                </Select>
              </FormField>
              <FormField label="Reassessment date" htmlFor="reassessDate" hint="Optional — when students will be retested">
                <TextInput id="reassessDate" type="date" value={reassessDate} onChange={(e) => setReassessDate(e.target.value)} />
              </FormField>
              {saveError && <p className="mb-3 text-sm text-clay-700">{saveError}</p>}
              {saved && <p className="mb-3 text-sm text-teal-700">Intervention assigned.</p>}
              <button type="button" className="btn btn-primary" onClick={handleAssign} disabled={saving}>
                {saving ? 'Assigning…' : 'Assign intervention'}
              </button>
            </Panel>
          </>
        )}
      </main>
    </>
  )
}
