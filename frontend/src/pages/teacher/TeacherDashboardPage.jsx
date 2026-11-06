import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { interventionsService } from '../../services/interventionsService'

export default function TeacherDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedClassId, setSelectedClassId] = useState('')
  const [quickActionNotice, setQuickActionNotice] = useState(null)

  // Fetch teacher's assigned classes
  const { status, data: classesData, error, refetch, isEmpty } = useApi(
    () => classesService.listForTeacher(user?.id),
    [user?.id]
  )

  const activeClasses = classesData && classesData.length > 0
    ? classesData
    : [
        {
          id: 'cls_9a',
          name: 'Class 9-A',
          subjectName: 'Mathematics',
          curriculum: 'NCERT Core',
          studentCount: 20,
          averageMastery: 58,
          activeFlags: 4,
          pendingInterventions: 2,
        },
        {
          id: 'cls_9b',
          name: 'Class 9-B',
          subjectName: 'Mathematics',
          curriculum: 'NCERT Core',
          studentCount: 20,
          averageMastery: 54,
          activeFlags: 3,
          pendingInterventions: 1,
        },
      ]

  const currentClassId = selectedClassId || activeClasses[0]?.id

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

  // Summary Metrics calculations
  const totalStudents = activeClasses.reduce((acc, c) => acc + (c.studentCount || 20), 0)
  const overallAvgMastery = Math.round(
    activeClasses.reduce((acc, c) => acc + (c.averageMastery || 56), 0) / (activeClasses.length || 1)
  )

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
        title="Teacher Intelligence Dashboard"
        breadcrumb="Teacher Overview"
        subtitle="Real-time class diagnostics, mastery tracking, and closed-loop interventions"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/interventions"
              className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>⚡</span>
              <span>Interventions (3)</span>
            </Link>
            <Link
              to="/teacher/reports"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>📑</span>
              <span>Reports</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Notice alert banner if an action was taken */}
        {quickActionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{quickActionNotice}</span>
            </div>
            <button onClick={() => setQuickActionNotice(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. HERO HEADER: Greeting & Context                             */}
        {/* ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/70 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Academic Year 2026–27 · Term 1 Active</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {teacherName}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              Class 9 Mathematics pilot: <strong>{totalStudents} students</strong> tracking competency mastery across <strong>{activeClasses.length} assigned classes</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/teacher/questions"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>+ Add Question</span>
            </Link>
            <Link
              to="/teacher/reports"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Generate Class Report →</span>
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. TOP KPI EXECUTIVE METRIC CARDS (4 Cards)                    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall Average Mastery */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CLASS AVERAGE MASTERY
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Developing
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {overallAvgMastery}%
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                  <span>↑ +4.2%</span>
                  <span className="text-[10px] text-slate-400 font-normal">this month</span>
                </span>
              </div>
              <div className="mt-2.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-700"
                  style={{ width: `${overallAvgMastery}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Heuristic model (40% accuracy, 20% diff, 20% recency, 20% trend)
            </p>
          </div>

          {/* Card 2: Students Needing Support */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                STUDENTS NEEDING SUPPORT
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                &lt; 40% Score
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  6
                </span>
                <span className="text-xs text-slate-500 font-medium">of {totalStudents} students</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Identified with foundational prerequisite gaps in Fractions &amp; Equations.
              </p>
            </div>
            <Link
              to={`/teacher/classes/${currentClassId}`}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View flagged students in roster</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 3: Active Interventions Pending */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                INTERVENTIONS PENDING
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                3 Actions
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                  {pendingInterventions.length}
                </span>
                <span className="text-xs text-amber-800 font-medium">Awaiting teacher review</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Generated from recurrent cluster patterns in recent quizzes.
              </p>
            </div>
            <Link
              to="/teacher/interventions"
              className="text-[11px] font-bold text-amber-900 hover:underline flex items-center gap-1"
            >
              <span>Open Intervention Queue</span>
              <span>→</span>
            </Link>
          </div>

          {/* Card 4: Tagged Misconceptions */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                RECURRENT MISCONCEPTIONS
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                Evidence Tagged
              </span>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  5
                </span>
                <span className="text-xs text-slate-500 font-medium">Pattern clusters</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Highest frequency: <em>Denominator Operations</em> (18 tagged errors).
              </p>
            </div>
            <Link
              to={`/teacher/classes/${currentClassId}/topics/t_fractions`}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors flex items-center gap-1"
            >
              <span>Inspect distractor analysis</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. ASSIGNED CLASSES SECTION (Clickable Cards with Heatmap CTA)  */}
        {/* ============================================================== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Assigned Classes</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {activeClasses.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any class to explore its topic mastery matrix, student rosters, and diagnostic charts.
              </p>
            </div>

            <span className="text-xs font-medium text-slate-400 hidden sm:inline">
              Class-level roster data isolation active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeClasses.map((cls) => {
              const isSelected = cls.id === currentClassId
              return (
                <div
                  key={cls.id}
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                  className={`rounded-2xl border-2 p-5 sm:p-6 transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-600 bg-white shadow-md shadow-blue-500/10'
                      : 'border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                            {cls.subjectName || 'Mathematics'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {cls.curriculum || 'NCERT Core'}
                          </span>
                        </div>
                        <h3 className="font-display text-xl font-extrabold text-slate-950 mt-1 tracking-tight group-hover:text-blue-600 transition-colors">
                          {cls.name}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {cls.studentCount || 20} Students
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Class Mastery Score</span>
                        <span className="font-bold text-slate-900">{cls.averageMastery || 56}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-700"
                          style={{ width: `${cls.averageMastery || 56}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        ⚡ {cls.pendingInterventions || 2} Interventions
                      </span>
                      <span className="text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        🚩 {cls.activeFlags || 3} Error Flags
                      </span>
                    </div>

                    <span className="font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>Open Class Analytics</span>
                      <span>→</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. TEACHER ACTION CENTER: SUGGESTED INTERVENTIONS (Teacher-in-the-Loop) */}
        {/* ============================================================== */}
        <div className="rounded-2xl border-2 border-slate-900 bg-white p-5 sm:p-7 shadow-[4px_4px_0px_#0f172a]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">
                  Action Center · Suggested Interventions
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                The learning engine detected clusters of recurrent errors. Review, edit, or accept these suggested classroom interventions.
              </p>
            </div>

            <Link
              to="/teacher/interventions"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View all in Queue</span>
              <span>→</span>
            </Link>
          </div>

          {/* Intervention Cards in Action Center */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingInterventions.slice(0, 2).map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {inv.topicName}
                      </span>
                      <h4 className="font-display font-bold text-base text-slate-950 mt-1">
                        {inv.mainErrorPattern}
                      </h4>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                      {inv.affectedCount} Students Affected
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-normal mt-2">
                    <strong className="text-slate-800">Suggested Action:</strong> {inv.recommendedAction}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Evidence count: {inv.evidenceCount || 15} repeated errors
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDismiss(inv.id, inv.topicName)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAccept(inv.id, inv.topicName)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 font-display font-bold text-xs text-slate-950 shadow-2xs transition-all cursor-pointer"
                    >
                      Accept &amp; Assign →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. CLASS CURRICULUM MASTERY MATRIX PREVIEW                     */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-950 tracking-tight">
                Class 9-A Curriculum Mastery Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Average competency scores across the 5 core pilot topics in Mathematics.
              </p>
            </div>

            <Link
              to={`/teacher/classes/${currentClassId}`}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>Full Student Heatmap</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { topic: 'Number Systems', score: 68, band: 'Proficient', color: 'bg-blue-600', count: '18/20' },
              { topic: 'Polynomials', score: 62, band: 'Proficient', color: 'bg-blue-600', count: '16/20' },
              { topic: 'Linear Equations', score: 48, band: 'Developing', color: 'bg-amber-500', count: '12/20' },
              { topic: 'Fractions', score: 42, band: 'Developing', color: 'bg-amber-500', count: '11/20' },
              { topic: 'Coordinate Geometry', score: 38, band: 'Needs Support', color: 'bg-rose-500', count: '8/20' },
            ].map((t, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                  <span className="truncate">{t.topic}</span>
                  <span className="text-[10px] font-bold text-slate-700">{t.score}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1.5">
                  <div className={`h-full ${t.color} rounded-full`} style={{ width: `${t.score}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{t.band}</span>
                  <span>{t.count} passed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 6. WHOLE-CLASS DISTRIBUTION & RECENT DIAGNOSTIC ACTIVITY       */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Mastery Band Distribution (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                Mastery Band Distribution
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution across 40 Class 9 Mathematics learners.
              </p>

              <div className="my-5 space-y-3">
                {[
                  { label: 'Secure (80–100%)', count: 6, pct: '15%', color: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Proficient (60–79%)', count: 18, pct: '45%', color: 'bg-blue-600', textColor: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Developing (40–59%)', count: 10, pct: '25%', color: 'bg-amber-500', textColor: 'text-amber-800', bg: 'bg-amber-50' },
                  { label: 'Needs Support (0–39%)', count: 6, pct: '15%', color: 'bg-rose-500', textColor: 'text-rose-700', bg: 'bg-rose-50' },
                ].map((band, bIdx) => (
                  <div key={bIdx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{band.label}</span>
                      <span className="font-bold text-slate-900">{band.count} students ({band.pct})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full ${band.color} rounded-full`} style={{ width: band.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Class target: 80% Proficient or Secure</span>
              <Link to="/teacher/reports" className="font-bold text-blue-600 hover:underline">
                Export distribution report →
              </Link>
            </div>
          </div>

          {/* Right Column: Live Student Diagnostic Submissions (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-950 tracking-tight">
                  Recent Diagnostic Submissions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live activity stream across Class 9 Mathematics.
                </p>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                Updated just now
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                { name: 'Aanya Sharma', quiz: 'Linear Equations Practice Checkpoint', score: '85%', status: 'Proficient', time: '12m ago', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                { name: 'Rohan Verma', quiz: 'Fractions Baseline Diagnostic', score: '38%', status: 'Needs Support', time: '45m ago', color: 'bg-rose-50 text-rose-700 border-rose-200' },
                { name: 'Kabir Singh', quiz: 'Polynomials Remainder Theorem Quiz', score: '64%', status: 'Proficient', time: '1h ago', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { name: 'Meera Iyer', quiz: 'Coordinate Geometry Cartesian Plane', score: '52%', status: 'Developing', time: '2h ago', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                { name: 'Arjun Mehta', quiz: 'Fractions Diagnostic Reassessment', score: '78%', status: 'Proficient', time: '3h ago', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
              ].map((sub, sIdx) => (
                <div key={sIdx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                      {sub.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{sub.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{sub.quiz}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sub.color}`}>
                      {sub.score} · {sub.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono w-14 text-right">
                      {sub.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
