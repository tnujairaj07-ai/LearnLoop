import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'

const emptyForm = { name: '', code: '', description: '', category: 'Core', status: 'active' }

export default function SubjectManagementPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { status, data, error, refetch, isEmpty } = useApi(() => subjectsService.listAll(), [])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Subject name is required.'
    if (!form.code.trim()) next.code = 'Subject code is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await subjectsService.create({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || 'Core',
        status: form.status || 'active',
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
      <Topbar title="Subject management" breadcrumb="Admin" />
      <main className="flex-1 space-y-6 p-6">
        <Panel>
          <PanelHeader
            title="Subjects"
            action={
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                New subject
              </button>
            }
          />
          {status === 'loading' && <LoadingState rows={3} />}
          {status === 'error' && <ErrorState message={error.message} onRetry={refetch} />}
          {isEmpty && <EmptyState title="No subjects yet" description="Create the first subject to get started." />}
          {status === 'success' && !isEmpty && (
            <Table columns={['Subject', 'Code', 'Category', 'Status', 'Topics']}>
              {data.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{s.code}</td>
                  <td className="px-3 py-2">{s.category || 'Core'}</td>
                  <td className="px-3 py-2 capitalize">{s.status || 'active'}</td>
                  <td className="px-3 py-2 tabular-nums">{s.topics_count ?? 0}</td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New subject"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Create subject'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Subject name" htmlFor="subjectName" error={errors.name} required>
            <TextInput
              id="subjectName"
              placeholder="e.g. Physics"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Subject code" htmlFor="subjectCode" error={errors.code} required>
            <TextInput
              id="subjectCode"
              placeholder="e.g. PHY-9"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </FormField>
        </div>
        <FormField label="Description" htmlFor="subjectDescription" hint="Optional">
          <TextInput
            id="subjectDescription"
            placeholder="Brief syllabus summary"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Category" htmlFor="subjectCategory">
            <TextInput
              id="subjectCategory"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </FormField>
          <FormField label="Status" htmlFor="subjectStatus">
            <select
              id="subjectStatus"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="planned">Planned</option>
            </select>
          </FormField>
        </div>
        {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
      </Modal>
    </>
  )
}
