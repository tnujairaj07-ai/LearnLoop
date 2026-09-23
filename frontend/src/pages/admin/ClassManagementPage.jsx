import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'

const emptyForm = { name: '', gradeLevel: '' }

export default function ClassManagementPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { status, data, error, refetch, isEmpty } = useApi(() => classesService.listAll(), [])

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Class name is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await classesService.create(form)
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
            <Table columns={['Class', 'Grade level', 'Students']}>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">{c.gradeLevel || c.grade || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{c.studentCount ?? c.student_count ?? '—'}</td>
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
          <TextInput id="className" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Grade level" htmlFor="gradeLevel" hint="Optional">
          <TextInput id="gradeLevel" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} />
        </FormField>
        {saveError && <p className="text-sm text-clay-700">{saveError}</p>}
      </Modal>
    </>
  )
}
