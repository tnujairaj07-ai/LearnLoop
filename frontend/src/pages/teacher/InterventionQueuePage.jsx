import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Modal } from '../../components/ui/Modal'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { interventionsService } from '../../services/interventionsService'
import { topicsService } from '../../services/topicsService'

export default function InterventionQueuePage() {
  const navigate = useNavigate()
  const [classId, setClassId] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [dismissTarget, setDismissTarget] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [successNotice, setSuccessNotice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [creating, setCreating] = useState(false)

  // Manual create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTopicId, setNewTopicId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newAction, setNewAction] = useState('')

  const classesApi = useApi(() => classesService.listForTeacher(), [])
  const topicsApi = useApi(() => topicsService.listAll(), [])

  const assignedClasses = useMemo(() => classesApi.data || [], [classesApi.data])
  const topicsList = useMemo(() => topicsApi.data || [], [topicsApi.data])

  const activeClassId = classId ? Number(classId) : assignedClasses[0]?.class_id || null

  useEffect(() => {
    if (!newTopicId && topicsList.length > 0) {
      setNewTopicId(String(topicsList[0].id))
    }
  }, [topicsList, newTopicId])

  const interventionsApi = useApi(
    () => interventionsService.listForClass(activeClassId),
    [activeClassId],
    { skip: !activeClassId }
  )

  const rawList = useMemo(() => interventionsApi.data || [], [interventionsApi.data])

  const filteredInterventions = useMemo(() => {
    return rawList.filter((item) => {
      if (statusTab === 'all') return item.status !== 'dismissed'
      return item.status === statusTab
    })
  }, [rawList, statusTab])

  async function handleGenerate() {
    if (!activeClassId) return
    setGenerating(true)
    setActionError(null)
    try {
      await interventionsService.generate(activeClassId)
      setSuccessNotice('Diagnostic scan complete — intervention suggestions refreshed.')
      interventionsApi.refetch()
      setTimeout(() => setSuccessNotice(null), 4000)
    } catch (err) {
      setActionError(err.message || 'Could not generate intervention suggestions.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleAccept(intervention) {
    setActionError(null)
    try {
      await interventionsService.assign(intervention.id, {})
      setSuccessNotice(`Intervention "${intervention.title}" assigned to affected class students.`)
      setTimeout(() => setSuccessNotice(null), 4000)
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message || 'Could not assign intervention.')
    }
  }

  async function handleDismissConfirmed() {
    if (!dismissTarget) return
    setActionError(null)
    try {
      await interventionsService.dismiss(dismissTarget.id)
      setDismissTarget(null)
      setSuccessNotice('Intervention dismissed.')
      setTimeout(() => setSuccessNotice(null), 4000)
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message || 'Could not dismiss intervention.')
    }
  }

  async function handleCreateManual(e) {
    e.preventDefault()
    if (!activeClassId || !newTopicId) return
    setCreating(true)
    setActionError(null)
    try {
      await interventionsService.create({
        class_id: Number(activeClassId),
        topic_id: Number(newTopicId),
        title: newTitle.trim(),
        reason: newReason.trim(),
        recommended_action: newAction.trim(),
      })
      setCreateModalOpen(false)
      setSuccessNotice('Custom teacher intervention created.')
      setTimeout(() => setSuccessNotice(null), 4000)
      setNewTitle('')
      setNewReason('')
      setNewAction('')
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message || 'Could not create intervention.')
    } finally {
      setCreating(false)
    }
  }

  const loading = classesApi.status === 'loading' || (interventionsApi.status === 'loading' && !interventionsApi.data)

  return (
    <>
      <Topbar
        title="Closed-Loop Intervention Queue"
        breadcrumb="Interventions"
        subtitle="Turn assessment evidence into targeted teacher actions and measured learning gain"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!activeClassId || generating}
              onClick={handleGenerate}
              className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-950 transition-colors cursor-pointer disabled:opacity-50"
            >
              {generating ? 'Scanning…' : '⚡ Auto-Suggest from Class Data'}
            </button>
            <button
              type="button"
              disabled={!activeClassId}
              onClick={() => setCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>+ Create Manual Intervention</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {successNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {actionError && <ErrorState message={actionError} />}
        {classesApi.status === 'error' && (
          <ErrorState message={classesApi.error.message} onRetry={classesApi.refetch} />
        )}

        {classesApi.status === 'success' && assignedClasses.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No classes assigned yet"
              description="Once an administrator assigns you to a class, you can review diagnostic suggestions and assign interventions."
            />
          </div>
        )}

        {assignedClasses.length > 0 && (
          <>
            {/* 1. TOP CONTROLS: Class Selector & Status Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class:</span>
                <select
                  className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 shadow-2xs focus:bg-white focus:outline-none"
                  value={activeClassId || ''}
                  onChange={(e) => setClassId(e.target.value)}
                  aria-label="Select class"
                >
                  {assignedClasses.map((cls) => (
                    <option key={`${cls.class_id}-${cls.subject_id || 'all'}`} value={cls.class_id}>
                      {cls.class_name} · {cls.subject_name || 'Class'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
                {[
                  {
                    id: 'all',
                    label: 'Active Queue',
                    count: rawList.filter((i) => i.status !== 'dismissed').length,
                  },
                  {
                    id: 'suggested',
                    label: 'Suggested (Review Needed)',
                    count: rawList.filter((i) => i.status === 'suggested').length,
                  },
                  {
                    id: 'assigned',
                    label: 'Assigned (In Progress)',
                    count: rawList.filter((i) => ['assigned', 'in_progress', 'reassessment_pending'].includes(i.status)).length,
                  },
                  {
                    id: 'completed',
                    label: 'Completed (Gain Evaluated)',
                    count: rawList.filter((i) => i.status === 'completed').length,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      statusTab === tab.id
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        statusTab === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {loading && <LoadingState label="Loading intervention queue..." rows={4} />}
            {interventionsApi.status === 'error' && (
              <ErrorState message={interventionsApi.error.message} onRetry={interventionsApi.refetch} />
            )}

            {/* 2. INTERVENTION CARDS LIST */}
            {!loading && interventionsApi.status === 'success' && (
              <>
                {filteredInterventions.length === 0 ? (
                  <EmptyState
                    title="No interventions in this view"
                    description="Click Auto-Suggest from Class Data to scan current mastery bands, or create a custom intervention."
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {filteredInterventions.map((item) => {
                      const isSuggested = item.status === 'suggested'
                      const isAssigned = ['assigned', 'in_progress', 'reassessment_pending'].includes(item.status)
                      const isCompleted = item.status === 'completed'
                      const affectedCount =
                        item.assigned_students_count ||
                        (item.evidence?.low_mastery_count ?? 0) ||
                        0

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border-2 p-5 sm:p-6 transition-all flex flex-col justify-between bg-white ${
                            isSuggested
                              ? 'border-amber-300 shadow-[3px_3px_0px_#f59e0b]'
                              : isAssigned
                              ? 'border-blue-300 shadow-[3px_3px_0px_#3b82f6]'
                              : 'border-emerald-300 shadow-[3px_3px_0px_#10b981]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                  {item.topic_title || 'Topic Focus'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  · {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  isSuggested
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : isAssigned
                                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>

                            <h3 className="font-display font-extrabold text-lg text-slate-950 tracking-tight leading-snug">
                              {item.title}
                            </h3>

                            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.reason}</p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2.5 font-medium">
                              <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                <span>●</span>
                                <span>{affectedCount} students targeted</span>
                              </span>
                              {item.evidence?.average_mastery !== undefined && (
                                <span>Topic avg: {Math.round(item.evidence.average_mastery)}%</span>
                              )}
                            </div>

                            <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                              <strong className="text-slate-900 block mb-0.5">Recommended Action Plan:</strong>
                              {item.recommended_action}
                            </div>
                          </div>

                          <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/teacher/interventions/${item.id}`)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>View &amp; Edit Details</span>
                              <span>→</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {isSuggested && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setDismissTarget(item)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAccept(item)}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 font-display font-bold text-xs text-slate-950 shadow-2xs transition-all cursor-pointer"
                                  >
                                    Accept &amp; Assign →
                                  </button>
                                </>
                              )}

                              {isAssigned && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/interventions/${item.id}`)}
                                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 font-display font-bold text-xs text-white shadow-2xs transition-all cursor-pointer"
                                >
                                  Complete &amp; Measure Gain →
                                </button>
                              )}

                              {isCompleted && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/interventions/${item.id}`)}
                                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-display font-bold text-xs text-slate-700 transition-all cursor-pointer"
                                >
                                  View Outcomes →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <ConfirmDialog
          open={Boolean(dismissTarget)}
          title="Dismiss this intervention suggestion?"
          description={`Dismissing "${dismissTarget?.title}" removes it from your active queue. You can still create a manual intervention for ${dismissTarget?.topic_title || 'this topic'} later.`}
          confirmLabel="Dismiss suggestion"
          cancelLabel="Keep in queue"
          variant="danger"
          onConfirm={handleDismissConfirmed}
          onCancel={() => setDismissTarget(null)}
        />

        <Modal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Manual Intervention"
          subtitle="Formulate a tailored teacher intervention for your class"
        >
          <form onSubmit={handleCreateManual} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Target Topic</label>
              <select
                required
                value={newTopicId}
                onChange={(e) => setNewTopicId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
              >
                {topicsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Intervention Title / Focus</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Denominator Operations Revision Drill"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pedagogical Reason / Observation</label>
              <textarea
                rows={2}
                required
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Observed in classroom practice or baseline diagnostic quiz..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Recommended Action &amp; Reassessment Plan</label>
              <textarea
                rows={3}
                required
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Step 1: 15-min whiteboard walkthrough. Step 2: Assign targeted practice set. Step 3: Reassess."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newTopicId}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {creating ? 'Creating…' : 'Create Intervention'}
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  )
}
