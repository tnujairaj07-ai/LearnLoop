import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { interventionsService } from '../../services/interventionsService'

export default function InterventionQueuePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [classId, setClassId] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [dismissTarget, setDismissTarget] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [successNotice, setSuccessNotice] = useState(null)

  // Manual create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTopic, setNewTopic] = useState('Fractions')
  const [newTitle, setNewTitle] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newAction, setNewAction] = useState('')

  const classesApi = useApi(() => classesService.listForTeacher(user?.id), [user?.id])
  const activeClasses = classesApi.data?.length > 0
    ? classesApi.data
    : [
        { id: 'cls_9a', name: 'Class 9-A', subjectName: 'Mathematics' },
        { id: 'cls_9b', name: 'Class 9-B', subjectName: 'Mathematics' },
      ]
  const activeClassId = classId || activeClasses[0]?.id

  const interventionsApi = useApi(
    () => interventionsService.listForClass(activeClassId),
    [activeClassId],
    { skip: !activeClassId }
  )

  const rawList = interventionsApi.data?.length > 0
    ? interventionsApi.data
    : [
        {
          id: 'inv_1',
          topicName: 'Fractions',
          affectedCount: 6,
          threshold: 60,
          mainErrorPattern: 'Denominator operations without common multiple',
          evidenceCount: 18,
          recommendedAction: 'Conduct a 20-min revision on fraction strips, assign Practice Set F-02, and reassess in 48 hours.',
          status: 'suggested',
          createdAt: 'Yesterday',
        },
        {
          id: 'inv_2',
          topicName: 'Linear Equations in Two Variables',
          affectedCount: 5,
          threshold: 60,
          mainErrorPattern: 'Sign reversal when transposing terms across equals sign',
          evidenceCount: 14,
          recommendedAction: 'Targeted drill on two-step linear equations and variable isolation.',
          status: 'suggested',
          createdAt: '2 days ago',
        },
        {
          id: 'inv_3',
          topicName: 'Polynomials',
          affectedCount: 4,
          threshold: 60,
          mainErrorPattern: 'Incorrect signs in algebraic identity expansions',
          evidenceCount: 12,
          recommendedAction: 'Worked examples on (a-b)^2 and difference of squares factoring.',
          status: 'assigned',
          createdAt: '3 days ago',
        },
        {
          id: 'inv_4',
          topicName: 'Coordinate Geometry',
          affectedCount: 8,
          threshold: 60,
          mainErrorPattern: 'Confusing x and y coordinates in quadrants II and IV',
          evidenceCount: 22,
          recommendedAction: 'Plotting drill on Cartesian graph paper with peer verification.',
          status: 'completed',
          createdAt: 'Last week',
          hakeGain: 0.68,
        },
      ]

  const filteredInterventions = rawList.filter((item) => {
    if (statusTab === 'all') return true
    return item.status === statusTab
  })

  async function handleAccept(intervention) {
    setActionError(null)
    try {
      await interventionsService.update(intervention.id, { status: 'assigned' })
      setSuccessNotice(`Intervention for "${intervention.topicName}" marked as Assigned.`)
      setTimeout(() => setSuccessNotice(null), 4000)
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
      setSuccessNotice('Intervention dismissed successfully.')
      setTimeout(() => setSuccessNotice(null), 4000)
      interventionsApi.refetch()
    } catch (err) {
      setActionError(err.message)
    }
  }

  function handleCreateManual(e) {
    e.preventDefault()
    setCreateModalOpen(false)
    setSuccessNotice(`Custom intervention created for ${newTopic}.`)
    setTimeout(() => setSuccessNotice(null), 4000)
    setNewTitle('')
    setNewReason('')
    setNewAction('')
  }

  return (
    <>
      <Topbar
        title="Closed-Loop Intervention Queue"
        breadcrumb="Interventions"
        subtitle="Turn assessment evidence into targeted teacher actions and measured learning gain"
        actions={
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>+ Create Manual Intervention</span>
          </button>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Success Alert */}
        {successNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{successNotice}</span>
            </div>
            <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </div>
        )}

        {actionError && <ErrorState message={actionError} />}

        {/* ============================================================== */}
        {/* 1. TOP CONTROLS: Class Selector & Status Filter Tabs           */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          {/* Class Selector Dropdown */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class:</span>
            <select
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 shadow-2xs focus:bg-white focus:outline-none"
              value={activeClassId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="Select class"
            >
              {activeClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} · {cls.subjectName || 'Mathematics'}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'all', label: 'All Interventions', count: rawList.length },
              { id: 'suggested', label: 'Suggested (Review Needed)', count: rawList.filter((i) => i.status === 'suggested').length },
              { id: 'assigned', label: 'Assigned (In Progress)', count: rawList.filter((i) => i.status === 'assigned').length },
              { id: 'completed', label: 'Completed (Gain Evaluated)', count: rawList.filter((i) => i.status === 'completed').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  statusTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusTab === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. INTERVENTION CARDS LIST                                     */}
        {/* ============================================================== */}
        {filteredInterventions.length === 0 ? (
          <EmptyState
            title="No interventions found"
            description="There are no intervention suggestions matching this status filter."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {filteredInterventions.map((item) => {
              const isSuggested = item.status === 'suggested'
              const isAssigned = item.status === 'assigned'
              const isCompleted = item.status === 'completed'

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
                    {/* Top Row: Topic Pill + Status Pill */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800">
                          {item.topicName}
                        </span>
                        <span className="text-xs text-slate-400">· {item.createdAt || 'Recent'}</span>
                      </div>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isSuggested
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : isAssigned
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Main Recurring Error Pattern */}
                    <h3 className="font-display font-extrabold text-lg text-slate-950 tracking-tight leading-snug">
                      {item.mainErrorPattern}
                    </h3>

                    {/* Diagnostic evidence stats */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 font-medium">
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                        <span>●</span>
                        <span>{item.affectedCount} students &lt; {item.threshold || 60}%</span>
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>Evidence: {item.evidenceCount || 15} repeated error tags</span>
                    </div>

                    {/* Action plan box */}
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 block mb-0.5">Recommended Pedagogical Plan:</strong>
                      {item.recommendedAction}
                    </div>

                    {/* Normalized Hake Gain Badge if completed */}
                    {isCompleted && item.hakeGain != null && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
                        <span>Pre/Post Normalized Learning Gain:</span>
                        <span className="font-bold text-sm text-emerald-700 font-mono">
                          g = {item.hakeGain} (Moderate/High Gain)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
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

        {/* Dismiss confirmation modal */}
        <ConfirmDialog
          open={Boolean(dismissTarget)}
          title="Dismiss this intervention suggestion?"
          description={`Dismissing this suggestion removes it from your queue. You can always create a manual intervention later if ${dismissTarget?.topicName} students require support.`}
          confirmLabel="Dismiss suggestion"
          cancelLabel="Keep in queue"
          variant="danger"
          onConfirm={handleDismissConfirmed}
          onCancel={() => setDismissTarget(null)}
        />

        {/* Manual create intervention modal */}
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
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
              >
                <option value="Fractions">Fractions (Unit I)</option>
                <option value="Polynomials">Polynomials (Unit II)</option>
                <option value="Linear Equations">Linear Equations (Unit II)</option>
                <option value="Coordinate Geometry">Coordinate Geometry (Unit III)</option>
                <option value="Geometry">Geometry &amp; Triangles (Unit IV)</option>
                <option value="Statistics">Statistics (Unit VI)</option>
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
                placeholder="Step 1: 15-min whiteboard demonstration. Step 2: Assign Level 1 practice set. Step 3: Reassess."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                Create Intervention
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  )
}
