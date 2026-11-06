import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { GrowthLineChart } from '../../components/charts/GrowthLineChart'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
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

  const student = studentApi.data || {
    id: studentId,
    name: 'Aanya Sharma',
    email: 'aanya.sharma@learnloop.org',
    grade: 'Class 9',
    section: 'A',
    supportCategory: 'Developing',
    topicMastery: [
      { topicId: 't1', topicName: 'Number Systems', mastery: 72, band: 'Proficient' },
      { topicId: 't2', topicName: 'Polynomials', mastery: 64, band: 'Proficient' },
      { topicId: 't3', topicName: 'Linear Equations', mastery: 48, band: 'Developing' },
      { topicId: 't4', topicName: 'Fractions', mastery: 38, band: 'Needs Support' },
      { topicId: 't5', topicName: 'Coordinate Geometry', mastery: 52, band: 'Developing' },
    ],
  }

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteError, setNoteError] = useState(null)
  const [notesList, setNotesList] = useState([
    { id: 1, text: 'Discussed sign inversion on transposing terms during whiteboard tutorial.', date: 'Yesterday' },
  ])

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTopic, setAssignTopic] = useState('Fractions')
  const [assignSet, setAssignSet] = useState('Set F-02 (Adaptive Remedial)')
  const [assignError, setAssignError] = useState(null)
  const [actionNotice, setActionNotice] = useState(null)

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) {
      setNoteError('Write a note before saving.')
      return
    }
    setNotesList((prev) => [{ id: Date.now(), text: noteText, date: 'Just now' }, ...prev])
    setNoteOpen(false)
    setNoteText('')
    setNoteError(null)
    setActionNotice('Pedagogical teacher note saved.')
    setTimeout(() => setActionNotice(null), 4000)
  }

  async function submitAssign(e) {
    e.preventDefault()
    setAssignOpen(false)
    setActionNotice(`Targeted practice (${assignSet}) assigned to ${student.name}.`)
    setTimeout(() => setActionNotice(null), 4000)
  }

  return (
    <>
      <Topbar
        title={`${student.name} · Diagnostic Profile`}
        breadcrumb="Student Roster / Profile"
        subtitle={`Class 9-A · Overall Diagnostic Status: ${student.supportCategory}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              + Add Private Note
            </button>
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>🎯</span>
              <span>Assign Practice</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Notice alert */}
        {actionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </div>
        )}

        {/* 1. Student Identity Hero */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
              {student.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {student.name}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  STU-4819
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{student.email}</p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-slate-500 font-medium">{student.grade} · Section {student.section}</span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px]">
                  Support Status: {student.supportCategory}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Assessments</span>
              <span className="font-display font-extrabold text-xl text-slate-900">7</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center min-w-[100px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Avg Mastery</span>
              <span className="font-display font-extrabold text-xl text-blue-800">54%</span>
            </div>
          </div>
        </div>

        {/* 2. Grid: Topic Mastery Bars + Growth Curve */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Topic Mastery Bars (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                Curriculum Topic Mastery
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Explainable score decomposition based on recent accuracy, difficulty, and recency.
              </p>

              <div className="my-5 space-y-3.5">
                {student.topicMastery?.map((t) => (
                  <div key={t.topicId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{t.topicName}</span>
                      <span className="font-bold text-slate-900">{t.mastery}% ({t.band})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          t.mastery >= 60 ? 'bg-blue-600' : t.mastery >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${t.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Lowest mastery: Fractions (38%)</span>
              <span className="font-bold text-rose-700">Needs teacher support</span>
            </div>
          </div>

          {/* Growth Curve Chart (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                Mastery Trajectory &amp; Growth
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Assessment-by-assessment progression over time.
              </p>
              <div className="my-5 min-h-[180px]">
                {growthApi.data?.length ? (
                  <GrowthLineChart data={growthApi.data} />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Growth data plotted across 7 completed quiz attempts.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Trend: +14% gain over last 3 attempts</span>
              <span className="font-semibold text-emerald-600 font-bold">Positive Improvement</span>
            </div>
          </div>
        </div>

        {/* 3. Misconceptions Log + Teacher Observation Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Misconceptions (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
            <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
              Suspected Misconceptions &amp; Error Evidence
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Repeated tagged error patterns detected in student attempts.
            </p>

            <div className="space-y-3">
              {[
                { pattern: 'Denominator Addition in Fractions', evidence: '3 times in Quiz #2', status: 'Suspected', tag: 'Fractions' },
                { pattern: 'Sign Inversion on Transposition', evidence: '2 times in Quiz #4', status: 'Under Review', tag: 'Linear Equations' },
              ].map((err, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                        {err.tag}
                      </span>
                      <span className="font-bold text-slate-900">{err.pattern}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Observed {err.evidence}</p>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 shrink-0">
                    {err.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Private Notes (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                  Teacher Notes
                </h3>
                <button
                  onClick={() => setNoteOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  + Add
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Confidential pedagogical observations.
              </p>

              <div className="space-y-2.5">
                {notesList.map((note) => (
                  <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <p className="text-slate-800 leading-snug">{note.text}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">{note.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
              Only visible to assigned teachers and coordinators.
            </div>
          </div>
        </div>

        {/* Modal: Add Note */}
        <Modal
          open={noteOpen}
          onClose={() => setNoteOpen(false)}
          title={`Teacher Observation Note · ${student.name}`}
          subtitle="Record diagnostic insights and personalized guidance"
        >
          <form onSubmit={submitNote} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Pedagogical Observation</label>
              <textarea
                rows={4}
                required
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Student showed strong intuitive grasping of fractions when visual bar models were used..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none"
              />
              {noteError && <p className="text-xs text-rose-600 mt-1">{noteError}</p>}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                Save Note
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Assign Practice */}
        <Modal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          title={`Assign Practice · ${student.name}`}
          subtitle="Direct targeted remedial drills to reinforce student concepts"
        >
          <form onSubmit={submitAssign} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Topic</label>
              <select
                value={assignTopic}
                onChange={(e) => setAssignTopic(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
              >
                <option value="Fractions">Fractions (Unit I)</option>
                <option value="Linear Equations">Linear Equations (Unit II)</option>
                <option value="Polynomials">Polynomials (Unit II)</option>
                <option value="Coordinate Geometry">Coordinate Geometry (Unit III)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Practice Set</label>
              <select
                value={assignSet}
                onChange={(e) => setAssignSet(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:bg-white focus:outline-none"
              >
                <option value="Set F-01 (Foundation)">Set F-01 (Foundation Concepts · 10 Questions)</option>
                <option value="Set F-02 (Adaptive Remedial)">Set F-02 (Adaptive Remedial · 12 Questions)</option>
                <option value="Set F-03 (Exam Challenge)">Set F-03 (Exam Challenge Proofs · 8 Questions)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
              >
                Assign Practice Drill
              </button>
            </div>
          </form>
        </Modal>
      </main>
    </>
  )
}
