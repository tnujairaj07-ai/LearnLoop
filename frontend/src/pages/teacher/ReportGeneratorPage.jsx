import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select } from '../../components/ui/FormField'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { classesService } from '../../services/classesService'
import { studentsService } from '../../services/studentsService'
import { reportsService } from '../../services/reportsService'

export default function ReportGeneratorPage() {
  const { user } = useAuth()
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState('')
  const [reportType, setReportType] = useState('class')
  const [downloadMode, setDownloadMode] = useState('batch')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [result, setResult] = useState(null)

  const classesApi = useApi(() => classesService.listForTeacher(user?.id), [user?.id])
  const activeClassId = classId || classesApi.data?.[0]?.id
  const studentsApi = useApi(() => studentsService.listForClass(activeClassId), [activeClassId], {
    skip: !activeClassId || reportType !== 'individual',
  })

  function toggleStudent(id) {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  async function handleGenerate() {
    setGenerating(true)
    setGenError(null)
    setResult(null)
    try {
      const payload = { classId: activeClassId, term }
      const response =
        reportType === 'class'
          ? await reportsService.generateClassReport(payload)
          : await reportsService.generateStudentReports({
              ...payload,
              studentIds: selectedStudents.length ? selectedStudents : undefined,
              mode: downloadMode,
            })
      setResult(response)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Topbar title="Report generator" breadcrumb="Teacher" />
      <main className="flex-1 space-y-6 p-6">
        {classesApi.status === 'loading' && <LoadingState label="Loading classes" rows={2} />}
        {classesApi.status === 'error' && <ErrorState message={classesApi.error.message} onRetry={classesApi.refetch} />}

        {classesApi.status === 'success' && (
          <Panel accent="teal">
            <PanelHeader title="Generate a report" subtitle="Traditional marks plus mastery analytics, ready for the backend PDF service" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Class" htmlFor="reportClass">
                <Select id="reportClass" value={activeClassId} onChange={(e) => setClassId(e.target.value)}>
                  {classesApi.data.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.subjectName}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Term / period" htmlFor="reportTerm">
                <Select id="reportTerm" value={term} onChange={(e) => setTerm(e.target.value)}>
                  <option value="">Select a term</option>
                  <option value="term-1">Term 1</option>
                  <option value="term-2">Term 2</option>
                  <option value="term-3">Term 3</option>
                  <option value="full-year">Full year</option>
                </Select>
              </FormField>
              <FormField label="Report type" htmlFor="reportType">
                <Select id="reportType" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="class">Class-level report</option>
                  <option value="individual">Individual student report cards</option>
                </Select>
              </FormField>
            </div>

            {reportType === 'individual' && (
              <>
                <FormField label="Download" htmlFor="downloadMode">
                  <Select id="downloadMode" value={downloadMode} onChange={(e) => setDownloadMode(e.target.value)}>
                    <option value="batch">Batch download (all at once)</option>
                    <option value="one-by-one">One-by-one</option>
                  </Select>
                </FormField>

                {studentsApi.status === 'loading' && <LoadingState rows={3} />}
                {studentsApi.status === 'error' && <ErrorState message={studentsApi.error.message} onRetry={studentsApi.refetch} />}
                {studentsApi.isEmpty && <EmptyState title="No students enrolled in this class" />}
                {studentsApi.status === 'success' && !studentsApi.isEmpty && (
                  <div className="mb-4 max-h-48 overflow-y-auto rounded border border-border p-2">
                    {studentsApi.data.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                        <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />
                        {s.name}
                      </label>
                    ))}
                    <p className="px-2 pt-1 text-xs text-ink-faint">Leave all unchecked to include the whole class.</p>
                  </div>
                )}
              </>
            )}

            {genError && <p className="mb-3 text-sm text-clay-700">{genError}</p>}
            {result && (
              <p className="mb-3 text-sm text-teal-700">
                Report requested. {result.downloadUrl ? 'It will be ready to download shortly.' : 'Check back for status.'}
              </p>
            )}
            <button type="button" className="btn btn-primary" onClick={handleGenerate} disabled={generating || !term}>
              {generating ? 'Generating…' : 'Generate report'}
            </button>
          </Panel>
        )}
      </main>
    </>
  )
}
