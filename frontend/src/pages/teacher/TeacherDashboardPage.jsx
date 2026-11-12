import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { interventionsService } from '../../services/interventionsService'

const WEEKLY_CURVE = [
  { day: 'Wed (Nov 06)', thisWeek: 28, lastWeek: 22 },
  { day: 'Thu (Nov 07)', thisWeek: 18, lastWeek: 25 },
  { day: 'Fri (Nov 08)', thisWeek: 34, lastWeek: 24 },
  { day: 'Sat (Nov 09)', thisWeek: 26, lastWeek: 20 },
  { day: 'Sun (Nov 10)', thisWeek: 20, lastWeek: 22 },
  { day: 'Mon (Nov 11)', thisWeek: 38, lastWeek: 26 },
  { day: 'Tue (Nov 12)', thisWeek: 32, lastWeek: 25 },
]

const LIVE_HOURLY_BARS = [12, 18, 25, 30, 24, 38, 42, 35, 28, 45, 40, 31]

const TOP_GAINERS = [
  { name: 'Ishita Rao', rollNo: '9A-05', gain: '+80%', topic: 'Laws of Exponents', band: 'Secure' },
  { name: 'Aanya Sharma', rollNo: '9A-01', gain: '+62%', topic: 'Fractions', band: 'Proficient' },
  { name: 'Ananya Gupta', rollNo: '9A-06', gain: '+58%', topic: 'Coordinate Geometry', band: 'Secure' },
]

const MOST_CONSISTENT = [
  { name: 'Meera Iyer', rollNo: '9A-03', streak: '4-Week Streak', time: '4 hrs 45m', sessions: '6 sessions' },
  { name: 'Aditya Kapoor', rollNo: '9B-01', streak: '3-Week Streak', time: '3 hrs 50m', sessions: '5 sessions' },
  { name: 'Rohan Verma', rollNo: '9A-02', streak: '2-Week Streak', time: '3 hrs 15m', sessions: '4 sessions' },
]

const NEEDS_ATTENTION = [
  { name: 'Vivaan Nair', rollNo: '9B-03', issue: 'Linear Transposition Sign Error', mastery: '36%', status: 'Needs Support' },
  { name: 'Kabir Singh', rollNo: '9A-04', issue: 'Inactive 2 Days · Fractions Gap', mastery: '42%', status: 'Developing' },
  { name: 'Diya Patel', rollNo: '9B-02', issue: 'Denominator LCM Confusion', mastery: '44%', status: 'Developing' },
]

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedClassId, setSelectedClassId] = useState('all')
  const [quickActionNotice, setQuickActionNotice] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(WEEKLY_CURVE[WEEKLY_CURVE.length - 1])

  // Fetch teacher's assigned classes
  const { status, data: classesData } = useApi(
    () => classesService.listForTeacher(user?.id),
    [user?.id]
  )

  const activeClasses = classesData && classesData.length > 0
    ? classesData
    : [
        { id: 'cls_9a', name: 'Class 9-A', subjectName: 'Mathematics', studentCount: 20, averageMastery: 58 },
        { id: 'cls_9b', name: 'Class 9-B', subjectName: 'Mathematics', studentCount: 20, averageMastery: 54 },
      ]

  const currentClassId = selectedClassId === 'all' ? activeClasses[0]?.id : selectedClassId

  // Fetch pending interventions for quick action queue
  const interventionsApi = useApi(
    () => interventionsService.listForClass(currentClassId),
    [currentClassId],
    { skip: !currentClassId }
  )

  const pendingInterventions = interventionsApi.data && interventionsApi.data.length > 0
    ? interventionsApi.data
    : [
        {
          id: 'inv_fractions',
          topicName: 'Fractions',
          affectedCount: 6,
          threshold: 60,
          mainErrorPattern: 'Denominator operations without common multiple',
          evidenceCount: 18,
          recommendedAction: '20-min revision on fraction strips + assign Practice Set F-02 + reassess in 48 hours.',
          status: 'suggested',
        },
        {
          id: 'inv_linear',
          topicName: 'Linear Equations in Two Variables',
          affectedCount: 5,
          threshold: 60,
          mainErrorPattern: 'Sign reversal when transposing terms',
          evidenceCount: 14,
          recommendedAction: 'Targeted drill on two-step linear equations and variable isolation.',
          status: 'suggested',
        },
      ]

  const teacherName = user?.name ? user.name.split(' ')[0] : 'Alex'

  function handleQuickAccept(invId, topicName) {
    setQuickActionNotice(`Intervention for "${topicName}" accepted and assigned to affected students.`)
    setTimeout(() => setQuickActionNotice(null), 4000)
  }

  function handleQuickDismiss(invId, topicName) {
    setQuickActionNotice(`Suggestion for "${topicName}" dismissed.`)
    setTimeout(() => setQuickActionNotice(null), 4000)
  }

  return (
    <>
      <Topbar
        title="Teacher Weekly Performance Dashboard"
        breadcrumb="Teacher Overview"
        subtitle="Weekly student performance tracking, real-time activity pulse, and closed-loop interventions"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/activity"
              className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Real-time Activity (31)</span>
            </Link>
            <Link
              to="/teacher/classes"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>🏫</span>
              <span>Classes Hub</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-7 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Notice alert banner if an action was taken */}
        {quickActionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{quickActionNotice}</span>
            </div>
            <button onClick={() => setQuickActionNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. HERO GREETING & CONTEXT                                     */}
        {/* ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Academic Year 2026–27 · Term 1 Diagnostic Cycle</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {teacherName}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              40 students across 2 cohorts. 31 students active today, with 3 targeted interventions ready for review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/teacher/reports"
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>📑</span>
              <span>Compile Report Cards</span>
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. TOP KPI CARDS                                               */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Class Average Mastery</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-slate-900">56%</span>
              <span className="text-xs font-bold text-emerald-700">↑ +5% this term</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Developing competency band</p>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Weekly Active Students</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-blue-900">36 / 40</span>
              <span className="text-xs font-bold text-blue-700">90%</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1">Participated in diagnostic tasks</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Learning Momentum</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-emerald-900">+14%</span>
              <span className="text-xs text-emerald-700 font-bold">vs last week</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">Normalized Hake progress rate</p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Pending Interventions</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-black text-amber-900">3</span>
              <span className="text-xs text-amber-700 font-bold">Actionable</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">11 students need targeted drills</p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. WEEKLY PERFORMANCE CURVE & LIVE ACTIVITY (From Image 1)    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Weekly Active Time Curve (2 cols) */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📈</span>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Student Performance & Practice Time
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Here’s how your students have been performing from Nov 06 – Nov 12
                </p>
              </div>

              {/* Class Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Class:</span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">All Classes (40)</option>
                  <option value="cls_9a">Class 9-A (Homeroom)</option>
                  <option value="cls_9b">Class 9-B (Mathematics)</option>
                </select>
              </div>
            </div>

            {/* Comparison Badge */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-xs">
                <span className="text-slate-400">Last Week:</span>
                <span className="font-bold">22 mins</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">This Week:</span>
                <span className="font-bold text-emerald-400">28 mins ↑ +15%</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-600 rounded-full" />
                  <span>This Week (Solid)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-400" />
                  <span>Last Week (Dashed)</span>
                </span>
              </div>
            </div>

            {/* Interactive SVG Curve */}
            <div className="relative pt-4 pb-2">
              <div className="h-44 w-full flex items-end justify-between gap-2 border-b border-slate-100 px-2">
                {WEEKLY_CURVE.map((pt, idx) => {
                  const heightPercent = Math.round((pt.thisWeek / 50) * 100)
                  const isHovered = hoveredPoint.day === pt.day
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                    >
                      {/* Floating tooltip */}
                      {isHovered && (
                        <div className="mb-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold shadow-md animate-in fade-in text-center whitespace-nowrap">
                          <div>{pt.day.split(' ')[0]}</div>
                          <div className="text-emerald-400">{pt.thisWeek}m (prev: {pt.lastWeek}m)</div>
                        </div>
                      )}

                      {/* Bar indicator */}
                      <div className="w-full max-w-[28px] bg-slate-100 rounded-t-lg relative overflow-hidden flex items-end h-32">
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isHovered ? 'bg-blue-600' : 'bg-blue-500/70 group-hover:bg-blue-600'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      <span className="text-[10px] font-bold text-slate-500 mt-2 truncate max-w-[48px]">
                        {pt.day.split(' ')[0]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Live Learning Activity Monitor (Image 1 top right) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-display text-sm font-bold text-slate-900">
                    Live Activity Pulse
                  </h3>
                </div>
                <Link
                  to="/teacher/activity"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View All →
                </Link>
              </div>

              <div>
                <div className="font-display text-3xl font-black text-slate-900">31</div>
                <div className="text-xs text-slate-500 font-medium">
                  Students active in the last 60 mins
                </div>
              </div>

              {/* Mini vertical bar distribution */}
              <div className="flex items-end gap-1.5 h-14 mt-4 pt-2 border-b border-slate-100 pb-1">
                {LIVE_HOURLY_BARS.map((bar, bIdx) => (
                  <div
                    key={bIdx}
                    className="flex-1 bg-blue-500 rounded-xs hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.round((bar / 45) * 100)}%` }}
                    title={`${bar} active students`}
                  />
                ))}
              </div>

              {/* Class Live Breakdown */}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Class 9-A (Homeroom)</span>
                  <span className="font-mono font-bold text-blue-700">18 / 20 active</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[90%]" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-700">Class 9-B (Mathematics)</span>
                  <span className="font-mono font-bold text-purple-700">13 / 20 active</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full w-[65%]" />
                </div>
              </div>
            </div>

            <Link
              to="/teacher/activity"
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 text-center transition-colors shadow-2xs block"
            >
              Open Day-Wise Activity Stream →
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. WEEKLY RECOGNITIONS & STUDENT HIGHLIGHTS (Image 1 Bottom)   */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🎖️</span>
                <span>Weekly Student Performance Recognitions</span>
              </h2>
              <p className="text-xs text-slate-500">
                Pedagogical achievement, practice consistency, and priority intervention attention
              </p>
            </div>
            <Link
              to="/teacher/classes"
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              View Full Class Rosters →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Highest Learning Gainers */}
            <div className="rounded-3xl border border-emerald-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-bold">
                  🚀
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">Highest Learning Gains</h3>
                  <p className="text-[11px] text-slate-400">Post-intervention Hake gain (g)</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {TOP_GAINERS.map((st, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                      <div>
                        <div className="font-bold text-slate-800">{st.name}</div>
                        <div className="text-[10px] text-slate-400">{st.topic}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">{st.gain}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-bold uppercase">
                        {st.band}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Most Consistent Practice */}
            <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-100">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
                  ⏱️
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">Most Consistent Practice</h3>
                  <p className="text-[11px] text-slate-400">Continuous daily learning streaks</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {MOST_CONSISTENT.map((st, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                      <div>
                        <div className="font-bold text-slate-800">{st.name}</div>
                        <div className="text-[10px] text-slate-400">{st.sessions}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">{st.time}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 font-bold uppercase">
                        {st.streak}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Needs Intervention Attention */}
            <div className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-amber-100">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-sm font-bold">
                  ⚠️
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-900">Needs Support Attention</h3>
                  <p className="text-[11px] text-slate-400">Flagged for targeted teacher assistance</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {NEEDS_ATTENTION.map((st, sIdx) => (
                  <div key={sIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold w-4">{sIdx + 1}.</span>
                      <div>
                        <div className="font-bold text-slate-800">{st.name}</div>
                        <div className="text-[10px] text-amber-800 truncate max-w-[140px]">{st.issue}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{st.mastery}</div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-bold uppercase">
                        {st.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. URGENT INTERVENTION ACTION QUEUE                            */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="font-display text-base font-bold text-slate-900">
                  Urgent Intervention Action Queue
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagnostic evidence shows recurrent misconception patterns. Review and approve closed-loop next steps.
              </p>
            </div>
            <Link
              to="/teacher/interventions"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Full Intervention Queue ({pendingInterventions.length})</span>
              <span>→</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingInterventions.map((inv) => (
              <div key={inv.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {inv.topicName}
                      </span>
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                        {inv.affectedCount} students below 60% threshold
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900">Identified Misconception: </strong>
                      <span>{inv.mainErrorPattern}</span>
                      <span className="text-slate-400 ml-1">({inv.evidenceCount} repeated evidence flags)</span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong className="text-blue-900">Suggested Action: </strong>
                      <span>{inv.recommendedAction}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickDismiss(inv.id, inv.topicName)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAccept(inv.id, inv.topicName)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5"
                    >
                      <span>✓</span>
                      <span>Accept & Assign</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
