import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { analyticsService } from '../../services/analyticsService'

export default function MyClassPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [isEditingNotice, setIsEditingNotice] = useState(false)
  const [editedNotice, setEditedNotice] = useState('')
  const [savingNotice, setSavingNotice] = useState(false)
  const [noticeError, setNoticeError] = useState(null)
  const [attendanceSavingId, setAttendanceSavingId] = useState(null)

  const { status, data, error, refetch } = useApi(() => analyticsService.myClass(), [])

  const homeroomClass = data?.homeroom_class || null
  const students = useMemo(() => data?.students || [], [data])
  const announcementMessage = data?.announcement?.message || ''

  useEffect(() => {
    if (!isEditingNotice) {
      setEditedNotice(announcementMessage)
    }
  }, [announcementMessage, isEditingNotice])

  const subjectNames = useMemo(() => {
    const names = new Set()
    students.forEach((s) => {
      Object.keys(s.subject_masteries || {}).forEach((subj) => names.add(subj))
    })
    return Array.from(names)
  }, [students])

  const subjectStats = useMemo(() => {
    return subjectNames.map((subj) => {
      const vals = students
        .map((s) => s.subject_masteries?.[subj])
        .filter((v) => typeof v === 'number')
      const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
      return { name: subj, avg }
    })
  }, [subjectNames, students])

  const kpis = useMemo(() => {
    if (students.length === 0) {
      return {
        avgMastery: 0,
        attendanceRate: 0,
        presentCount: 0,
        topSubject: null,
        lowestSubject: null,
      }
    }
    const avgMastery = Math.round(
      students.reduce((acc, s) => acc + (s.overall_mastery || 0), 0) / students.length
    )
    const presentCount = students.filter((s) => s.attendance === 'attended').length
    const attendanceRate = Math.round((presentCount / students.length) * 100)
    const sorted = [...subjectStats].sort((a, b) => b.avg - a.avg)
    return {
      avgMastery,
      attendanceRate,
      presentCount,
      topSubject: sorted[0] || null,
      lowestSubject: sorted[sorted.length - 1] || null,
    }
  }, [students, subjectStats])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.public_id && s.public_id.toLowerCase().includes(q))
    )
  }, [students, searchQuery])

  function getBandBadge(score) {
    if (score >= 80)
      return (
        <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
          Secure
        </span>
      )
    if (score >= 60)
      return (
        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
          Proficient
        </span>
      )
    if (score >= 40)
      return (
        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
          Developing
        </span>
      )
    return (
      <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
        Needs Support
      </span>
    )
  }

  async function handleSaveNotice() {
    if (!homeroomClass) return
    setSavingNotice(true)
    setNoticeError(null)
    try {
      await analyticsService.updateAnnouncement(homeroomClass.id, editedNotice)
      setIsEditingNotice(false)
      refetch()
    } catch (err) {
      setNoticeError(err.message || 'Could not save announcement.')
    } finally {
      setSavingNotice(false)
    }
  }

  async function handleToggleAttendance(e, student) {
    e.stopPropagation()
    if (!homeroomClass) return
    const nextStatus = student.attendance === 'attended' ? 'absent' : 'present'
    const todayIso = new Date().toISOString().slice(0, 10)
    setAttendanceSavingId(student.id)
    try {
      await analyticsService.recordAttendance(homeroomClass.id, {
        attendance_date: todayIso,
        records: [{ student_id: student.id, status: nextStatus }],
      })
      refetch()
    } catch (err) {
      setNoticeError(err.message || 'Could not update attendance.')
    } finally {
      setAttendanceSavingId(null)
    }
  }

  const classShortCode = homeroomClass
    ? `${homeroomClass.grade || ''}${homeroomClass.section || ''}` || homeroomClass.name.slice(0, 3)
    : 'MC'

  return (
    <>
      <Topbar
        title={homeroomClass ? `${homeroomClass.name} · Class Teacher Workspace` : 'My Class · Class Teacher Workspace'}
        breadcrumb="Teacher / My Class"
        subtitle="Overall class performance and progress across enrolled subjects"
        actions={
          <Link
            to="/teacher/classes"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
          >
            View Assigned Classes (Subject) →
          </Link>
        }
      />

      <main className="flex-1 space-y-7 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* 1. TOP SWITCHER PILL */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <span className="px-4 py-2 rounded-xl bg-white text-slate-900 shadow-2xs font-extrabold flex items-center gap-1.5">
              <span>👑</span>
              <span>
                My Class (Class Teacher){homeroomClass ? ` · ${homeroomClass.name}` : ''}
              </span>
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
            {data?.is_homeroom ? 'Homeroom Multi-Subject Visibility' : 'Primary Assigned Cohort'}
          </span>
        </div>

        {status === 'loading' && <LoadingState label="Loading homeroom class roster..." rows={5} />}
        {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}

        {status === 'success' && !homeroomClass && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No homeroom or assigned class yet"
              description="Once an administrator designates you as a homeroom teacher or assigns you a class, your multi-subject roster will appear here."
            />
          </div>
        )}

        {status === 'success' && homeroomClass && (
          <>
            {/* 2. CLASS TEACHER OVERVIEW HEADER CARD */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-display font-black text-xl shadow-sm shadow-blue-500/25 shrink-0">
                    <span>{classShortCode}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-2xl font-black text-slate-900">
                        {homeroomClass.name}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900">
                        {data.is_homeroom ? 'Homeroom Cohort' : 'Assigned Cohort'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Class Teacher: <strong>{user?.name || 'Educator'}</strong> · Academic Year{' '}
                      {homeroomClass.academic_year || '—'} · {students.length} Enrolled Students
                    </p>
                  </div>
                </div>

                <Link
                  to="/teacher/reports"
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                >
                  Compile Term Reports
                </Link>
              </div>

              {/* Class Announcement Banner */}
              <div className="rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    📢 Homeroom Class Notice Board
                  </span>
                  {!isEditingNotice ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedNotice(announcementMessage)
                        setIsEditingNotice(true)
                      }}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                    >
                      Edit Notice
                    </button>
                  ) : null}
                </div>
                {isEditingNotice ? (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={editedNotice}
                      onChange={(e) => setEditedNotice(e.target.value)}
                      placeholder="Write a class announcement visible to students in this cohort..."
                      className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingNotice(false)}
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingNotice || !editedNotice.trim()}
                        onClick={handleSaveNotice}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {savingNotice ? 'Saving…' : 'Save Notice'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {announcementMessage || 'No class announcement posted yet.'}
                  </p>
                )}
                {noticeError && <p className="text-xs text-rose-600">{noticeError}</p>}
              </div>

              {/* 4 Summary Multi-Subject KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Class Average Mastery
                  </div>
                  <div className="font-display text-2xl font-black text-slate-900 mt-1">
                    {kpis.avgMastery}%
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    Across assessed topics
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Today&rsquo;s Attendance
                  </div>
                  <div className="font-display text-2xl font-black text-emerald-700 mt-1">
                    {kpis.attendanceRate}%
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {kpis.presentCount} of {students.length} students active
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Highest Performing Subject
                  </div>
                  <div className="font-display text-xl font-black text-blue-700 mt-1 truncate">
                    {kpis.topSubject ? kpis.topSubject.name : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {kpis.topSubject ? `${kpis.topSubject.avg}% Average Mastery` : 'Awaiting mastery records'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Focus Area Subject
                  </div>
                  <div className="font-display text-xl font-black text-amber-700 mt-1 truncate">
                    {kpis.lowestSubject ? kpis.lowestSubject.name : '—'}
                  </div>
                  <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                    {kpis.lowestSubject ? `${kpis.lowestSubject.avg}% Mastery` : 'Awaiting mastery records'}
                  </div>
                </div>
              </div>

              {/* Cross-Subject Performance Bars */}
              {subjectStats.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Subject Mastery Overview ({subjectStats.length} active subjects)</span>
                    <span className="text-slate-400 font-normal text-[11px]">
                      Aggregated for {homeroomClass.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {subjectStats.map((subj) => (
                      <div key={subj.name} className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-800 truncate">{subj.name}</span>
                          <span className="text-blue-700">{subj.avg}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              subj.avg >= 60 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${subj.avg}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {subj.avg >= 80
                            ? 'Secure'
                            : subj.avg >= 60
                            ? 'Proficient'
                            : subj.avg >= 40
                            ? 'Developing'
                            : 'Needs Support'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. FULL ADMITTED STUDENTS ROSTER */}
            <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>👥</span>
                    <span>Enrolled Students Roster ({filteredStudents.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Toggle attendance directly or click any student row to view their multi-subject profile.
                  </p>
                </div>

                <div className="relative max-w-xs w-full">
                  <input
                    type="text"
                    placeholder="Search student or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:outline-hidden"
                  />
                  <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No students enrolled in this class yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">ID & Student Name</th>
                        <th className="px-3 py-3">Attendance</th>
                        {subjectNames.map((subj) => (
                          <th key={subj} className="px-3 py-3 text-center">
                            {subj}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center">Overall Mastery</th>
                        <th className="px-3 py-3 text-center">Latest Gain</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((s) => {
                        const isAttended = s.attendance === 'attended'
                        const overall = Math.round(s.overall_mastery || 0)
                        const gain = Math.round(s.latest_gain || 0)

                        return (
                          <tr
                            key={s.id}
                            onClick={() => navigate(`/teacher/students/${s.id}?view=homeroom`)}
                            className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                                  {s.name
                                    .split(' ')
                                    .map((p) => p[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{s.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {s.public_id || `#${s.id}`}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-3.5">
                              <button
                                type="button"
                                disabled={attendanceSavingId === s.id}
                                onClick={(e) => handleToggleAttendance(e, s)}
                                title="Click to toggle present/absent for today"
                                className="cursor-pointer disabled:opacity-50"
                              >
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
                              </button>
                            </td>

                            {subjectNames.map((subj) => {
                              const val = s.subject_masteries?.[subj]
                              const score = typeof val === 'number' ? Math.round(val) : null
                              return (
                                <td key={subj} className="px-3 py-3.5 text-center font-semibold">
                                  {score !== null ? (
                                    <>
                                      <div>{score}%</div>
                                      <div className="mt-0.5">{getBandBadge(score)}</div>
                                    </>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              )
                            })}

                            <td className="px-3 py-3.5 text-center">
                              <div className="font-display font-black text-slate-900 text-sm">
                                {overall}%
                              </div>
                              <div className="mt-0.5">{getBandBadge(overall)}</div>
                            </td>

                            <td className="px-3 py-3.5 text-center">
                              <span
                                className={`font-bold ${
                                  gain >= 0 ? 'text-emerald-700' : 'text-amber-700'
                                }`}
                              >
                                {gain >= 0 ? `+${gain}%` : `${gain}%`}
                              </span>
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
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
