import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { interventionsService } from '../../services/interventionsService'

export default function InterventionDetailPage() {
  const { interventionId } = useParams()
  const { status, data: rawData, error, refetch } = useApi(
    () => interventionsService.get(interventionId),
    [interventionId]
  )

  const data = rawData || {
    id: interventionId,
    topicName: 'Fractions',
    mainErrorPattern: 'Denominator operations without common multiple',
    status: 'assigned',
    threshold: 60,
    recommendedActivity: 'Conduct a 20-min revision on fraction strips, assign Practice Set F-02, and reassess in 48 hours.',
    recommendedPracticeSet: 'Practice Set F-02 (Adaptive)',
    affectedStudents: [
      { id: 'stu_001', name: 'Aanya Sharma', mastery: 38 },
      { id: 'stu_002', name: 'Rohan Verma', mastery: 32 },
      { id: 'stu_003', name: 'Meera Iyer', mastery: 44 },
      { id: 'stu_004', name: 'Kabir Singh', mastery: 42 },
      { id: 'stu_005', name: 'Ishita Rao', mastery: 36 },
      { id: 'stu_006', name: 'Aditya Kapoor', mastery: 48 },
    ],
    hakeGain: 0.65,
  }

  const [assignMode, setAssignMode] = useState('class')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [reassessDate, setReassessDate] = useState('2026-11-12')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [savedMessage, setSavedMessage] = useState(null)

  function toggleStudent(id) {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  function selectAll() {
    setSelectedStudents(data.affectedStudents?.map((s) => s.id) || [])
  }

  function clearAll() {
    setSelectedStudents([])
  }

  async function handleAssign() {
    setSaving(true)
    setSaveError(null)
    setSavedMessage(null)
    try {
      await interventionsService.assign(interventionId, {
        scope: assignMode,
        studentIds: assignMode === 'selected' ? selectedStudents : undefined,
        reassessmentDate: reassessDate || undefined,
      })
      setSavedMessage('Intervention successfully assigned and scheduled for reassessment.')
      refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar
        title={`Intervention · ${data.topicName}`}
        breadcrumb="Interventions / Details"
        subtitle={`Targeted pedagogical action for ${data.mainErrorPattern}`}
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
        {status === 'loading' && <LoadingState label="Loading intervention details" rows={5} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {savedMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{savedMessage}</span>
            </div>
            <button onClick={() => setSavedMessage(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </div>
        )}

        {/* 1. Header Overview Card */}
        <div className="rounded-2xl border-2 border-slate-900 bg-white p-5 sm:p-6 shadow-[3px_3px_0px_#0f172a]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {data.topicName}
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-950 mt-1">
                {data.mainErrorPattern}
              </h2>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider">
              Status: {data.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs my-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Affected Students</span>
              <span className="font-display font-extrabold text-base text-slate-900">
                {data.affectedStudents?.length || 0} below threshold
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Mastery Threshold</span>
              <span className="font-display font-extrabold text-base text-slate-900">
                &lt; {data.threshold || 60}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <span className="text-slate-400 block text-[10px] font-bold uppercase">Practice Set</span>
              <span className="font-display font-bold text-sm text-slate-900">
                {data.recommendedPracticeSet || 'Practice Set F-02 (Adaptive)'}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed">
            <strong className="block mb-0.5">Recommended Pedagogical Plan:</strong>
            {data.recommendedActivity}
          </div>
        </div>

        {/* 2. Assignment & Reassessment Scheduler */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Affected Students List (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                  Affected Students in Roster ({data.affectedStudents?.length || 0})
                </h3>

                {assignMode === 'selected' && (
                  <div className="flex items-center gap-2 text-xs">
                    <button type="button" onClick={selectAll} className="text-blue-600 hover:underline font-semibold">Select all</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={clearAll} className="text-slate-400 hover:underline">Clear</button>
                  </div>
                )}
              </div>

              {data.affectedStudents?.length ? (
                <div className="divide-y divide-slate-100">
                  {data.affectedStudents.map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-3 cursor-pointer">
                        {assignMode === 'selected' ? (
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => toggleStudent(s.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                        <span className="font-bold text-slate-900">{s.name}</span>
                      </label>
                      <span className="font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                        {s.mastery}% Mastery
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No students listed" description="Affected students will show once available." />
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Students falling below mastery threshold on diagnostic assessment.
            </div>
          </div>

          {/* Right Column: Execution Form (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                Assign Intervention
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Assignment Scope</label>
                  <select
                    value={assignMode}
                    onChange={(e) => setAssignMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
                  >
                    <option value="class">Whole Class (All affected learners)</option>
                    <option value="selected">Selected Students Only</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Reassessment Date</label>
                  <input
                    type="date"
                    value={reassessDate}
                    onChange={(e) => setReassessDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Checkpoint quiz unlocks automatically on this date to measure learning gain.
                  </p>
                </div>

                {saveError && <p className="text-xs text-rose-600 font-semibold">{saveError}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAssign}
                disabled={saving || (assignMode === 'selected' && selectedStudents.length === 0)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Assigning...' : 'Confirm & Assign Intervention →'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
