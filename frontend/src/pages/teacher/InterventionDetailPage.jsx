import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'
import { interventionsService } from '../../services/interventionsService'
import { studentsService } from '../../services/studentsService'

export default function InterventionDetailPage() {
  const { interventionId } = useParams()

  const detailApi = useApi(async () => {
    const inv = await interventionsService.get(interventionId)
    const [classStudents, assessments, outcomes] = await Promise.all([
      studentsService.listForClass(inv.class_id).catch(() => []),
      analyticsService.listClassAssessments(inv.class_id).catch(() => []),
      inv.status === 'completed'
        ? interventionsService.outcomes(interventionId).catch(() => null)
        : Promise.resolve(null),
    ])
    return { inv, classStudents, assessments, outcomes }
  }, [interventionId])

  const inv = detailApi.data?.inv || null
  const classStudents = useMemo(() => detailApi.data?.classStudents || [], [detailApi.data])
  const assessments = useMemo(() => detailApi.data?.assessments || [], [detailApi.data])
  const outcomes = detailApi.data?.outcomes || null

  const [assignMode, setAssignMode] = useState('class')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [editPlan, setEditPlan] = useState('')
  const [selectedReassessmentId, setSelectedReassessmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)

  useEffect(() => {
    if (inv) {
      setEditPlan(inv.recommended_action || '')
      setSelectedReassessmentId(inv.reassessment_id ? String(inv.reassessment_id) : '')
    }
  }, [inv])

  const assignedRoster = useMemo(() => inv?.assigned_students || [], [inv])
  const selectableStudents = useMemo(() => {
    if (assignedRoster.length > 0) {
      return assignedRoster.map((s) => ({
        id: s.student_id,
        name: s.student_name,
        mastery: s.before_mastery,
        afterMastery: s.after_mastery,
        outcome: s.outcome,
      }))
    }
    return classStudents.map((s) => ({
      id: s.student_id,
      name: s.student_name,
      mastery: s.average_mastery,
      supportCategory: s.support_category,
    }))
  }, [assignedRoster, classStudents])

  function toggleStudent(id) {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function selectAll() {
    setSelectedStudents(selectableStudents.map((s) => s.id))
  }

  function clearAll() {
    setSelectedStudents([])
  }

  async function handleSavePlan() {
    if (!inv) return
    setSaving(true)
    setSaveError(null)
    setSavedMessage(null)
    try {
      await interventionsService.update(interventionId, {
        recommended_action: editPlan.trim(),
        reassessment_id: selectedReassessmentId ? Number(selectedReassessmentId) : null,
      })
      setSavedMessage('Intervention plan and reassessment link updated.')
      detailApi.refetch()
    } catch (err) {
      setSaveError(err.message || 'Could not update intervention.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign() {
    setSaving(true)
    setSaveError(null)
    setSavedMessage(null)
    try {
      if (inv && (editPlan.trim() !== (inv.recommended_action || '') || selectedReassessmentId)) {
        await interventionsService.update(interventionId, {
          recommended_action: editPlan.trim(),
          ...(selectedReassessmentId ? { reassessment_id: Number(selectedReassessmentId) } : {}),
        })
      }
      await interventionsService.assign(interventionId, {
        student_ids: assignMode === 'selected' ? selectedStudents : undefined,
      })
      setSavedMessage('Intervention assigned to target students with baseline mastery captured.')
      detailApi.refetch()
    } catch (err) {
      setSaveError(err.message || 'Could not assign intervention.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    setCompleting(true)
    setSaveError(null)
    setSavedMessage(null)
    try {
      await interventionsService.complete(interventionId, {
        reassessment_id: selectedReassessmentId ? Number(selectedReassessmentId) : undefined,
      })
      setSavedMessage('Intervention completed and pre/post learning gains evaluated.')
      detailApi.refetch()
    } catch (err) {
      setSaveError(err.message || 'Could not complete intervention.')
    } finally {
      setCompleting(false)
    }
  }

  const isCompleted = inv?.status === 'completed'
  const isAssigned = ['assigned', 'in_progress', 'reassessment_pending'].includes(inv?.status)

  return (
    <>
      <Topbar
        title={inv ? `Intervention · ${inv.topic_title || inv.title}` : 'Intervention Detail'}
        breadcrumb="Interventions / Details"
        subtitle={inv ? inv.title : 'Loading intervention telemetry...'}
        actions={
          <Link
            to="/teacher/interventions"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
          >
            ← Back to Queue
          </Link>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {detailApi.status === 'loading' && (
          <LoadingState label="Loading intervention details..." rows={5} />
        )}
        {detailApi.status === 'error' && (
          <ErrorState message={detailApi.error.message} onRetry={detailApi.refetch} />
        )}

        {savedMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{savedMessage}</span>
            </div>
            <button onClick={() => setSavedMessage(null)} className="text-emerald-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {detailApi.status === 'success' && inv && (
          <>
            {/* 1. Header Overview Card */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-5 sm:p-6 shadow-[3px_3px_0px_#0f172a]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {inv.topic_title || 'Topic Intervention'}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-950 mt-1">
                    {inv.title}
                  </h2>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
                  Status: {inv.status}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 mb-4 leading-relaxed">{inv.reason}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs my-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">
                    Assigned Students
                  </span>
                  <span className="font-display font-extrabold text-base text-slate-900">
                    {assignedRoster.length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">
                    Topic Average (Evidence)
                  </span>
                  <span className="font-display font-extrabold text-base text-slate-900">
                    {inv.evidence?.average_mastery !== undefined
                      ? `${Math.round(inv.evidence.average_mastery)}%`
                      : '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">
                    Reassessment Linked
                  </span>
                  <span className="font-display font-bold text-sm text-slate-900">
                    {assessments.find((a) => String(a.id) === String(inv.reassessment_id))?.title ||
                      (inv.reassessment_id ? `Assessment #${inv.reassessment_id}` : 'Not linked yet')}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-2">
                <label className="block font-bold">Teacher-Editable Intervention Action Plan:</label>
                <textarea
                  rows={2}
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-amber-200 bg-white text-slate-800 text-xs focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving || !editPlan.trim()}
                    onClick={handleSavePlan}
                    className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    Save Plan Edits
                  </button>
                </div>
              </div>
            </div>

            {/* Outcomes summary when completed */}
            {isCompleted && outcomes && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-emerald-950">
                      Measured Learning Gain Outcome Summary
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Comparison between baseline mastery at assignment and post-reassessment mastery.
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Average Mastery Gain
                    </span>
                    <span className="font-display font-black text-xl text-emerald-900">
                      {outcomes.average_mastery_gain >= 0
                        ? `+${outcomes.average_mastery_gain}%`
                        : `${outcomes.average_mastery_gain}%`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Roster & Assignment / Completion Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                      {assignedRoster.length > 0
                        ? `Assigned Student Outcomes (${assignedRoster.length})`
                        : `Class Students (${selectableStudents.length})`}
                    </h3>

                    {assignMode === 'selected' && !isCompleted && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAll}
                          className="text-blue-600 hover:underline font-semibold cursor-pointer"
                        >
                          Select all
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={clearAll}
                          className="text-slate-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {selectableStudents.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {selectableStudents.map((s) => (
                        <div key={s.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            {assignMode === 'selected' && assignedRoster.length === 0 ? (
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(s.id)}
                                onChange={() => toggleStudent(s.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                            )}
                            <Link
                              to={`/teacher/students/${s.id}?classId=${inv.class_id}`}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline"
                            >
                              {s.name}
                            </Link>
                          </label>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px] tabular-nums">
                              {s.mastery != null ? `${Math.round(s.mastery)}% before` : '—'}
                            </span>
                            {s.afterMastery != null && (
                              <span className="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] tabular-nums">
                                {Math.round(s.afterMastery)}% after
                              </span>
                            )}
                            {s.outcome && (
                              <span className="text-[10px] font-bold text-slate-600">{s.outcome}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No students enrolled"
                      description="Enroll students in this class before assigning interventions."
                    />
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                    Closed-Loop Execution Controls
                  </h3>

                  <div className="space-y-3 text-xs">
                    {assignedRoster.length === 0 && !isCompleted && (
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Assignment Scope</label>
                        <select
                          value={assignMode}
                          onChange={(e) => setAssignMode(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
                        >
                          <option value="class">Whole Class (All enrolled learners)</option>
                          <option value="selected">Selected Students Only</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Link Reassessment Quiz (Optional)
                      </label>
                      <select
                        value={selectedReassessmentId}
                        onChange={(e) => setSelectedReassessmentId(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
                      >
                        <option value="">Auto / Topic Mastery Evaluation Only</option>
                        {assessments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title} ({a.assessment_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    {saveError && <p className="text-xs text-rose-600 font-semibold">{saveError}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={
                        saving ||
                        (assignMode === 'selected' &&
                          assignedRoster.length === 0 &&
                          selectedStudents.length === 0)
                      }
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving
                        ? 'Saving…'
                        : isAssigned
                        ? 'Re-sync Assignment & Link Reassessment'
                        : 'Confirm & Assign Intervention →'}
                    </button>
                  )}

                  {isAssigned && (
                    <button
                      type="button"
                      disabled={completing}
                      onClick={handleComplete}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {completing ? 'Evaluating Outcomes…' : 'Complete & Calculate Learning Gain ✓'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
