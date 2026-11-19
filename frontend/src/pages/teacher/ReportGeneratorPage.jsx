import { useState, useMemo, useEffect } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { studentsService } from '../../services/studentsService'
import { subjectsService } from '../../services/subjectsService'
import { reportsService } from '../../services/reportsService'
import { groupTeacherClasses, pickDefaultSubject } from '../../lib/teacherHelpers'

function normalizeBandKey(category) {
  const c = (category || '').toLowerCase()
  if (c.includes('support') || c.includes('strong')) return 'support'
  if (c.includes('develop')) return 'developing'
  if (c.includes('proficient')) return 'proficient'
  return 'secure'
}

export default function ReportGeneratorPage() {
  const { user } = useAuth()
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [termLabel, setTermLabel] = useState('Term 1')
  const [reportType, setReportType] = useState('individual')
  const [studentStatusFilter, setStudentStatusFilter] = useState('all')
  const [searchStudent, setSearchStudent] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [compiledResult, setCompiledResult] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewReport, setPreviewReport] = useState(null)

  const classesApi = useApi(() => classesService.listForTeacher(), [])
  const subjectsApi = useApi(() => subjectsService.listAll(), [])

  const assignedClasses = useMemo(() => classesApi.data || [], [classesApi.data])
  const uniqueClasses = useMemo(() => groupTeacherClasses(assignedClasses), [assignedClasses])
  const subjects = useMemo(() => subjectsApi.data || [], [subjectsApi.data])

  useEffect(() => {
    if (!classId && uniqueClasses.length > 0) {
      setClassId(String(uniqueClasses[0].class_id))
      if (uniqueClasses[0].subject_id) {
        setSubjectId(String(uniqueClasses[0].subject_id))
      }
    }
  }, [uniqueClasses, classId])

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      const defSubj = pickDefaultSubject(subjects)
      if (defSubj) setSubjectId(String(defSubj.id))
    }
  }, [subjects, subjectId])

  const activeClassId = classId ? Number(classId) : uniqueClasses[0]?.class_id || null
  const activeSubjectId = subjectId ? Number(subjectId) : pickDefaultSubject(subjects)?.id || null

  const studentsApi = useApi(
    () => studentsService.listForClass(activeClassId),
    [activeClassId],
    { skip: !activeClassId }
  )

  const studentRoster = useMemo(() => studentsApi.data || [], [studentsApi.data])

  const filteredStudents = useMemo(() => {
    const q = searchStudent.toLowerCase().trim()
    return studentRoster.filter((s) => {
      const bandKey = normalizeBandKey(s.support_category)
      const matchStatus = studentStatusFilter === 'all' || bandKey === studentStatusFilter
      const matchSearch =
        !q ||
        s.student_name.toLowerCase().includes(q) ||
        (s.student_email && s.student_email.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [studentRoster, studentStatusFilter, searchStudent])

  function toggleStudent(id) {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    setSelectedStudents(filteredStudents.map((s) => s.student_id))
  }

  function handleClearSelection() {
    setSelectedStudents([])
  }

  async function handleGenerate() {
    if (!activeClassId || !activeSubjectId) return
    setGenerating(true)
    setGenError(null)
    setCompiledResult(null)
    try {
      if (reportType === 'class') {
        const res = await reportsService.generateClassReport(activeClassId, {
          subject_id: activeSubjectId,
          term_label: termLabel,
          report_type: 'class',
        })
        setCompiledResult({ kind: 'class', report: res })
      } else {
        const ids =
          selectedStudents.length > 0
            ? selectedStudents
            : studentRoster.map((s) => s.student_id)
        const res = await reportsService.generateStudentReports({
          subject_id: activeSubjectId,
          term_label: termLabel,
          report_type: 'student',
          class_id: activeClassId,
          student_ids: ids,
        })
        setCompiledResult({ kind: 'individual', ...res })
      }
    } catch (err) {
      setGenError(err.message || 'Could not compile report cards.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleInspectStudent(studentId) {
    if (!activeSubjectId) return
    setPreviewLoading(true)
    setGenError(null)
    try {
      const cached = compiledResult?.reports?.find((r) => r.student_id === studentId)
      if (cached) {
        setPreviewReport(cached)
      } else {
        const rep = await reportsService.generateStudentReport(studentId, {
          subject_id: activeSubjectId,
          term_label: termLabel,
          report_type: 'student',
        })
        setPreviewReport(rep)
      }
    } catch (err) {
      setGenError(err.message || 'Could not load student report preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  function handleDownloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const previewPayload = previewReport?.payload || null
  const previewProfile = previewPayload?.student_profile || {}
  const previewTraditional = previewPayload?.traditional_report || {}
  const previewAnalytics = previewPayload?.analytics_report || {}

  return (
    <>
      <Topbar
        title="Learning Analytics & Report Generator"
        breadcrumb="Teacher / Reporting"
        subtitle="Compile persisted mastery report cards, pre/post learning gains, and cohort analytics summaries"
        actions={
          studentRoster.length > 0 && (
            <button
              type="button"
              disabled={previewLoading}
              onClick={() => handleInspectStudent(studentRoster[0].student_id)}
              className="px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <span>👁️</span>
              <span>{previewLoading ? 'Loading…' : 'Preview First Student'}</span>
            </button>
          )
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {genError && <ErrorState message={genError} />}

        {classesApi.status === 'loading' && <LoadingState label="Loading classes..." rows={4} />}
        {classesApi.status === 'error' && (
          <ErrorState message={classesApi.error.message} onRetry={classesApi.refetch} />
        )}

        {classesApi.status === 'success' && assignedClasses.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <EmptyState
              title="No classes assigned yet"
              description="Once an administrator assigns you to a class and subject, you can generate live student and class reports."
            />
          </div>
        )}

        {assignedClasses.length > 0 && (
          <>
            {/* 1. REPORT SCOPE & TYPE SELECTION */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-display text-base font-bold text-slate-900">
                  1. Report Scope &amp; Parameters
                </h2>
                <p className="text-xs text-slate-500">
                  Select class cohort, subject, and term label to compile real SQL-persisted reports
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Class Cohort
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    value={activeClassId || ''}
                    onChange={(e) => {
                      setClassId(e.target.value)
                      setSelectedStudents([])
                      const matched = assignedClasses.find(
                        (c) => String(c.class_id) === e.target.value
                      )
                      if (matched?.subject_id) setSubjectId(String(matched.subject_id))
                    }}
                  >
                    {uniqueClasses.map((c) => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.class_name} · {c.subjects.join(', ') || 'Class'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Subject
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    value={activeSubjectId || ''}
                    onChange={(e) => setSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assessment Term / Cycle
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-hidden"
                    value={termLabel}
                    onChange={(e) => setTermLabel(e.target.value)}
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Unit Test 1">Unit Test 1</option>
                    <option value="Unit Test 2">Unit Test 2</option>
                    <option value="Half Yearly">Half Yearly</option>
                    <option value="Final Term">Final Term</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Report Architecture
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setReportType('individual')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      reportType === 'individual'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>🎓</span>
                        <span>Individual Diagnostic Report Cards</span>
                      </span>
                      <input
                        type="radio"
                        name="reportTypeRadio"
                        checked={reportType === 'individual'}
                        onChange={() => setReportType('individual')}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Combines traditional subject grades with 4-part explainable mastery decomposition, learning gains, and misconception flags.
                    </p>
                  </div>

                  <div
                    onClick={() => setReportType('class')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      reportType === 'class'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>📊</span>
                        <span>Class-Level Cohort Intelligence Report</span>
                      </span>
                      <input
                        type="radio"
                        name="reportTypeRadio"
                        checked={reportType === 'class'}
                        onChange={() => setReportType('class')}
                        className="w-4 h-4 text-blue-600"
                      />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Aggregates cohort mastery, band distribution, common error patterns, and teacher intervention outcomes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. STUDENT ROSTER SELECTION (INDIVIDUAL MODE) */}
            {reportType === 'individual' && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900">
                      2. Select Students (
                      {selectedStudents.length > 0
                        ? `${selectedStudents.length} selected`
                        : `All ${studentRoster.length} enrolled`}
                      )
                    </h2>
                    <p className="text-xs text-slate-500">
                      Choose specific learners or compile report cards for the entire cohort
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {[
                      { id: 'all', label: 'All Learners' },
                      { id: 'support', label: 'Needs Support' },
                      { id: 'developing', label: 'Developing' },
                      { id: 'proficient', label: 'Proficient' },
                      { id: 'secure', label: 'Secure' },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setStudentStatusFilter(pill.id)}
                        className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          studentStatusFilter === pill.id
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative max-w-xs w-full">
                    <input
                      type="text"
                      placeholder="Filter student by name..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:outline-hidden"
                    />
                    <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">🔍</span>
                  </div>
                </div>

                {studentsApi.status === 'loading' && <LoadingState label="Loading students..." rows={3} />}
                {studentsApi.status === 'success' && filteredStudents.length === 0 && (
                  <EmptyState
                    title="No students in view"
                    description="No enrolled students match this filter."
                  />
                )}

                {filteredStudents.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                    {filteredStudents.map((s) => {
                      const isChecked = selectedStudents.includes(s.student_id)
                      return (
                        <div
                          key={s.student_id}
                          onClick={() => toggleStudent(s.student_id)}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-blue-500 bg-blue-50/40 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0 cursor-pointer"
                            />
                            <div className="truncate">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {s.student_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Mastery:{' '}
                                <strong className="text-slate-800">
                                  {Math.round(s.average_mastery || 0)}%
                                </strong>{' '}
                                · {s.support_category}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleInspectStudent(s.student_id)
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors shrink-0 cursor-pointer"
                          >
                            Preview
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. GENERATION ACTION */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Compile &amp; Persist Reports
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregates assessment scores, 4-component mastery weights, and intervention outcomes into SQL report records.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  generating ||
                  !activeClassId ||
                  !activeSubjectId ||
                  (reportType === 'individual' && studentRoster.length === 0)
                }
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Compiling Reports...</span>
                  </>
                ) : (
                  <>
                    <span>📥</span>
                    <span>
                      Generate{' '}
                      {reportType === 'class' ? 'Cohort Analytics Report' : 'Student Report Cards'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Result Banner */}
            {compiledResult && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      ✓
                    </span>
                    <div>
                      <h4 className="font-display text-sm font-bold text-emerald-950">
                        {compiledResult.kind === 'class'
                          ? 'Cohort Intelligence Report Saved'
                          : `${compiledResult.count} Student Report Card(s) Saved`}
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Term: {termLabel} · Persisted to database for teacher and student inspection.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {compiledResult.kind === 'individual' && compiledResult.reports?.[0] && (
                      <button
                        type="button"
                        onClick={() => setPreviewReport(compiledResult.reports[0])}
                        className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-xs font-bold text-emerald-900 transition-colors cursor-pointer"
                      >
                        Inspect First Report Card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadJson(
                          `learnloop-${compiledResult.kind}-report-${termLabel.replace(/\s+/g, '_')}.json`,
                          compiledResult
                        )
                      }
                      className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      Download JSON Export
                    </button>
                  </div>
                </div>

                {compiledResult.kind === 'class' && compiledResult.report?.payload && (
                  <div className="rounded-xl bg-white border border-emerald-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Enrolled Students</span>
                      <strong className="text-base text-slate-900">
                        {compiledResult.report.payload.class_profile?.total_students ??
                          compiledResult.report.payload.class_summary?.total_students ??
                          0}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Class Average Mastery</span>
                      <strong className="text-base text-blue-700">
                        {Math.round(
                          compiledResult.report.payload.class_summary?.average_topic_mastery ??
                            compiledResult.report.payload.class_summary?.average_mastery ??
                            0
                        )}
                        %
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Average Accuracy</span>
                      <strong className="text-base text-slate-900">
                        {Math.round(
                          compiledResult.report.payload.class_summary?.average_accuracy_percentage ?? 0
                        )}
                        %
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Report ID</span>
                      <strong className="text-base text-slate-900">
                        #{compiledResult.report.report_id}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* REAL REPORT CARD PREVIEW MODAL */}
      {previewReport && previewPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs print:bg-white print:p-0">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  LearnLoop Diagnostic Transcript
                </span>
                <span className="text-xs text-slate-400">
                  {previewPayload.subject?.name} ({previewPayload.subject?.code})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div>
                  <h3 className="font-display text-lg font-black text-slate-900">
                    {previewProfile.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewProfile.class_name || 'Enrolled Cohort'} · {previewProfile.email}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {previewTraditional.term_label || termLabel}
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    Academic Year {previewProfile.academic_year || 'Current'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Overall Accuracy
                  </div>
                  <div className="font-display text-lg font-black text-slate-700">
                    {Math.round(previewTraditional.overall_accuracy_percentage || 0)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Subject Mastery
                  </div>
                  <div className="font-display text-lg font-black text-blue-700">
                    {Math.round(previewTraditional.overall_mastery_score || 0)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Attempts / Practice
                  </div>
                  <div className="font-display text-lg font-black text-emerald-900">
                    {previewTraditional.total_assessments_completed ?? 0} /{' '}
                    {previewTraditional.practice_sessions_completed ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Topic Mastery Decomposition */}
            <div className="space-y-3">
              <h4 className="font-display text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Topic Competency &amp; 4-Component Mastery</span>
                <span className="font-mono text-[10px] font-bold text-blue-700">
                  {previewAnalytics.explainable_mastery_formula}
                </span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {(previewAnalytics.topic_mastery_decomposition || []).map((ts) => (
                  <div key={ts.topic_id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span>{ts.title}</span>
                      <span className="text-blue-700">
                        {Math.round(ts.mastery_score || 0)}% · {ts.band_label}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${Math.round(ts.mastery_score || 0)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Acc: {Math.round(ts.components?.accuracy || 0)}%</span>
                      <span>Diff: {Math.round(ts.components?.difficulty || 0)}%</span>
                      <span>Rec: {Math.round(ts.components?.recency || 0)}%</span>
                      <span>Trend: {Math.round(ts.components?.trend || 0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Remarks &amp; Recommended Next Steps
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {previewTraditional.teacher_remarks} {previewAnalytics.next_steps_guidance}
              </p>
              <div className="flex justify-between items-end pt-3 text-xs text-slate-500 border-t border-slate-200">
                <div>
                  Prepared by: <strong className="text-slate-800">{user?.name || 'Educator'}</strong>
                </div>
                <div className="font-mono text-[10px]">Report #{previewReport.report_id}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewReport(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs cursor-pointer"
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
