import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../services/adminService'
import { classesService } from '../../services/classesService'
import { studentsService } from '../../services/studentsService'

export default function StudentEnrollmentPage() {
  const [studentId, setStudentId] = useState('')
  const [classId, setClassId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const studentsApi = useApi(() => studentsService.listAll(), [])
  const classesApi = useApi(() => classesService.listAll(), [])

  const loading = studentsApi.status === 'loading' || classesApi.status === 'loading'
  const loadError = studentsApi.error || classesApi.error

  async function handleEnroll() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await adminService.enrollStudent({
        student_id: Number(studentId),
        class_id: Number(classId),
      })
      setSaved(true)
      studentsApi.refetch()
      classesApi.refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Student enrollment" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        {loading && <LoadingState label="Loading students and classes" rows={3} />}
        {loadError && <ErrorState message={loadError.message} />}

        {!loading && !loadError && (
          <>
            <Panel accent="teal">
              <PanelHeader title="Enrol a student in a class" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Student" htmlFor="enrollStudent">
                  <Select id="enrollStudent" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Select a student</option>
                    {studentsApi.data?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.class_name || 'Unassigned'})
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Class" htmlFor="enrollClass">
                  <Select id="enrollClass" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    <option value="">Select a class</option>
                    {classesApi.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.student_count ?? 0} students)
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
              {saveError && <p className="mb-3 text-sm text-rose-600">{saveError}</p>}
              {saved && <p className="mb-3 text-sm text-emerald-700">Student enrolled.</p>}
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !studentId || !classId}
                onClick={handleEnroll}
              >
                {saving ? 'Enrolling…' : 'Enrol student'}
              </button>
            </Panel>

            <Panel>
              <PanelHeader title="Current student placements" subtitle="Live enrollment directory" />
              <Table columns={['ID', 'Student', 'Email', 'Enrolled Classes']}>
                {(studentsApi.data || []).map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.public_id || `#${s.id}`}</td>
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2 text-slate-500">{s.email}</td>
                    <td className="px-3 py-2">
                      {Array.isArray(s.enrolled_classes) && s.enrolled_classes.length > 0
                        ? s.enrolled_classes.join(', ')
                        : s.class_name || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </>
        )}
      </main>
    </>
  )
}
