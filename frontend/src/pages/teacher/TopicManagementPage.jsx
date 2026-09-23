import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, TextArea, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'

const emptyForm = { name: '', description: '', order: '' }

export default function TopicManagementPage() {
  const [subjectId, setSubjectId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const activeSubjectId = subjectId || subjectsApi.data?.[0]?.id
  const topicsApi = useApi(() => topicsService.listBySubject(activeSubjectId), [activeSubjectId], {
    skip: !activeSubjectId,
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(topic) {
    setEditingId(topic.id)
    setForm({ name: topic.name, description: topic.description || '', order: topic.order ?? '' })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Topic name is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { ...form, subjectId: activeSubjectId }
      if (editingId) {
        await topicsService.update(editingId, payload)
      } else {
        await topicsService.create(payload)
      }
      setModalOpen(false)
      topicsApi.refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Topic management" breadcrumb="Teacher / Content" />
      <main className="flex-1 space-y-6 p-6">
        {subjectsApi.status === 'loading' && <LoadingState label="Loading subjects" rows={1} />}
        {subjectsApi.status === 'error' && <ErrorState message={subjectsApi.error.message} onRetry={subjectsApi.refetch} />}

        {subjectsApi.status === 'success' && subjectsApi.data.length > 0 && (
          <Panel>
            <PanelHeader
              title="Topics"
              subtitle="Create and edit topics for a subject"
              action={
                <div className="flex items-center gap-2">
                  <select className="input w-48" value={activeSubjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    {subjectsApi.data.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    New topic
                  </button>
                </div>
              }
            />

            {topicsApi.status === 'loading' && <LoadingState rows={4} />}
            {topicsApi.status === 'error' && <ErrorState message={topicsApi.error.message} onRetry={topicsApi.refetch} />}
            {topicsApi.isEmpty && (
              <EmptyState title="No topics yet" description="Create the first topic for this subject." />
            )}
            {topicsApi.status === 'success' && !topicsApi.isEmpty && (
              <Table columns={['Order', 'Name', 'Description', '']}>
                {topicsApi.data.map((topic) => (
                  <tr key={topic.id}>
                    <td className="px-3 py-2 tabular-nums">{topic.order ?? topic.order_index ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{topic.name || topic.title}</td>
                    <td className="max-w-sm truncate px-3 py-2 text-ink-faint">{topic.description}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(topic)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        )}

        {subjectsApi.isEmpty && (
          <EmptyState title="No subjects yet" description="Ask an admin to create a subject first." />
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit topic' : 'New topic'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save topic'}
            </button>
          </>
        }
      >
        <FormField label="Name" htmlFor="topicName" error={errors.name} required>
          <TextInput id="topicName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Description" htmlFor="topicDesc" hint="Optional — shown to students on the roadmap">
          <TextArea id="topicDesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
        <FormField label="Order" htmlFor="topicOrder" hint="Where this appears in the subject sequence">
          <TextInput id="topicOrder" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
        </FormField>
        {saveError && <p className="text-sm text-clay-700">{saveError}</p>}
      </Modal>
    </>
  )
}
