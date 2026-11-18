import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { adminService } from '../../services/adminService'

const emptyForm = { name: '', email: '', password: '' }

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function TeacherManagementPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { status, data, error, refetch, isEmpty } = useApi(() => adminService.listTeachers(), [])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.'
    if (form.password && form.password.length < 6) next.password = 'Password must be at least 6 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await adminService.createTeacher({
        name: form.name.trim(),
        email: form.email.trim(),
        ...(form.password.trim() ? { password: form.password } : {}),
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

  return (
    <>
      <Topbar title="Teacher management" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        <Panel>
          <PanelHeader
            title="Teachers"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                New teacher
              </button>
            }
          />
          {status === 'loading' && <LoadingState rows={3} />}
          {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}
          {isEmpty && <EmptyState title="No teachers yet" description="Create the first teacher account." />}
          {status === 'success' && !isEmpty && (
            <Table columns={['ID', 'Name', 'Email', 'Classes assigned', 'Homeroom']}>
              {data.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{t.public_id || `#${t.id}`}</td>
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-slate-500">{t.email}</td>
                  <td className="px-3 py-2 tabular-nums">{t.class_count ?? t.assignments_count ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {Array.isArray(t.homeroom_classes) && t.homeroom_classes.length > 0
                      ? t.homeroom_classes.join(', ')
                      : '—'}
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
        title="New teacher"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Create teacher'}
            </button>
          </>
        }
      >
        <FormField label="Full name" htmlFor="teacherName" error={errors.name} required>
          <TextInput id="teacherName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Email" htmlFor="teacherEmail" error={errors.email} required>
          <TextInput id="teacherEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Initial password" htmlFor="teacherPassword" error={errors.password} hint="Optional (min 6 chars; auto-generated if left blank)">
          <TextInput
            id="teacherPassword"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </FormField>
        {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
      </Modal>
    </>
  )
}
