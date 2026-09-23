import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select, TextInput } from '../../components/ui/FormField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { resourcesService } from '../../services/resourcesService'

const emptyForm = { type: 'video', title: '', url: '' }
const TYPE_LABELS = { video: 'Video', note: 'Notes', example: 'Example' }

export default function ResourceManagementPage() {
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const activeSubjectId = subjectId || subjectsApi.data?.[0]?.id
  const topicsApi = useApi(() => topicsService.listBySubject(activeSubjectId), [activeSubjectId], {
    skip: !activeSubjectId,
  })
  const activeTopicId = topicId || topicsApi.data?.[0]?.id
  const resourcesApi = useApi(() => resourcesService.listByTopic(activeTopicId), [activeTopicId], {
    skip: !activeTopicId,
  })

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Give this resource a title.'
    if (!form.url.trim()) next.url = 'Add a link or file URL.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await resourcesService.create(activeTopicId, form)
      setModalOpen(false)
      setForm(emptyForm)
      resourcesApi.refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    try {
      await resourcesService.remove(removeTarget.id)
      setRemoveTarget(null)
      resourcesApi.refetch()
    } catch (err) {
      setSaveError(err.message)
      setRemoveTarget(null)
    }
  }

  return (
    <>
      <Topbar title="Resource management" breadcrumb="Teacher / Content" />
      <main className="flex-1 space-y-6 p-6">
        {subjectsApi.status === 'loading' && <LoadingState label="Loading subjects" rows={1} />}
        {subjectsApi.status === 'error' && <ErrorState message={subjectsApi.error.message} onRetry={subjectsApi.refetch} />}

        {subjectsApi.status === 'success' && subjectsApi.data.length > 0 && (
          <Panel>
            <PanelHeader
              title="Resources"
              subtitle="Videos, notes and examples linked to a topic"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <select className="input w-40" value={activeSubjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    {subjectsApi.data.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {topicsApi.status === 'success' && (
                    <select className="input w-48" value={activeTopicId} onChange={(e) => setTopicId(e.target.value)}>
                      {topicsApi.data.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button type="button" className="btn btn-primary" disabled={!activeTopicId} onClick={() => setModalOpen(true)}>
                    Add resource
                  </button>
                </div>
              }
            />

            {!activeTopicId && topicsApi.isEmpty && (
              <EmptyState title="No topics yet" description="Create a topic first, then add resources to it." />
            )}
            {resourcesApi.status === 'loading' && <LoadingState rows={3} />}
            {resourcesApi.status === 'error' && <ErrorState message={resourcesApi.error.message} onRetry={resourcesApi.refetch} />}
            {resourcesApi.isEmpty && <EmptyState title="No resources on this topic yet" />}
            {resourcesApi.status === 'success' && !resourcesApi.isEmpty && (
              <ul className="divide-y divide-border">
                {resourcesApi.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-ink-faint">
                        {TYPE_LABELS[r.type] || r.type} · <a href={r.url} className="text-teal-700 underline">{r.url}</a>
                      </p>
                    </div>
                    <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setRemoveTarget(r)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add resource"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save resource'}
            </button>
          </>
        }
      >
        <FormField label="Type" htmlFor="resType">
          <Select id="resType" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="video">Video</option>
            <option value="note">Notes</option>
            <option value="example">Example</option>
          </Select>
        </FormField>
        <FormField label="Title" htmlFor="resTitle" error={errors.title} required>
          <TextInput id="resTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </FormField>
        <FormField label="URL" htmlFor="resUrl" error={errors.url} required hint="Video URL, note link, or example link">
          <TextInput id="resUrl" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </FormField>
        {saveError && <p className="text-sm text-clay-700">{saveError}</p>}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this resource?"
        message={`"${removeTarget?.title}" will no longer be linked to this topic.`}
        confirmLabel="Remove"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  )
}
