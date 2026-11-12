import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'

const MOCK_ACTIVITY_DATA = [
  {
    id: 's_01',
    name: 'Aanya Sharma',
    rollNo: '2026-09A-01',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'attended',
    lastActiveTime: '12 mins ago (3:45 PM)',
    activeMinutes: 38,
    lecturesAttended: [
      { type: 'video', title: 'Ch. 4: Linear Equations in Two Variables (Lecture 4.2)' },
      { type: 'drill', title: 'Targeted Drill: Sign laws in two-step isolation' },
    ],
    currentStage: 'Currently on: Practice Problem 7 of 10 (Linear Eq.)',
    quizScore: '80% (4/5)',
    accuracyStatus: 'proficient',
  },
  {
    id: 's_02',
    name: 'Rohan Verma',
    rollNo: '2026-09A-02',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'attended',
    lastActiveTime: '35 mins ago (3:20 PM)',
    activeMinutes: 24,
    lecturesAttended: [
      { type: 'remedial', title: 'Fraction Strips Visual Demonstration (Remedial #F-01)' },
    ],
    currentStage: 'Completed: Fraction Addition Re-drill #1',
    quizScore: '60% (3/5)',
    accuracyStatus: 'developing',
  },
  {
    id: 's_03',
    name: 'Meera Iyer',
    rollNo: '2026-09A-03',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'attended',
    lastActiveTime: 'Just now (4:01 PM)',
    activeMinutes: 45,
    lecturesAttended: [
      { type: 'video', title: 'Ch. 2: Polynomials - Zeros of a Polynomial (Lecture 2.3)' },
      { type: 'quiz', title: 'Polynomial Factorization Diagnostic Check' },
    ],
    currentStage: 'Currently on: Diagnostic Review & Hint Verification',
    quizScore: '100% (5/5)',
    accuracyStatus: 'secure',
  },
  {
    id: 's_04',
    name: 'Kabir Singh',
    rollNo: '2026-09A-04',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'not_visited',
    lastActiveTime: 'Yesterday, 5:15 PM',
    activeMinutes: 0,
    lecturesAttended: [],
    currentStage: 'No sessions or lectures opened today',
    quizScore: '—',
    accuracyStatus: 'none',
  },
  {
    id: 's_05',
    name: 'Ishita Rao',
    rollNo: '2026-09A-05',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'attended',
    lastActiveTime: '1 hr ago (2:55 PM)',
    activeMinutes: 52,
    lecturesAttended: [
      { type: 'video', title: 'Ch. 1: Real Numbers & Laws of Exponents (Lecture 1.6)' },
      { type: 'drill', title: 'Advanced Exponents Practice Set #EX-03' },
    ],
    currentStage: 'Completed: Advanced Practice Set with 94% accuracy',
    quizScore: '94% (9/10)',
    accuracyStatus: 'secure',
  },
  {
    id: 's_06',
    name: 'Aditya Kapoor',
    rollNo: '2026-09B-01',
    classId: 'cls_9b',
    className: 'Class 9-B',
    status: 'attended',
    lastActiveTime: '22 mins ago (3:38 PM)',
    activeMinutes: 28,
    lecturesAttended: [
      { type: 'video', title: 'Ch. 4: Standard Form ax + by + c = 0 (Lecture 4.1)' },
    ],
    currentStage: 'Currently on: Practice Worksheet 4.1 Q4',
    quizScore: '75% (3/4)',
    accuracyStatus: 'proficient',
  },
  {
    id: 's_07',
    name: 'Diya Patel',
    rollNo: '2026-09B-02',
    classId: 'cls_9b',
    className: 'Class 9-B',
    status: 'not_visited',
    lastActiveTime: '2 days ago',
    activeMinutes: 0,
    lecturesAttended: [],
    currentStage: 'No sessions or lectures opened today',
    quizScore: '—',
    accuracyStatus: 'none',
  },
  {
    id: 's_08',
    name: 'Vivaan Nair',
    rollNo: '2026-09B-03',
    classId: 'cls_9b',
    className: 'Class 9-B',
    status: 'attended',
    lastActiveTime: '8 mins ago (3:52 PM)',
    activeMinutes: 19,
    lecturesAttended: [
      { type: 'remedial', title: 'Common Mistakes in Linear Variable Transposition' },
    ],
    currentStage: 'Paused on: Video Step 2 (Transposition balancing)',
    quizScore: '50% (2/4)',
    accuracyStatus: 'developing',
  },
  {
    id: 's_09',
    name: 'Ananya Gupta',
    rollNo: '2026-09A-06',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'attended',
    lastActiveTime: '15 mins ago (3:45 PM)',
    activeMinutes: 40,
    lecturesAttended: [
      { type: 'video', title: 'Ch. 3: Coordinate Geometry - Cartesian System (Lecture 3.2)' },
      { type: 'drill', title: 'Point plotting interactive workshop' },
    ],
    currentStage: 'Completed: Cartesian coordinates challenge drill',
    quizScore: '90% (9/10)',
    accuracyStatus: 'secure',
  },
  {
    id: 's_10',
    name: 'Arjun Mehta',
    rollNo: '2026-09A-07',
    classId: 'cls_9a',
    className: 'Class 9-A',
    status: 'not_visited',
    lastActiveTime: 'Yesterday, 3:30 PM',
    activeMinutes: 0,
    lecturesAttended: [],
    currentStage: 'No sessions or lectures opened today',
    quizScore: '—',
    accuracyStatus: 'none',
  },
]

export default function RealTimeActivityPage() {
  const [selectedDay, setSelectedDay] = useState('today')
  const [selectedClass, setSelectedClass] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return MOCK_ACTIVITY_DATA.filter((s) => {
      const matchClass = selectedClass === 'all' || s.classId === selectedClass
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase().trim())
      return matchClass && matchStatus && matchSearch
    })
  }, [selectedClass, statusFilter, searchQuery])

  // Summary Metrics
  const stats = useMemo(() => {
    const total = MOCK_ACTIVITY_DATA.length
    const attended = MOCK_ACTIVITY_DATA.filter((s) => s.status === 'attended').length
    const notVisited = MOCK_ACTIVITY_DATA.filter((s) => s.status === 'not_visited').length
    const totalMinutes = MOCK_ACTIVITY_DATA.reduce((acc, s) => acc + s.activeMinutes, 0)
    const avgMinutes = attended > 0 ? Math.round(totalMinutes / attended) : 0
    const attendanceRate = Math.round((attended / total) * 100)
    return { total, attended, notVisited, totalMinutes, avgMinutes, attendanceRate }
  }, [])

  function handleSendNudge(studentName) {
    setToastMessage(`A gentle learning reminder has been sent to ${studentName}.`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  return (
    <>
      <Topbar
        title="Real-Time Student Learning Activity"
        breadcrumb="Teacher / Monitoring"
        subtitle="Live day-wise session participation, video lecture tracking, and practice engagement"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/classes"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              View Classes →
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. TOP SELECTION & DAY FILTER BAR                              */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Day Selector Pills */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Activity Date
              </label>
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                {[
                  { id: 'today', label: 'Today (Live)' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '2days', label: '10 Nov' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedDay(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedDay === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter by Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
              >
                <option value="all">All Assigned Classes</option>
                <option value="cls_9a">Class 9-A (Homeroom)</option>
                <option value="cls_9b">Class 9-B (Mathematics)</option>
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search student or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden shadow-2xs"
            />
            <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. STATS KPI CARDS                                             */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-500 font-normal">Students in scope</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Attended Today</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-emerald-900">{stats.attended}</span>
              <span className="text-xs text-emerald-700 font-bold">{stats.attendanceRate}% active</span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Not Visited Today</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-rose-900">{stats.notVisited}</span>
              <span className="text-xs text-rose-700 font-normal">No activity recorded</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Practice Logged</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-blue-900">{stats.totalMinutes}m</span>
              <span className="text-xs text-blue-700 font-normal">avg {stats.avgMinutes}m / active</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. STATUS FILTER PILLS & STUDENT ACTIVITY LIST                 */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Day-Wise Learning Progression Stream
              </h2>
              <p className="text-xs text-slate-500">
                Detailed record of lectures attended, practice drills executed, and current status.
              </p>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {[
                { id: 'all', label: `All (${stats.total})` },
                { id: 'attended', label: `Attended (${stats.attended})` },
                { id: 'not_visited', label: `Not Visited (${stats.notVisited})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    statusFilter === pill.id
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Student Activity Table */}
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No students match the current filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const isAttended = s.status === 'attended'
                return (
                  <div key={s.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Identity and Status */}
                      <div className="flex items-start gap-3.5 min-w-[260px]">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isAttended
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {s.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-bold text-slate-900">
                              {s.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {s.className}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            {s.rollNo} · Last seen: {s.lastActiveTime}
                          </div>

                          <div className="mt-1.5">
                            {isAttended ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Attended Today ({s.activeMinutes}m active)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                <span>⚪</span>
                                <span>Not Visited Today</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Lectures & Practice Progress */}
                      <div className="flex-1 space-y-1.5 max-w-xl">
                        <div className="text-xs font-bold text-slate-700">
                          {isAttended ? (
                            <div className="space-y-1">
                              {s.lecturesAttended.map((lec, lIdx) => (
                                <div key={lIdx} className="flex items-center gap-1.5 text-xs text-slate-800">
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                                    {lec.type}
                                  </span>
                                  <span className="truncate">{lec.title}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-xs">
                              No modules, lectures, or practice drills opened today.
                            </p>
                          )}
                        </div>

                        {/* Current Stage */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                          <span className="font-semibold text-slate-600">Status:</span>
                          <span className="font-medium text-slate-700">{s.currentStage}</span>
                        </div>
                      </div>

                      {/* Right: Score & Actions */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {isAttended ? (
                          <div className="text-left lg:text-right">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Diagnostic Result
                            </div>
                            <div className="font-display font-black text-sm text-slate-900">
                              {s.quizScore}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendNudge(s.name)}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <span>🔔</span>
                            <span>Send Study Reminder</span>
                          </button>
                        )}

                        <Link
                          to={`/teacher/students/${s.id}`}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                        >
                          <span>Profile</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
