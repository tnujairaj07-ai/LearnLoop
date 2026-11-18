import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { studentsService } from '../../services/studentsService'

const emptyForm = { name: '', email: '', password: '', class_id: '' }

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function StudentManagementPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { status, data, error, refetch, isEmpty } = useApi(() => studentsService.listAll(), [])
  const classesApi = useApi(() => classesService.listAll(), [])

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
      await studentsService.create({
        name: form.name.trim(),
        email: form.email.trim(),
        ...(form.password.trim() ? { password: form.password } : {}),
        ...(form.class_id ? { class_id: Number(form.class_id) } : {}),
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
      <Topbar title="Student management" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        <Panel>
          <PanelHeader
            title="Students"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                New student
              </button>
            }
          />
          {status === 'loading' && <LoadingState rows={3} />}
          {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}
          {isEmpty && <EmptyState title="No students yet" description="Create the first student account." />}
          {status === 'success' && !isEmpty && (
            <Table columns={['ID', 'Name', 'Email', 'Class']}>
              {data.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.public_id || `#${s.id}`}</td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-slate-500">{s.email}</td>
                  <td className="px-3 py-2">{s.class_name || 'Unassigned'}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New student"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Create student'}
            </button>
          </>
        }
      >
        <FormField label="Full name" htmlFor="studentName" error={errors.name} required>
          <TextInput id="studentName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Email" htmlFor="studentEmail" error={errors.email} required>
          <TextInput id="studentEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Enrol in class" htmlFor="studentClass" hint="Optional">
          <Select id="studentClass" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">Unassigned</option>
            {(classesApi.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Initial password" htmlFor="studentPassword" error={errors.password} hint="Optional (min 6 chars; auto-generated if left blank)">
          <TextInput
            id="studentPassword"
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
