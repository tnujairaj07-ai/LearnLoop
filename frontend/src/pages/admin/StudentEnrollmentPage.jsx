import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select } from '../../components/ui/FormField'
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
      await adminService.enrollStudent({ studentId, classId })
      setSaved(true)
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
          <Panel accent="teal">
            <PanelHeader title="Enrol a student in a class" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Student" htmlFor="enrollStudent">
                <Select id="enrollStudent" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">Select a student</option>
                  {studentsApi.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Class" htmlFor="enrollClass">
                <Select id="enrollClass" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Select a class</option>
                  {classesApi.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            {saveError && <p className="mb-3 text-sm text-clay-700">{saveError}</p>}
            {saved && <p className="mb-3 text-sm text-teal-700">Student enrolled.</p>}
            <button type="button" className="btn btn-primary" disabled={saving || !studentId || !classId} onClick={handleEnroll}>
              {saving ? 'Enrolling…' : 'Enrol student'}
            </button>
          </Panel>
        )}
      </main>
    </>
  )
}
