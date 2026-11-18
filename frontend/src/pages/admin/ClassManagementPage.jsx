import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../services/adminService'
import { classesService } from '../../services/classesService'

const emptyForm = {
  name: '',
  grade: '9',
  section: '',
  academic_year: '2026-27',
}

export default function ClassManagementPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [homeroomClass, setHomeroomClass] = useState(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [homeroomSaving, setHomeroomSaving] = useState(false)
  const [homeroomError, setHomeroomError] = useState(null)

  const { status, data, error, refetch, isEmpty } = useApi(() => classesService.listAll(), [])
  const teachersApi = useApi(() => adminService.listTeachers(), [])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Class name is required.'
    if (!form.grade.trim()) next.grade = 'Grade is required.'
    if (!form.section.trim()) next.section = 'Section is required.'
    if (!form.academic_year.trim()) next.academic_year = 'Academic year is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await classesService.create({
        name: form.name.trim(),
        grade: form.grade.trim(),
        section: form.section.trim(),
        academic_year: form.academic_year.trim(),
      })
      setModalOpen(false)
      setForm(emptyForm)
      refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openHomeroomModal(cls) {
    setHomeroomClass(cls)
    setSelectedTeacherId(cls.homeroom_teacher_id ? String(cls.homeroom_teacher_id) : '')
    setHomeroomError(null)
  }

  async function handleSaveHomeroom() {
    if (!homeroomClass) return
    setHomeroomSaving(true)
    setHomeroomError(null)
    try {
      await classesService.update(homeroomClass.id, {
        homeroom_teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null,
      })
      setHomeroomClass(null)
      refetch()
      teachersApi.refetch()
    } catch (err) {
      setHomeroomError(err.message)
    } finally {
      setHomeroomSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Class management" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        <Panel>
          <PanelHeader
            title="Classes"
            subtitle="Every class in the school"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                New class
              </button>
            }
          />
          {status === 'loading' && <LoadingState rows={4} />}
          {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}
          {isEmpty && <EmptyState title="No classes yet" description="Create the first class to get started." />}
          {status === 'success' && !isEmpty && (
            <Table columns={['Class', 'Grade / Section', 'Academic Year', 'Homeroom Teacher', 'Students', '']}>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">
                    Grade {c.grade || '—'} · Sec {c.section || '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{c.academic_year || '—'}</td>
                  <td className="px-3 py-2">{c.homeroom_teacher_name || 'Unassigned'}</td>
                  <td className="px-3 py-2 tabular-nums">{c.student_count ?? 0}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      onClick={() => openHomeroomModal(c)}
                    >
                      Set homeroom
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New class"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Create class'}
            </button>
          </>
        }
      >
        <FormField label="Class name" htmlFor="className" error={errors.name} required>
          <TextInput
            id="className"
            placeholder="e.g. Class 9-C"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Grade" htmlFor="classGrade" error={errors.grade} required>
            <TextInput
              id="classGrade"
              placeholder="e.g. 9"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            />
          </FormField>
          <FormField label="Section" htmlFor="classSection" error={errors.section} required>
            <TextInput
              id="classSection"
              placeholder="e.g. C"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </FormField>
          <FormField label="Academic year" htmlFor="academicYear" error={errors.academic_year} required>
            <TextInput
              id="academicYear"
              placeholder="e.g. 2026-27"
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
            />
          </FormField>
        </div>
        {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
      </Modal>

      <Modal
        open={Boolean(homeroomClass)}
        onClose={() => setHomeroomClass(null)}
        title={homeroomClass ? `Homeroom teacher · ${homeroomClass.name}` : 'Homeroom teacher'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setHomeroomClass(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSaveHomeroom} disabled={homeroomSaving}>
              {homeroomSaving ? 'Saving…' : 'Save homeroom'}
            </button>
          </>
        }
      >
        <FormField label="Class Teacher" htmlFor="homeroomTeacherSelect">
          <select
            id="homeroomTeacherSelect"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {(teachersApi.data || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>
        </FormField>
        {homeroomError && <p className="text-sm text-rose-600">{homeroomError}</p>}
      </Modal>
    </>
  )
}
