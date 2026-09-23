import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { studentsService } from '../../services/studentsService'

const emptyForm = { name: '', email: '' }

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

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!isValidEmail(form.email)) next.email = 'Enter a valid email address.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await studentsService.create(form)
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
            <Table columns={['Name', 'Email', 'Class']}>
              {data.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-ink-faint">{s.email}</td>
                  <td className="px-3 py-2">{s.className || '—'}</td>
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
        {saveError && <p className="text-sm text-clay-700">{saveError}</p>}
      </Modal>
    </>
  )
}
