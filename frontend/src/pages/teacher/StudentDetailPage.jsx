import { useState, useMemo, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { masteryService } from '../../services/masteryService'
import { studentsService } from '../../services/studentsService'
import { topicsService } from '../../services/topicsService'

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)

  const contextParam = searchParams.get('view')
  const classIdParam = searchParams.get('classId')

  const [profileMode, setProfileMode] = useState(
    contextParam === 'homeroom' ? 'homeroom' : 'subject'
  )

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteVisibleToStudent, setNoteVisibleToStudent] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTopicId, setAssignTopicId] = useState('')
  const [assignTitle, setAssignTitle] = useState('')
  const [assignMessage, setAssignMessage] = useState('')
  const [savingAssign, setSavingAssign] = useState(false)

  const [actionNotice, setActionNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  const profileApi = useApi(() => studentsService.getProfile(studentId), [studentId])
  const topicsApi = useApi(() => topicsService.listAll(), [])

  const topicsList = useMemo(() => topicsApi.data || [], [topicsApi.data])
  useEffect(() => {
    if (!assignTopicId && topicsList.length > 0) {
      setAssignTopicId(String(topicsList[0].id))
      setAssignTitle(`Targeted Practice: ${topicsList[0].title}`)
    }
  }, [topicsList, assignTopicId])

  const data = profileApi.data
  const student = data?.student
  const subjectScores = useMemo(() => data?.subject_scores || [], [data])
  const calendarDays = useMemo(() => data?.calendar_days || [], [data])
  const recentActivities = useMemo(() => data?.recent_activities || [], [data])
  const lessonProgression = useMemo(() => data?.lesson_progression || [], [data])
  const notes = useMemo(() => data?.notes || [], [data])
  const interventions = useMemo(() => data?.interventions || [], [data])
  const errorFlags = useMemo(() => data?.error_flags || [], [data])

  const overallGpa = useMemo(() => {
    const scored = subjectScores.filter((s) => (s.mastery || 0) > 0)
    if (scored.length === 0) return 0
    return Math.round(scored.reduce((acc, s) => acc + s.mastery, 0) / scored.length)
  }, [subjectScores])

  const calendarStats = useMemo(() => {
    const totalMins = calendarDays.reduce((acc, d) => acc + (d.mins || 0), 0)
    const activeDays = calendarDays.filter((d) => (d.mins || 0) > 0).length
    return { totalMins, activeDays }
  }, [calendarDays])

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    setActionError(null)
    try {
      await studentsService.addNote(studentId, {
        comment_text: noteText.trim(),
        is_visible_to_student: noteVisibleToStudent,
      })
      setNoteOpen(false)
      setNoteText('')
      setNoteVisibleToStudent(false)
      setActionNotice('Teacher feedback note saved to database.')
      profileApi.refetch()
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err) {
      setActionError(err.message || 'Could not save note.')
    } finally {
      setSavingNote(false)
    }
  }

  async function submitAssign(e) {
    e.preventDefault()
    setSavingAssign(true)
    setActionError(null)
    try {
      await studentsService.assignPractice(studentId, {
        topic_id: assignTopicId ? Number(assignTopicId) : undefined,
        title: assignTitle.trim() || undefined,
        message: assignMessage.trim() || undefined,
      })
      setAssignOpen(false)
      setAssignMessage('')
      setActionNotice('Targeted practice task assigned to student.')
      profileApi.refetch()
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err) {
      setActionError(err.message || 'Could not assign practice.')
    } finally {
      setSavingAssign(false)
    }
  }

  async function handleReviewFlag(flagId, decision) {
    setActionError(null)
    try {
      await masteryService.reviewErrorPattern(flagId, {
        decision,
        comments: `Teacher marked suspected error flag as ${decision}.`,
      })
      setActionNotice(`Error pattern flag marked as ${decision}.`)
      profileApi.refetch()
      setTimeout(() => setActionNotice(null), 3500)
    } catch (err) {
      setActionError(err.message || 'Could not update error pattern flag.')
    }
  }

  const backHref = classIdParam ? `/teacher/classes/${classIdParam}` : '/teacher/my-class'
  const backLabel = classIdParam ? '← Back to Class Roster' : '← Back to My Class'

  return (
    <>
      <Topbar
        title={student ? `${student.name} · Academic Profile Review` : 'Student Academic Profile'}
        breadcrumb="Teacher / Student Profile"
        subtitle={
          student
            ? `${student.class_name || 'Enrolled Cohort'} · ID: ${student.public_id || `#${student.id}`}`
            : 'Loading student telemetry...'
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={backHref}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
            >
              {backLabel}
            </Link>
            <button
              type="button"
              disabled={!student}
              onClick={() => setAssignOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>+</span>
              <span>Assign Practice Drill</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {actionNotice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-emerald-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900 flex items-center justify-between shadow-xs">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-700 font-bold">✕</button>
          </div>
        )}

        {profileApi.status === 'loading' && (
          <LoadingState label="Loading student academic profile..." rows={6} />
        )}
        {profileApi.status === 'error' && (
          <ErrorState message={profileApi.error.message} onRetry={profileApi.refetch} />
        )}

        {profileApi.status === 'success' && student && (
          <>
            {/* 1. STUDENT IDENTITY BANNER */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-display font-black text-2xl shadow-sm shadow-blue-500/25 shrink-0">
                  {student.name
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-black text-slate-900 tracking-tight">
                      {student.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {student.class_name || 'Unassigned'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {overallGpa}% Overall Mastery
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Student ID: <strong className="text-slate-800 font-mono">{student.public_id}</strong> ·{' '}
                    {student.email}
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setProfileMode('subject')}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    profileMode === 'subject'
                      ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📐</span>
                  <span>Topic & Activity Detail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProfileMode('homeroom')}
                  className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    profileMode === 'homeroom'
                      ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>👑</span>
                  <span>All Subjects ({subjectScores.length})</span>
                </button>
              </div>
            </div>

            {/* 2. ALL SUBJECTS VIEW */}
            {profileMode === 'homeroom' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {subjectScores.map((subj) => {
                    const score = Math.round(subj.mastery || 0)
                    return (
                      <div
                        key={subj.subject_id}
                        className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-2"
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {subj.subject}
                        </div>
                        <div className="font-display text-2xl font-black text-blue-700">{score}%</div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 60 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {score >= 80
                            ? 'Secure'
                            : score >= 60
                            ? 'Proficient'
                            : score >= 40
                            ? 'Developing'
                            : score > 0
                            ? 'Needs strong support'
                            : 'Unassessed'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 3. TOPIC & ACTIVITY DETAIL VIEW */}
            {profileMode === 'subject' && (
              <div className="space-y-6">
                {/* 30-Day Activity Heatmap & Recent Sessions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span className="text-base">📊</span>
                        <h3 className="font-display text-sm font-bold text-slate-900">
                          30-Day Study Summary
                        </h3>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Active Study Days (30d)</span>
                        <div className="font-display font-black text-xl text-slate-900 mt-0.5">
                          {calendarStats.activeDays} days
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Total Logged Minutes (30d)</span>
                        <div className="font-display font-black text-xl text-blue-700 mt-0.5">
                          {calendarStats.totalMins} mins
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium">Active Interventions</span>
                        <div className="font-bold text-slate-800 mt-0.5">{interventions.length}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setNoteOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        + Add Teacher Feedback Note
                      </button>
                      <span className="text-[10px] text-slate-400">Notes: {notes.length}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-2 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">📅</span>
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900">
                            30-Day Practice & Session Tracker
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Day-by-day recorded study session minutes
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 40m+
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" /> 1–39m
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Inactive
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                        {calendarDays.map((d) => (
                          <div
                            key={d.date}
                            title={`${d.date}: ${d.mins} minutes`}
                            className={`h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              d.status === 'high'
                                ? 'bg-emerald-500 text-white'
                                : d.status === 'med'
                                ? 'bg-amber-300 text-slate-900'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {d.day}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 border-t md:border-t-0 md:border-l md:border-slate-100 md:pl-5">
                        <div className="text-xs font-bold text-slate-700">Recent Study Sessions</div>
                        {recentActivities.length === 0 ? (
                          <p className="text-xs text-slate-400">No study sessions logged yet.</p>
                        ) : (
                          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                            {recentActivities.slice(0, 6).map((act) => (
                              <div key={act.id} className="text-xs space-y-0.5">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{act.date}</span>
                                  <span className="font-bold text-slate-700">{act.duration}m</span>
                                </div>
                                <div className="font-semibold text-slate-800 truncate">{act.title}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chapter / Topic Progression */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>📚</span>
                        <span>Topic Mastery & Resource Progression</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Calculated mastery score, explainable band, and reviewed resources per chapter
                      </p>
                    </div>
                  </div>

                  {lessonProgression.length === 0 ? (
                    <EmptyState title="No topics tracked yet" description="Topics appear once curriculum chapters exist." />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lessonProgression.map((lec) => {
                        const mastery = Math.round(lec.mastery || 0)
                        return (
                          <div
                            key={lec.topic_id}
                            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    lec.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : lec.status === 'in_progress'
                                      ? 'bg-purple-100 text-purple-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {lec.status.replace('_', ' ')}
                                </span>
                                <h4 className="font-display text-sm font-bold text-slate-900">
                                  {lec.chapter}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-500">
                                Resources viewed: {lec.resources_viewed} / {lec.total_resources}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="w-24 text-right">
                                <div className="text-xs font-bold text-slate-800">{mastery}%</div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                                  <div
                                    className={`h-full rounded-full ${
                                      mastery >= 70 ? 'bg-emerald-500' : 'bg-purple-600'
                                    }`}
                                    style={{ width: `${mastery}%` }}
                                  />
                                </div>
                              </div>

                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {lec.band}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Error Flags, Interventions & Teacher Notes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Error Flags & Interventions */}
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Error Pattern Flags &amp; Interventions
                    </h3>

                    {errorFlags.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        No suspected recurrent error pattern flags recorded for this student.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {errorFlags.map((flag) => (
                          <div
                            key={flag.id}
                            className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-rose-900">
                                Suspected pattern: {flag.tag_name}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white text-rose-800 border border-rose-200 text-[10px] font-bold uppercase">
                                {flag.status}
                              </span>
                            </div>
                            <p className="text-rose-800">
                              {flag.topic ? `Topic: ${flag.topic} · ` : ''}Matched evidence count:{' '}
                              {flag.match_count}
                            </p>
                            {flag.status === 'suspected' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleReviewFlag(flag.id, 'confirmed')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewFlag(flag.id, 'dismissed')}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        Assigned Interventions ({interventions.length})
                      </div>
                      {interventions.length === 0 ? (
                        <p className="text-xs text-slate-400">No interventions assigned to this student yet.</p>
                      ) : (
                        interventions.map((inv) => (
                          <Link
                            key={inv.id}
                            to={`/teacher/interventions/${inv.id}`}
                            className="block p-3 rounded-xl border border-slate-200 hover:border-blue-300 text-xs transition-colors"
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{inv.title}</span>
                              <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-slate-500 mt-1">
                              {inv.topic || 'General'} · Baseline:{' '}
                              {inv.before_mastery != null ? `${Math.round(inv.before_mastery)}%` : '—'} → Post:{' '}
                              {inv.after_mastery != null ? `${Math.round(inv.after_mastery)}%` : 'Pending'}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Teacher Notes */}
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Teacher Feedback &amp; Observation Notes
                      </h3>
                      <button
                        type="button"
                        onClick={() => setNoteOpen(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        + Add Note
                      </button>
                    </div>

                    {notes.length === 0 ? (
                      <p className="text-xs text-slate-400">No teacher feedback notes recorded yet.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-96 overflow-y-auto">
                        {notes.map((n) => (
                          <div
                            key={n.id}
                            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 space-y-1"
                          >
                            <p>{n.comment}</p>
                            <div className="text-[10px] text-slate-400 flex items-center justify-between">
                              <span>
                                By {n.teacher_name} · {new Date(n.created_at).toLocaleDateString()}
                              </span>
                              <span>
                                {n.is_visible_to_student ? 'Visible to student' : 'Private teacher note'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal: Add Teacher Note */}
      {noteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={submitNote}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Add Teacher Feedback Note
            </h3>
            <p className="text-xs text-slate-500">
              Record observations or targeted scaffolding guidance for {student?.name}.
            </p>
            <textarea
              rows={4}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record observations, scaffolding tips, or verbal feedback provided..."
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={noteVisibleToStudent}
                onChange={(e) => setNoteVisibleToStudent(e.target.checked)}
              />
              <span>Share this feedback note with the student</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingNote || !noteText.trim()}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingNote ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Assign Practice Drill */}
      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <form
            onSubmit={submitAssign}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-slate-900">
              Assign Targeted Practice Drill
            </h3>
            <p className="text-xs text-slate-500">
              Assign a persistent practice recommendation directly to {student?.name}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Topic</label>
                <select
                  value={assignTopicId}
                  onChange={(e) => {
                    const id = e.target.value
                    setAssignTopicId(id)
                    const topicObj = topicsList.find((t) => String(t.id) === id)
                    if (topicObj) setAssignTitle(`Targeted Practice: ${topicObj.title}`)
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                >
                  {topicsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Linear Equations Two-Step Isolation Drill"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Instructions</label>
                <textarea
                  rows={2}
                  value={assignMessage}
                  onChange={(e) => setAssignMessage(e.target.value)}
                  placeholder="Optional guidance note sent as a study reminder..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAssign}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingAssign ? 'Assigning…' : 'Assign Drill'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
