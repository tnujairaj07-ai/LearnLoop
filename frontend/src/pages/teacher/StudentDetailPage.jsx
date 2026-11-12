import { useState, useMemo } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { GrowthLineChart } from '../../components/charts/GrowthLineChart'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'
import { studentsService } from '../../services/studentsService'

const STUDENT_PROFILES_LOOKUP = {
  s_01: { name: 'Aanya Sharma', rollNo: '2026-09A-01', className: 'Class 9-A', math: 58, sci: 72, soc: 78, eng: 84, supportCategory: 'Developing', currentMathDrill: 'Practice Problem 7 of 10 in Linear Equations', currentLecture: 'Ch. 4 Linear Equations - Lecture 4.3', lastActive: 'Today, 3:45 PM' },
  s_02: { name: 'Rohan Verma', rollNo: '2026-09A-02', className: 'Class 9-A', math: 38, sci: 52, soc: 60, eng: 68, supportCategory: 'Needs Support', currentMathDrill: 'Fraction Strips Re-drill #1', currentLecture: 'Remedial Video F-01: Common Denominators', lastActive: 'Today, 3:20 PM' },
  s_03: { name: 'Meera Iyer', rollNo: '2026-09A-03', className: 'Class 9-A', math: 58, sci: 68, soc: 74, eng: 80, supportCategory: 'Developing', currentMathDrill: 'Diagnostic Review & Hint Verification', currentLecture: 'Ch. 2 Polynomials - Lecture 2.4', lastActive: 'Just now (4:01 PM)' },
  s_04: { name: 'Kabir Singh', rollNo: '2026-09A-04', className: 'Class 9-A', math: 42, sci: 48, soc: 58, eng: 62, supportCategory: 'Developing', currentMathDrill: 'No sessions opened today', currentLecture: 'Ch. 4 Linear Equations - Lecture 4.1 (Paused)', lastActive: 'Yesterday, 5:15 PM' },
  s_05: { name: 'Ishita Rao', rollNo: '2026-09A-05', className: 'Class 9-A', math: 88, sci: 92, soc: 86, eng: 94, supportCategory: 'Secure', currentMathDrill: 'Advanced Practice Set with 94% accuracy', currentLecture: 'Ch. 1 Real Numbers - Lecture 1.6 (Completed)', lastActive: '1 hr ago' },
  s_06: { name: 'Aditya Kapoor', rollNo: '2026-09B-01', className: 'Class 9-B', math: 64, sci: 66, soc: 70, eng: 74, supportCategory: 'Proficient', currentMathDrill: 'Worksheet 4.1 Q4 (Standard form)', currentLecture: 'Ch. 4 Linear Equations - Lecture 4.1', lastActive: '22 mins ago' },
  s_07: { name: 'Diya Patel', rollNo: '2026-09B-02', className: 'Class 9-B', math: 44, sci: 56, soc: 68, eng: 70, supportCategory: 'Developing', currentMathDrill: 'No sessions opened today', currentLecture: 'Ch. 4 Linear Equations - Lecture 4.1 (Paused)', lastActive: '2 days ago' },
  s_08: { name: 'Vivaan Nair', rollNo: '2026-09B-03', className: 'Class 9-B', math: 36, sci: 50, soc: 58, eng: 64, supportCategory: 'Needs Support', currentMathDrill: 'Video Step 2: Transposition balance', currentLecture: 'Remedial Video: Transposition Sign Balancing', lastActive: '8 mins ago' },
}

const CALENDAR_DAYS = [
  { day: 1, status: 'high', mins: 35 },
  { day: 2, status: 'high', mins: 40 },
  { day: 3, status: 'med', mins: 14 },
  { day: 4, status: 'none', mins: 0 },
  { day: 5, status: 'high', mins: 45 },
  { day: 6, status: 'high', mins: 30 },
  { day: 7, status: 'med', mins: 12 },
  { day: 8, status: 'high', mins: 50 },
  { day: 9, status: 'high', mins: 32 },
  { day: 10, status: 'high', mins: 45 },
  { day: 11, status: 'med', mins: 15 },
  { day: 12, status: 'high', mins: 38 }, // Today
  { day: 13, status: 'future', mins: 0 },
  { day: 14, status: 'future', mins: 0 },
  { day: 15, status: 'future', mins: 0 },
  { day: 16, status: 'future', mins: 0 },
  { day: 17, status: 'future', mins: 0 },
  { day: 18, status: 'future', mins: 0 },
  { day: 19, status: 'future', mins: 0 },
  { day: 20, status: 'future', mins: 0 },
  { day: 21, status: 'future', mins: 0 },
  { day: 22, status: 'future', mins: 0 },
  { day: 23, status: 'future', mins: 0 },
  { day: 24, status: 'future', mins: 0 },
  { day: 25, status: 'future', mins: 0 },
  { day: 26, status: 'future', mins: 0 },
  { day: 27, status: 'future', mins: 0 },
  { day: 28, status: 'future', mins: 0 },
  { day: 29, status: 'future', mins: 0 },
  { day: 30, status: 'future', mins: 0 },
]

const RECENT_STUDENT_ACTIVITIES = [
  { date: 'Today, 3:45 PM', duration: '38 mins', title: 'Attended Ch. 4 Linear Equations Lecture 4.2', star: true },
  { date: 'Yesterday, 4:10 PM', duration: '25 mins', title: 'Completed Fraction Strips Practice Drill #01', star: false },
  { date: '10 Nov, 5:30 PM', duration: '45 mins', title: 'Scored 80% on Diagnostic Check #2', star: true },
  { date: '08 Nov, 2:15 PM', duration: '32 mins', title: 'Watched Worked Examples: Sign Laws', star: false },
]

const LESSON_PROGRESSION_MATH = [
  { chapter: 'Ch. 1: Number Systems', status: 'Completed', lecturesAttended: 'Lectures 1.1 to 1.6 (All attended)', mastery: 82, badge: 'Secure' },
  { chapter: 'Ch. 2: Polynomials', status: 'Completed', lecturesAttended: 'Lectures 2.1 to 2.6 (All attended)', mastery: 68, badge: 'Proficient' },
  { chapter: 'Ch. 4: Linear Equations in Two Variables', status: 'Currently On', lecturesAttended: 'Currently on Lecture 4.3 (Graphing Equations)', mastery: 54, badge: 'Developing', isCurrent: true },
  { chapter: 'Fractions & Rational Basics (Remedial Focus)', status: 'In Remediation', lecturesAttended: 'Fraction strips drill #1 completed · Re-test scheduled', mastery: 48, badge: 'Needs Practice' },
  { chapter: 'Ch. 14: Statistics', status: 'Upcoming', lecturesAttended: 'Scheduled for Term 2', mastery: 0, badge: 'Not Started' },
]

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  
  // Context determination
  const contextParam = searchParams.get('view')
  const subjectParam = searchParams.get('subject')
  const classIdParam = searchParams.get('classId')

  const defaultProfileMode = contextParam === 'homeroom' ? 'homeroom' : (subjectParam === 'math' ? 'subject' : 'subject')
  const [profileMode, setProfileMode] = useState(defaultProfileMode) // 'homeroom' or 'subject'
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'trajectory', 'lessons', 'interventions'

  const studentData = STUDENT_PROFILES_LOOKUP[studentId] || {
    name: 'Aanya Sharma',
    rollNo: '2026-09A-01',
    className: 'Class 9-A',
    math: 58,
    sci: 72,
    soc: 78,
    eng: 84,
    supportCategory: 'Developing',
    currentMathDrill: 'Practice Problem 7 of 10 in Linear Equations',
    currentLecture: 'Ch. 4 Linear Equations - Lecture 4.3',
    lastActive: 'Today, 3:45 PM',
  }

  const isHomeroomStudent = studentData.className === 'Class 9-A'

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [notesList, setNotesList] = useState([
    { id: 1, text: 'Discussed sign inversion on transposing terms during whiteboard tutorial.', date: 'Yesterday' },
  ])

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTopic, setAssignTopic] = useState('Linear Equations')
  const [assignSet, setAssignSet] = useState('Practice Set LE-02 (Two-Step Isolation)')
  const [actionNotice, setActionNotice] = useState(null)

  function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNotesList((prev) => [{ id: Date.now(), text: noteText, date: 'Just now' }, ...prev])
    setNoteOpen(false)
    setNoteText('')
    setActionNotice('Pedagogical teacher note saved.')
    setTimeout(() => setActionNotice(null), 4000)
  }

  function submitAssign(e) {
    e.preventDefault()
    setAssignOpen(false)
    setActionNotice(`Targeted drill (${assignSet}) assigned to ${studentData.name}.`)
    setTimeout(() => setActionNotice(null), 4000)
  }

  const overallGpa = Math.round((studentData.math + studentData.sci + studentData.soc + studentData.eng) / 4)

  return (
    <>
      <Topbar
        title={`${studentData.name} · Academic Profile Review`}
        breadcrumb="Teacher / Student Profile"
        subtitle={`${studentData.className} · Roll No: ${studentData.rollNo} · Academic Year 2026–27`}
        actions={
          <div className="flex items-center gap-2">
            {isHomeroomStudent ? (
              <Link
                to="/teacher/my-class"
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                ← Back to Class 9-A Roster
              </Link>
            ) : (
              <Link
                to={`/teacher/classes/${classIdParam || 'cls_9b'}`}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                ← Back to {studentData.className} Math Roster
              </Link>
            )}
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Assign Practice Drill</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Action Notice */}
        {actionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. STUDENT IDENTITY BANNER & PERSPECTIVE TOGGLE                */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-sm shadow-blue-500/25 shrink-0">
              {studentData.name.split(' ').map((p) => p[0]).join('')}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-black text-slate-900 tracking-tight">
                  {studentData.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  {studentData.supportCategory}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {studentData.className}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Roll No: <strong className="text-slate-800 font-mono">{studentData.rollNo}</strong> · Last active: <strong className="text-emerald-700">{studentData.lastActive}</strong>
              </p>
            </div>
          </div>

          {/* Perspective Switcher: All-Subjects vs Math-Specialization */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setProfileMode('subject')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                profileMode === 'subject'
                  ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📐</span>
              <span>Mathematics Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setProfileMode('homeroom')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                profileMode === 'homeroom'
                  ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👑</span>
              <span>All Subjects (Homeroom)</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. PERSPECTIVE A: ALL SUBJECTS VIEW (HOMEROOM CLASS TEACHER)   */}
        {/* ============================================================== */}
        {profileMode === 'homeroom' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 font-medium">
              👑 <strong>Homeroom Perspective Active:</strong> Showing {studentData.name}&rsquo;s overall progress across all enrolled CBSE Class 9 subjects.
            </div>

            {/* Cross-Subject Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📐 Mathematics</div>
                <div className="font-display text-2xl font-black text-blue-700">{studentData.math}%</div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${studentData.math}%` }} />
                </div>
                <div className="text-[11px] text-slate-400">Teacher: Alex Rivera · Developing</div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🔬 Science</div>
                <div className="font-display text-2xl font-black text-emerald-700">{studentData.sci}%</div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${studentData.sci}%` }} />
                </div>
                <div className="text-[11px] text-slate-400">Teacher: Marcus Chen · Proficient</div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">🌍 Social Studies</div>
                <div className="font-display text-2xl font-black text-emerald-700">{studentData.soc}%</div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${studentData.soc}%` }} />
                </div>
                <div className="text-[11px] text-slate-400">Teacher: Sofia Torres · Proficient</div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">📖 English</div>
                <div className="font-display text-2xl font-black text-emerald-700">{studentData.eng}%</div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${studentData.eng}%` }} />
                </div>
                <div className="text-[11px] text-slate-400">Teacher: Priya Nair · Secure</div>
              </div>
            </div>

            {/* Overall Summary KPI Banner */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Course GPA</span>
                <div className="font-display text-2xl font-black text-slate-900 mt-0.5">{overallGpa}% Average Mastery</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Across All Subjects</span>
                <div className="font-display text-2xl font-black text-emerald-700 mt-0.5">95% Present</div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Learning Gain</span>
                <div className="font-display text-2xl font-black text-blue-700 mt-0.5">+62% (Hake g)</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. PERSPECTIVE B: MATHEMATICS SPECIALIZATION PROFILE           */}
        {/* ============================================================== */}
        {profileMode === 'subject' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 font-medium">
              📐 <strong>Mathematics Subject Perspective Active:</strong> Showing {studentData.name}&rsquo;s detailed progress, lectures attended, current lesson stage, and error patterns in Mathematics under your instruction.
            </div>

            {/* ROW 1: Student Details & Activity Tracker Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Card: Student Subject Details */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-base">📐</span>
                    <h3 className="font-display text-sm font-bold text-slate-900">Mathematics Profile</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Enrolled Subject</span>
                      <div className="font-bold text-slate-800 mt-0.5">NCERT Class 9 Mathematics</div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Current Lecture & Stage</span>
                      <div className="font-bold text-purple-900 mt-0.5">{studentData.currentLecture}</div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Active Drill / Worksheet</span>
                      <div className="font-bold text-slate-800 mt-0.5">{studentData.currentMathDrill}</div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">Last Session Activity</span>
                      <div className="font-bold text-emerald-700 mt-0.5">{studentData.lastActive}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setNoteOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Add Pedagogical Note
                  </button>
                  <span className="text-[10px] text-slate-400">Notes: {notesList.length}</span>
                </div>
              </div>

              {/* Center/Right Card: Activity Tracker Calendar Heatmap */}
              <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">📅</span>
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">Math Practice & Session Tracker</h3>
                      <p className="text-[11px] text-slate-400">Day-by-day learning session engagement</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1 shadow-2xs">
                      <span>🔥</span>
                      <span>4-Week Streak</span>
                    </span>

                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 15m+
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> &lt;15m
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Inactive
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Calendar Heatmap (2 cols) */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs font-bold text-slate-700 mb-2">November 2026</div>

                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, dIdx) => (
                        <div key={dIdx} className="text-[10px] font-bold text-slate-400 py-1">
                          {day}
                        </div>
                      ))}

                      <div className="p-1" />
                      <div className="p-1" />
                      <div className="p-1" />

                      {CALENDAR_DAYS.map((d) => {
                        const isHigh = d.status === 'high'
                        const isMed = d.status === 'med'
                        const isNone = d.status === 'none'

                        return (
                          <div
                            key={d.day}
                            title={`Nov ${d.day}: ${d.mins} minutes active`}
                            className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                              isHigh
                                ? 'bg-emerald-500 text-white shadow-2xs font-extrabold'
                                : isMed
                                ? 'bg-amber-300 text-slate-900 font-bold'
                                : isNone
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-transparent text-slate-300'
                            }`}
                          >
                            {d.day}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Side Recent Activity */}
                  <div className="space-y-3 border-t md:border-t-0 md:border-l md:border-slate-100 md:pl-5">
                    <div className="text-xs font-bold text-slate-700">Recent Math Sessions</div>
                    <div className="space-y-2.5">
                      {RECENT_STUDENT_ACTIVITIES.map((act, aIdx) => (
                        <div key={aIdx} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>{act.date}</span>
                            <span className="font-bold text-slate-700">{act.duration}</span>
                          </div>
                          <div className="font-bold text-slate-800 flex items-center gap-1">
                            {act.star && <span className="text-amber-500">★</span>}
                            <span className="truncate">{act.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Performance vs Class Average in Mathematics */}
            <div className="space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900">
                Mathematics Benchmark vs. Class Average
              </h3>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Math Study Time</div>
                  <div className="font-display text-xl font-black text-slate-900 mt-1">8 hrs 45 mins</div>
                  <div className="text-[11px] text-slate-500 mt-1">Class Avg: 7h 15m (<strong className="text-emerald-700">+20%</strong>)</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Time / Session</div>
                  <div className="font-display text-xl font-black text-slate-900 mt-1">32 mins</div>
                  <div className="text-[11px] text-slate-500 mt-1">Class Avg: 24 mins (<strong className="text-emerald-700">+33%</strong>)</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Accuracy</div>
                  <div className="font-display text-xl font-black text-slate-900 mt-1">76%</div>
                  <div className="text-[11px] text-slate-500 mt-1">Class Avg: 71% (<strong className="text-emerald-700">+5%</strong>)</div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Math Mastery Band</div>
                  <div className="font-display text-xl font-black text-purple-700 mt-1">{studentData.math}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">Hake Gain: <strong className="text-emerald-700">g = 0.62</strong></div>
                </div>
              </div>
            </div>

            {/* ROW 3: Overall Lesson Progress & Lecture Attendance in Mathematics */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>📚</span>
                    <span>Mathematics Lectures & Lesson Progression</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lectures attended, diagnostic checks cleared, and active lesson stage
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">NCERT Class 9 Mathematics</span>
              </div>

              <div className="divide-y divide-slate-100">
                {LESSON_PROGRESSION_MATH.map((lec, idx) => (
                  <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            lec.isCurrent
                              ? 'bg-purple-600 text-white animate-pulse'
                              : lec.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lec.status}
                        </span>
                        <h4 className="font-display text-sm font-bold text-slate-900">{lec.chapter}</h4>
                      </div>
                      <p className="text-xs text-slate-500">{lec.lecturesAttended}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-24 text-right">
                        <div className="text-xs font-bold text-slate-800">{lec.mastery}%</div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              lec.mastery >= 70 ? 'bg-emerald-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${lec.mastery}%` }}
                          />
                        </div>
                      </div>

                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {lec.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROW 4: Error Patterns & Private Teacher Notes */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-display text-base font-bold text-slate-900">
                Diagnostic Error Patterns in Mathematics
              </h3>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs space-y-2">
                <div className="font-bold text-rose-900">
                  Suspected Recurrent Misconception: Sign reversal when transposing terms
                </div>
                <p className="text-rose-800 leading-relaxed">
                  Evidence from 3 consecutive diagnostic questions shows student subtracts terms instead of adding when isolating variables on the right-hand side.
                </p>
              </div>

              {/* Notes list */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Private Teacher Notes</span>
                  <button
                    type="button"
                    onClick={() => setNoteOpen(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Add Note
                  </button>
                </div>

                <div className="space-y-2">
                  {notesList.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 space-y-1">
                      <p>{n.text}</p>
                      <div className="text-[10px] text-slate-400">Added: {n.date} by Alex Rivera</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Private Note */}
      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Add Pedagogical Teacher Note
            </h3>
            <p className="text-xs text-slate-500">
              Confidential internal remark regarding {studentData.name}&rsquo;s progress.
            </p>
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record observations, scaffolding tips, or verbal feedback provided..."
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitNote}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Practice Drill */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              Assign Targeted Practice Drill
            </h3>
            <p className="text-xs text-slate-500">
              Assign a customized practice unit directly to {studentData.name}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Topic</label>
                <select
                  value={assignTopic}
                  onChange={(e) => setAssignTopic(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="Linear Equations">Linear Equations in Two Variables</option>
                  <option value="Fractions">Fractions & Common Denominators</option>
                  <option value="Polynomials">Polynomials & Algebraic Identities</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Practice Drill</label>
                <select
                  value={assignSet}
                  onChange={(e) => setAssignSet(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  <option value="Practice Set LE-02 (Two-Step Isolation)">Practice Set LE-02 (Two-Step Isolation)</option>
                  <option value="Remedial Drill F-01 (Fraction Strips)">Remedial Drill F-01 (Fraction Strips)</option>
                  <option value="Challenge Set P-03 (Polynomial Zeros)">Challenge Set P-03 (Polynomial Zeros)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssign}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs"
              >
                Assign Drill
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
