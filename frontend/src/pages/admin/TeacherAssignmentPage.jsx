import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select } from '../../components/ui/FormField'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../services/adminService'
import { classesService } from '../../services/classesService'
import { subjectsService } from '../../services/subjectsService'

export default function TeacherAssignmentPage() {
  const [teacherId, setTeacherId] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)

  const teachersApi = useApi(() => adminService.listTeachers(), [])
  const classesApi = useApi(() => classesService.listAll(), [])
  const subjectsApi = useApi(() => subjectsService.listAll(), [])

  const loading = teachersApi.status === 'loading' || classesApi.status === 'loading' || subjectsApi.status === 'loading'
  const loadError = teachersApi.error || classesApi.error || subjectsApi.error

  async function handleAssign() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      await adminService.assignTeacher({ teacherId, classId, subjectId })
      setSaved(true)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Teacher assignments" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        {loading && <LoadingState label="Loading teachers, classes and subjects" rows={3} />}
        {loadError && <ErrorState message={loadError.message} />}

        {!loading && !loadError && (
          <Panel accent="teal">
            <PanelHeader title="Assign a teacher to a class and subject" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Teacher" htmlFor="assignTeacher">
                <Select id="assignTeacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">Select a teacher</option>
                  {teachersApi.data?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Class" htmlFor="assignClass">
                <Select id="assignClass" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Select a class</option>
                  {classesApi.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Subject" htmlFor="assignSubject">
                <Select id="assignSubject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select a subject</option>
                  {subjectsApi.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            {saveError && <p className="mb-3 text-sm text-clay-700">{saveError}</p>}
            {saved && <p className="mb-3 text-sm text-teal-700">Assignment saved.</p>}
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || !teacherId || !classId || !subjectId}
              onClick={handleAssign}
            >
              {saving ? 'Assigning…' : 'Assign teacher'}
            </button>
          </Panel>
        )}
      </main>
    </>
  )
}
