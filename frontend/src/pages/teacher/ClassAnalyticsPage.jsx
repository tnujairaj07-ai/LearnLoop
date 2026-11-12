import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { MasteryHeatmap } from '../../components/charts/MasteryHeatmap'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { masteryService } from '../../services/masteryService'

const CLASS_9B_STUDENTS = [
  { id: 's_06', rollNo: '2026-09B-01', name: 'Aditya Kapoor', attendance: 'attended', activeTime: '28m', mastery: 64, band: 'Proficient', currentDrill: 'Worksheet 4.1 Q4 (Standard form)', quizScore: '75% (3/4)', gain: 0.42, flag: 'None' },
  { id: 's_07', rollNo: '2026-09B-02', name: 'Diya Patel', attendance: 'not_visited', activeTime: '0m', mastery: 44, band: 'Developing', currentDrill: 'No activity logged today', quizScore: '—', gain: 0.30, flag: 'Denominator LCM' },
  { id: 's_08', rollNo: '2026-09B-03', name: 'Vivaan Nair', attendance: 'attended', activeTime: '19m', mastery: 36, band: 'Needs Support', currentDrill: 'Video Step 2: Transposition balance', quizScore: '50% (2/4)', gain: 0.17, flag: 'Transposition Sign Error' },
  { id: 's_11', rollNo: '2026-09B-04', name: 'Sara Khan', attendance: 'attended', activeTime: '42m', mastery: 74, band: 'Proficient', currentDrill: 'Exponents Practice Set #3', quizScore: '85% (8/10)', gain: 0.55, flag: 'None' },
  { id: 's_12', rollNo: '2026-09B-05', name: 'Neha Joshi', attendance: 'attended', activeTime: '30m', mastery: 54, band: 'Developing', currentDrill: 'Polynomial Factorization Drill', quizScore: '60% (3/5)', gain: 0.34, flag: 'Factoring Signs' },
  { id: 's_13', rollNo: '2026-09B-06', name: 'Karan Malhotra', attendance: 'attended', activeTime: '22m', mastery: 48, band: 'Developing', currentDrill: 'Fraction Strip Walkthrough', quizScore: '50% (2/4)', gain: 0.28, flag: 'Common Denominator' },
  { id: 's_14', rollNo: '2026-09B-07', name: 'Priyanka Das', attendance: 'attended', activeTime: '35m', mastery: 70, band: 'Proficient', currentDrill: 'Coordinate Plane Workshop', quizScore: '80% (4/5)', gain: 0.52, flag: 'None' },
  { id: 's_15', rollNo: '2026-09B-08', name: 'Yash Chopra', attendance: 'attended', activeTime: '25m', mastery: 60, band: 'Proficient', currentDrill: 'Linear Eq. Two-Step Review', quizScore: '70% (7/10)', gain: 0.40, flag: 'Sign Laws' },
  { id: 's_16', rollNo: '2026-09B-09', name: 'Riya Bansal', attendance: 'attended', activeTime: '33m', mastery: 62, band: 'Proficient', currentDrill: 'Polynomials Zeros Drill', quizScore: '75% (3/4)', gain: 0.41, flag: 'None' },
  { id: 's_17', rollNo: '2026-09B-10', name: 'Zoya Ahmed', attendance: 'attended', activeTime: '40m', mastery: 78, band: 'Proficient', currentDrill: 'Advanced Rational Exponents', quizScore: '90% (9/10)', gain: 0.65, flag: 'None' },
  { id: 's_18', rollNo: '2026-09B-11', name: 'Dev Kulkarni', attendance: 'not_visited', activeTime: '0m', mastery: 46, band: 'Developing', currentDrill: 'No activity logged today', quizScore: '—', gain: 0.31, flag: 'Variable Isolation' },
  { id: 's_19', rollNo: '2026-09B-12', name: 'Tanvi Reddy', attendance: 'attended', activeTime: '48m', mastery: 84, band: 'Secure', currentDrill: 'Ch. 4 Challenge Drill #2', quizScore: '100% (5/5)', gain: 0.77, flag: 'None' },
  { id: 's_20', rollNo: '2026-09B-13', name: 'Ayaan Sheikh', attendance: 'attended', activeTime: '26m', mastery: 56, band: 'Developing', currentDrill: 'Fraction Reduction Worksheet', quizScore: '65% (4/6)', gain: 0.36, flag: 'Fraction Invert' },
  { id: 's_21', rollNo: '2026-09B-14', name: 'Naveen Pillai', attendance: 'attended', activeTime: '31m', mastery: 58, band: 'Developing', currentDrill: 'Linear Graphs Practice #1', quizScore: '70% (7/10)', gain: 0.38, flag: 'None' },
  { id: 's_22', rollNo: '2026-09B-15', name: 'Kavya Menon', attendance: 'attended', activeTime: '37m', mastery: 72, band: 'Proficient', currentDrill: 'Polynomial Identities #2', quizScore: '80% (4/5)', gain: 0.54, flag: 'None' },
  { id: 's_23', rollNo: '2026-09B-16', name: 'Farhan Ali', attendance: 'not_visited', activeTime: '0m', mastery: 40, band: 'Developing', currentDrill: 'No activity logged today', quizScore: '—', gain: 0.22, flag: 'Transposition Signs' },
  { id: 's_24', rollNo: '2026-09B-17', name: 'Simran Kaur', attendance: 'attended', activeTime: '29m', mastery: 65, band: 'Proficient', currentDrill: 'Irrational Numbers Proofs', quizScore: '75% (3/4)', gain: 0.44, flag: 'None' },
  { id: 's_25', rollNo: '2026-09B-18', name: 'Rahul Bose', attendance: 'attended', activeTime: '34m', mastery: 68, band: 'Proficient', currentDrill: 'Linear Word Problems Drill', quizScore: '80% (4/5)', gain: 0.49, flag: 'None' },
  { id: 's_26', rollNo: '2026-09B-19', name: 'Ipsita Mishra', attendance: 'attended', activeTime: '44m', mastery: 80, band: 'Secure', currentDrill: 'Laws of Exponents Set #4', quizScore: '95% (19/20)', gain: 0.72, flag: 'None' },
  { id: 's_27', rollNo: '2026-09B-20', name: 'Vikram Rao', attendance: 'attended', activeTime: '21m', mastery: 50, band: 'Developing', currentDrill: 'Fractions Common Denominators', quizScore: '60% (3/5)', gain: 0.32, flag: 'Common Denominator' },
]

export default function ClassAnalyticsPage() {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('roster') // 'roster', 'curriculum', 'heatmap'
  const [topicFilter, setTopicFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { status, data, error, refetch } = useApi(
    () => masteryService.classHeatmap(classId, { topicId: topicFilter || undefined }),
    [classId, topicFilter],
    { emptyWhen: (d) => !d?.rows?.length }
  )

  const topics = useMemo(() => data?.topics ?? [], [data])
  const rows = useMemo(() => data?.rows ?? [], [data])

  const className = data?.className || (classId === 'cls_9b' ? 'Class 9-B' : classId === 'cls_10a' ? 'Class 10-A' : 'Class 9-A')
  const homeroomTeacher = classId === 'cls_9b' ? 'Priya Nair' : classId === 'cls_10a' ? 'Marcus Chen' : 'Alex Rivera'
  const subjectName = 'Mathematics'

  // Filter students in Class 9-B
  const studentList = useMemo(() => {
    return CLASS_9B_STUDENTS.filter((s) => {
      const q = searchQuery.toLowerCase().trim()
      return !q || s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q)
    })
  }, [searchQuery])

  function getBandBadge(score) {
    if (score >= 80) return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">Secure</span>
    if (score >= 60) return <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">Proficient</span>
    if (score >= 40) return <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">Developing</span>
    return <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">Needs Support</span>
  }

  return (
    <>
      <Topbar
        title={`${className} · Mathematics Profile & Student List`}
        breadcrumb="Teacher / Assigned Classes"
        subtitle={`Class profile, subject progression, and admitted students roster for ${subjectName}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/classes"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              ← Back to Assigned Classes
            </Link>
            <Link
              to="/teacher/interventions"
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>Subject Interventions</span>
            </Link>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* ========================================================== */}
        {/* 1. CLASS PROFILE FOR THIS SUBJECT (MATHEMATICS)            */}
        {/* ========================================================== */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center font-display font-black text-xl shadow-sm shadow-purple-500/25 shrink-0">
                <span>{className.replace('Class ', '')}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-black text-slate-900">{className}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                    Mathematics Specialization
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Assigned Subject: <strong>Mathematics (NCERT Core)</strong> · Homeroom Teacher: {homeroomTeacher} · Instruction: Alex Rivera
                </p>
              </div>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
              {[
                { id: 'roster', label: `Admitted Students (${studentList.length})` },
                { id: 'curriculum', label: 'Subject Chapters Progress' },
                { id: 'heatmap', label: 'Mastery Heatmap' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Performance Profile KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Math Average Mastery</div>
              <div className="font-display text-2xl font-black text-purple-950 mt-1">54%</div>
              <div className="text-[11px] text-purple-700 font-semibold mt-0.5">Developing Competency Band</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Math Diagnostic Accuracy</div>
              <div className="font-display text-2xl font-black text-slate-900 mt-1">72%</div>
              <div className="text-[11px] text-emerald-700 font-bold mt-0.5">↑ +4% vs baseline</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Math Attendance Today</div>
              <div className="font-display text-2xl font-black text-emerald-700 mt-1">90%</div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">18 of 20 active in Math drills</div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Active Math Misconceptions</div>
              <div className="font-display text-2xl font-black text-amber-900 mt-1">3 Patterns</div>
              <div className="text-[11px] text-amber-800 font-bold mt-0.5">Linear transpositions & LCM</div>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 2. TAB 1: FULL LIST OF ADMITTED STUDENTS IN THIS CLASS    */}
        {/* ========================================================== */}
        {activeTab === 'roster' && (
          <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>👥</span>
                  <span>Students Admitted in {className} · Mathematics Performance ({studentList.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Click any student row to view their complete academic performance, lecture progress, and error pattern history in Mathematics.
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search student or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-purple-500 focus:outline-hidden"
                />
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Roll & Student Name</th>
                    <th className="px-3 py-3">Today in Math</th>
                    <th className="px-3 py-3 text-center">Math Mastery</th>
                    <th className="px-3 py-3">Current Lecture / Drill</th>
                    <th className="px-3 py-3 text-center">Quiz Score</th>
                    <th className="px-3 py-3 text-center">Learning Gain</th>
                    <th className="px-3 py-3">Flagged Misconception</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentList.map((s) => {
                    const isAttended = s.attendance === 'attended'
                    return (
                      <tr
                        key={s.id}
                        onClick={() => navigate(`/teacher/students/${s.id}?subject=math&classId=${classId}`)}
                        className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xs shrink-0">
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
                              <span>{s.activeTime} active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <span>Not Visited</span>
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-center font-semibold">
                          <div className="font-display font-black text-slate-900">{s.mastery}%</div>
                          <div className="mt-0.5">{getBandBadge(s.mastery)}</div>
                        </td>

                        <td className="px-3 py-3.5 max-w-[200px]">
                          <div className="truncate text-slate-800 font-medium">{s.currentDrill}</div>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono font-bold text-slate-700">
                          {s.quizScore}
                        </td>

                        <td className="px-3 py-3.5 text-center font-bold text-emerald-700">
                          +{Math.round(s.gain * 100)}%
                        </td>

                        <td className="px-3 py-3.5">
                          {s.flag !== 'None' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                              <span>⚠️</span>
                              <span className="truncate max-w-[110px]">{s.flag}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <span className="px-3 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-purple-700 shadow-2xs inline-flex items-center gap-1">
                            <span>Math Profile</span>
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
        )}

        {/* ========================================================== */}
        {/* 3. TAB 2: SUBJECT CURRICULUM CHAPTERS PROGRESS             */}
        {/* ========================================================== */}
        {activeTab === 'curriculum' && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">
              NCERT Class 9 Mathematics Chapter Progression · {className}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Ch. 1: Number Systems</span>
                  <span className="text-emerald-700">78% · Secure</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[78%]" />
                </div>
                <p className="text-[11px] text-slate-400">All 6 core lectures completed · Diagnostic pre-test cleared</p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/90 bg-white space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>Ch. 2: Polynomials</span>
                  <span className="text-blue-700">62% · Proficient</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-[62%]" />
                </div>
                <p className="text-[11px] text-slate-400">Zeros of a polynomial and remainder theorem assessed</p>
              </div>

              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/40 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-purple-900">Ch. 4: Linear Equations (Active Unit)</span>
                  <span className="text-purple-800">46% · Developing</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full w-[46%]" />
                </div>
                <p className="text-[11px] text-purple-700">Currently covering: Solution graphs and variable transposition</p>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-rose-900">Fractions & Decimals (Remedial Target)</span>
                  <span className="text-rose-800">42% · Needs Support</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-[42%]" />
                </div>
                <p className="text-[11px] text-rose-700">Targeted intervention assigned for 6 students with denominator errors</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* 4. TAB 3: FULL MASTERY HEATMAP MATRIX                      */}
        {/* ========================================================== */}
        {activeTab === 'heatmap' && (
          <div className="space-y-4">
            <MasteryHeatmap topics={topics} rows={rows} />
          </div>
        )}
      </main>
    </>
  )
}
