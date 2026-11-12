import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'

const ASSIGNED_SUBJECT_CLASSES = [
  {
    id: 'cls_9b',
    name: 'Class 9-B',
    subject: 'Mathematics',
    curriculum: 'CBSE / NCERT Core Class 9',
    homeroomTeacher: 'Priya Nair',
    studentCount: 20,
    attendanceRate: 90,
    subjectMastery: 54,
    activeFlags: 3,
    pendingInterventions: 1,
    topicsProgress: '3 of 5 Pilot Chapters Assessed',
    recentActivity: 'Linear Equations Practice Set #01 active',
  },
  {
    id: 'cls_10a',
    name: 'Class 10-A',
    subject: 'Mathematics',
    curriculum: 'CBSE / NCERT Core Class 10',
    homeroomTeacher: 'Marcus Chen',
    studentCount: 22,
    attendanceRate: 92,
    subjectMastery: 62,
    activeFlags: 2,
    pendingInterventions: 1,
    topicsProgress: '4 of 6 Chapters Assessed',
    recentActivity: 'Quadratic Equations Diagnostic completed',
  },
]

export default function TeacherClassesPage() {
  const navigate = useNavigate()
  const [searchFilter, setSearchFilter] = useState('')

  const filtered = ASSIGNED_SUBJECT_CLASSES.filter((c) =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase().trim())
  )

  return (
    <>
      <Topbar
        title="Assigned Classes · Subject Teacher Workspace"
        breadcrumb="Teacher / Assigned Classes"
        subtitle="Classes assigned to you for Mathematics instruction. Click any class to view its subject profile and full student list."
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/my-class"
              className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 transition-colors shadow-2xs"
            >
              👑 Open My Class (Class Teacher) →
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-7 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* ============================================================== */}
        {/* 1. TOP SWITCHER PILL                                           */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <Link
              to="/teacher/my-class"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
            >
              <span>👑</span>
              <span>My Class (Class Teacher) · Class 9-A</span>
            </Link>
            <span className="px-4 py-2 rounded-xl bg-white text-slate-900 shadow-2xs font-extrabold flex items-center gap-1.5">
              <span>📐</span>
              <span>Assigned Classes (Subject Teacher)</span>
            </span>
          </div>

          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-3 py-1 rounded-full">
            Mathematics Specialist Role
          </span>
        </div>

        {/* ============================================================== */}
        {/* 2. STATS KPI CARDS                                             */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Cohorts</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-slate-900">{ASSIGNED_SUBJECT_CLASSES.length}</span>
              <span className="text-xs text-slate-500 font-normal">Subject Classes</span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Total Math Students</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-purple-900">42</span>
              <span className="text-xs text-purple-700 font-normal">Under instruction</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Subject Average Mastery</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-blue-900">58%</span>
              <span className="text-xs text-blue-700 font-normal">Across both classes</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Subject Interventions</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-amber-900">2</span>
              <span className="text-xs text-amber-700 font-normal">Pending Drills</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. ASSIGNED CLASSES LIST CARDS                                 */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Assigned Subject Classes · Mathematics Curriculum
              </h2>
              <p className="text-xs text-slate-500">
                Click any class card to open the complete class profile for Mathematics and the full list of admitted students.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search class by name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-500 focus:outline-hidden"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {filtered.map((cls) => (
              <div
                key={cls.id}
                onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:border-purple-400 hover:shadow-md cursor-pointer transition-all space-y-5 group"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center font-display font-black text-lg shadow-sm shadow-purple-500/25 shrink-0 group-hover:scale-105 transition-transform">
                      <span>{cls.name.replace('Class ', '')}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                          {cls.name}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                          {cls.subject} Specialization
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cls.curriculum} · Homeroom Teacher: {cls.homeroomTeacher}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/teacher/classes/${cls.id}`)
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-purple-500/25 transition-all flex items-center gap-1.5"
                    >
                      <span>Open {cls.name} Profile & Student List</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Performance Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admitted Students</div>
                    <div className="font-display text-lg font-black text-slate-900 mt-0.5">{cls.studentCount} Students</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Math Attendance Today</div>
                    <div className="font-display text-lg font-black text-emerald-700 mt-0.5">{cls.attendanceRate}% Active</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Mastery (Math)</div>
                    <div className="font-display text-lg font-black text-purple-700 mt-0.5">{cls.subjectMastery}%</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curriculum Progression</div>
                    <div className="font-display text-xs font-bold text-slate-800 mt-1 truncate">{cls.topicsProgress}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Current Focus: <strong className="text-slate-700">{cls.recentActivity}</strong></span>
                  <span className="font-bold text-purple-600 group-hover:underline flex items-center gap-1">
                    <span>Click to view full class profile and {cls.studentCount} students</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
