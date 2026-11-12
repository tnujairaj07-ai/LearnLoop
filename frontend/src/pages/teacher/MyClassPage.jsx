import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'

const CLASS_STUDENTS_MULTI_SUBJECT = [
  { id: 's_01', rollNo: '2026-09A-01', name: 'Aanya Sharma', attendance: 'attended', math: 58, sci: 72, soc: 78, eng: 84, gain: 0.62 },
  { id: 's_02', rollNo: '2026-09A-02', name: 'Rohan Verma', attendance: 'attended', math: 38, sci: 52, soc: 60, eng: 68, gain: 0.20 },
  { id: 's_03', rollNo: '2026-09A-03', name: 'Meera Iyer', attendance: 'attended', math: 58, sci: 68, soc: 74, eng: 80, gain: 0.39 },
  { id: 's_04', rollNo: '2026-09A-04', name: 'Kabir Singh', attendance: 'not_visited', math: 42, sci: 48, soc: 58, eng: 62, gain: 0.23 },
  { id: 's_05', rollNo: '2026-09A-05', name: 'Ishita Rao', attendance: 'attended', math: 88, sci: 92, soc: 86, eng: 94, gain: 0.80 },
  { id: 's_06', rollNo: '2026-09A-06', name: 'Aditya Kapoor', attendance: 'attended', math: 64, sci: 66, soc: 70, eng: 74, gain: 0.42 },
  { id: 's_07', rollNo: '2026-09A-07', name: 'Diya Patel', attendance: 'not_visited', math: 52, sci: 56, soc: 68, eng: 70, gain: 0.30 },
  { id: 's_08', rollNo: '2026-09A-08', name: 'Vivaan Nair', attendance: 'attended', math: 36, sci: 50, soc: 58, eng: 64, gain: 0.17 },
  { id: 's_09', rollNo: '2026-09A-09', name: 'Ananya Gupta', attendance: 'attended', math: 82, sci: 85, soc: 90, eng: 92, gain: 0.73 },
  { id: 's_10', rollNo: '2026-09A-10', name: 'Arjun Mehta', attendance: 'attended', math: 66, sci: 70, soc: 75, eng: 78, gain: 0.46 },
  { id: 's_11', rollNo: '2026-09A-11', name: 'Sara Khan', attendance: 'attended', math: 74, sci: 78, soc: 82, eng: 88, gain: 0.55 },
  { id: 's_12', rollNo: '2026-09A-12', name: 'Neha Joshi', attendance: 'attended', math: 54, sci: 62, soc: 68, eng: 72, gain: 0.34 },
  { id: 's_13', rollNo: '2026-09A-13', name: 'Karan Malhotra', attendance: 'attended', math: 48, sci: 54, soc: 62, eng: 66, gain: 0.28 },
  { id: 's_14', rollNo: '2026-09A-14', name: 'Priyanka Das', attendance: 'attended', math: 70, sci: 76, soc: 80, eng: 85, gain: 0.52 },
  { id: 's_15', rollNo: '2026-09A-15', name: 'Yash Chopra', attendance: 'attended', math: 60, sci: 64, soc: 72, eng: 76, gain: 0.40 },
  { id: 's_16', rollNo: '2026-09A-16', name: 'Riya Bansal', attendance: 'attended', math: 62, sci: 65, soc: 71, eng: 77, gain: 0.41 },
  { id: 's_17', rollNo: '2026-09A-17', name: 'Zoya Ahmed', attendance: 'attended', math: 78, sci: 82, soc: 86, eng: 90, gain: 0.65 },
  { id: 's_18', rollNo: '2026-09A-18', name: 'Dev Kulkarni', attendance: 'attended', math: 50, sci: 58, soc: 66, eng: 70, gain: 0.31 },
  { id: 's_19', rollNo: '2026-09A-19', name: 'Tanvi Reddy', attendance: 'attended', math: 84, sci: 88, soc: 91, eng: 95, gain: 0.77 },
  { id: 's_20', rollNo: '2026-09A-20', name: 'Ayaan Sheikh', attendance: 'attended', math: 56, sci: 60, soc: 67, eng: 73, gain: 0.36 },
]

export default function MyClassPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all')
  const [classNotice, setClassNotice] = useState(
    'Hey Class 9-A! The mid-term diagnostic review across Mathematics and Science is active. Please review your teacher feedback notes before Friday!'
  )
  const [isEditingNotice, setIsEditingNotice] = useState(false)
  const [editedNotice, setEditedNotice] = useState(classNotice)

  // Filter students
  const filteredStudents = useMemo(() => {
    return CLASS_STUDENTS_MULTI_SUBJECT.filter((s) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase().trim())
      return matchSearch
    })
  }, [searchQuery])

  function getBandBadge(score) {
    if (score >= 80) return <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">Secure</span>
    if (score >= 60) return <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">Proficient</span>
    if (score >= 40) return <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">Developing</span>
    return <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">Needs Support</span>
  }

  function handleSaveNotice() {
    setClassNotice(editedNotice)
    setIsEditingNotice(false)
  }

  return (
    <>
      <Topbar
        title="Class 9-A · Class Teacher Workspace"
        breadcrumb="Teacher / My Class"
        subtitle="Overall class performance and progress across all enrolled subjects (Class Teacher Custody)"
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/classes"
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              View Assigned Classes (Subject) →
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
            <span className="px-4 py-2 rounded-xl bg-white text-slate-900 shadow-2xs font-extrabold flex items-center gap-1.5">
              <span>👑</span>
              <span>My Class (Class Teacher) · Class 9-A</span>
            </span>
            <Link
              to="/teacher/classes"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
            >
              <span>📐</span>
              <span>Assigned Classes (Subject Teacher)</span>
            </Link>
          </div>

          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-3 py-1 rounded-full">
            Full Multi-Subject Visibility
          </span>
        </div>

        {/* ============================================================== */}
        {/* 2. CLASS TEACHER OVERVIEW HEADER CARD                          */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-display font-black text-xl shadow-sm shadow-blue-500/25 shrink-0">
                <span>9A</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-black text-slate-900">Class 9-A</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900">
                    Homeroom Cohort
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Class Teacher: <strong>Alex Rivera</strong> · CBSE Curriculum 2026–27 · 20 Enrolled Students
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/teacher/reports"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                Compile Term Reports
              </Link>
            </div>
          </div>

          {/* 4 Summary Multi-Subject KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Average GPA / Mastery</div>
              <div className="font-display text-2xl font-black text-slate-900 mt-1">67%</div>
              <div className="text-[11px] text-emerald-700 font-bold mt-0.5">Proficient cohort standing</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today&rsquo;s Attendance</div>
              <div className="font-display text-2xl font-black text-emerald-700 mt-1">95%</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">19 of 20 students active</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Highest Performing Subject</div>
              <div className="font-display text-2xl font-black text-blue-700 mt-1">English</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">76% Average Mastery</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject Needing Attention</div>
              <div className="font-display text-2xl font-black text-amber-700 mt-1">Mathematics</div>
              <div className="text-[11px] text-amber-800 font-bold mt-0.5">58% Mastery · 2 Interventions</div>
            </div>
          </div>

          {/* Cross-Subject Performance Bars */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Overall Performance Across All 4 Academic Subjects</span>
              <span className="text-slate-400 font-normal text-[11px]">Aggregated for Class 9-A</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1">📐 Mathematics</span>
                  <span className="text-blue-700">58%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[58%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Teacher: Alex Rivera</span>
                  <span>Developing</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1">🔬 Science</span>
                  <span className="text-emerald-700">64%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[64%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Teacher: Marcus Chen</span>
                  <span>Proficient</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1">🌍 Social Studies</span>
                  <span className="text-emerald-700">71%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[71%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Teacher: Sofia Torres</span>
                  <span>Proficient</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1">📖 English</span>
                  <span className="text-emerald-700">76%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full w-[76%]" />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Teacher: Priya Nair</span>
                  <span>Secure</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. FULL ADMITTED STUDENTS ROSTER (MULTI-SUBJECT)               */}
        {/* ============================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                <span>👥</span>
                <span>Full List of Admitted Students ({filteredStudents.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Performance across all enrolled subjects. Click any student row to view their complete academic profile.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                placeholder="Search student or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:outline-hidden"
              />
              <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Roll & Student Name</th>
                  <th className="px-3 py-3">Attendance</th>
                  <th className="px-3 py-3 text-center">Mathematics</th>
                  <th className="px-3 py-3 text-center">Science</th>
                  <th className="px-3 py-3 text-center">Social Studies</th>
                  <th className="px-3 py-3 text-center">English</th>
                  <th className="px-3 py-3 text-center">Overall GPA</th>
                  <th className="px-3 py-3 text-center">Learning Gain</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const avg = Math.round((s.math + s.sci + s.soc + s.eng) / 4)
                  const isAttended = s.attendance === 'attended'

                  return (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/teacher/students/${s.id}?view=homeroom`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.name.split(' ').map((p) => p[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.rollNo}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        {isAttended ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Present</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <span>Not Visited</span>
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center font-semibold">
                        <div>{s.math}%</div>
                        <div className="mt-0.5">{getBandBadge(s.math)}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center font-semibold">
                        <div>{s.sci}%</div>
                        <div className="mt-0.5">{getBandBadge(s.sci)}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center font-semibold">
                        <div>{s.soc}%</div>
                        <div className="mt-0.5">{getBandBadge(s.soc)}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center font-semibold">
                        <div>{s.eng}%</div>
                        <div className="mt-0.5">{getBandBadge(s.eng)}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <div className="font-display font-black text-slate-900 text-sm">{avg}%</div>
                        <div className="mt-0.5">{getBandBadge(avg)}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className="font-bold text-emerald-700">+{Math.round(s.gain * 100)}%</span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs inline-flex items-center gap-1">
                          <span>Profile</span>
                          <span>→</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
