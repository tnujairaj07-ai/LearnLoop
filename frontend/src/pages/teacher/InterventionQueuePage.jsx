import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { StatusPill } from '../../components/ui/StatusPill'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { interventionsService } from '../../services/interventionsService'

export default function InterventionQueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classId, setClassId] = useState('')
  const [dismissTarget, setDismissTarget] = useState(null)
  const [actionError, setActionError] = useState(null)

  const classesApi = useApi(() => classesService.listForTeacher(user?.id), [user?.id])
  const activeClassId = classId || classesApi.data?.[0]?.id

  const interventionsApi = useApi(
    () => interventionsService.listForClass(activeClassId),
    [activeClassId],
    { skip: !activeClassId }
  )

  async function handleAccept(intervention) {
    setActionError(null)
    try {
      await interventionsService.update(intervention.id, { status: 'assigned' })
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleDismissConfirmed() {
    setActionError(null)
    try {
      await interventionsService.dismiss(dismissTarget.id)
      setDismissTarget(null)
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <>
      <Topbar title="Intervention queue" breadcrumb="Teacher" />
      <main className="flex-1 space-y-6 p-6">
        {classesApi.status === 'loading' && <LoadingState label="Loading classes" rows={2} />}
        {classesApi.status === 'error' && <ErrorState message={classesApi.error.message} onRetry={classesApi.refetch} />}

        {classesApi.status === 'success' && classesApi.data.length > 0 && (
          <select
            className="input w-64"
            value={activeClassId}
            onChange={(e) => setClassId(e.target.value)}
            aria-label="Select class"
          >
            {classesApi.data.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} · {cls.subjectName}
              </option>
            ))}
          </select>
        )}

        {actionError && <ErrorState message={actionError} />}

        {interventionsApi.status === 'loading' && <LoadingState label="Loading interventions" rows={4} />}
        {interventionsApi.status === 'error' && (
          <ErrorState message={interventionsApi.error.message} onRetry={interventionsApi.refetch} />
        )}
        {interventionsApi.isEmpty && (
          <EmptyState
            title="No interventions suggested"
            description="When enough students fall below the mastery threshold on a topic, a suggestion will appear here."
          />
        )}

        {interventionsApi.status === 'success' && !interventionsApi.isEmpty && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {interventionsApi.data.map((item) => (
              <Panel key={item.id} accent="amber" className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{item.topicName}</p>
                    <p className="text-xs text-ink-faint">
                      {item.affectedCount} students below {item.threshold}% mastery
                    </p>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                <p className="text-sm text-ink-light">
                  Main error: <span className="font-medium">{item.mainErrorPattern}</span>
                </p>
                <p className="text-sm text-ink-light">Recommended: {item.recommendedActivity}</p>
                {item.recommendedPracticeSet && (
                  <p className="text-sm text-ink-faint">Practice set: {item.recommendedPracticeSet}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn btn-primary" onClick={() => handleAccept(item)}>
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate(`/teacher/interventions/${item.id}`)}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setDismissTarget(item)}>
                    Dismiss
                  </button>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(dismissTarget)}
        title="Dismiss this intervention?"
        message={`This removes the suggestion for ${dismissTarget?.topicName}. You can still create a new one later.`}
        confirmLabel="Dismiss"
        danger
        onConfirm={handleDismissConfirmed}
        onCancel={() => setDismissTarget(null)}
      />
    </>
  )
}
