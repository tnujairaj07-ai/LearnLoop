import { useState } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { Modal } from '../../components/ui/Modal'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { FormField, Select, TextArea, TextInput } from '../../components/ui/FormField'
import { Table } from '../../components/ui/Table'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { questionsService } from '../../services/questionsService'

const emptyForm = {
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  hint: '',
  difficulty: 'medium',
  skillTags: '',
  errorPatternTags: '',
}

export default function QuestionManagementPage() {
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
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
  const activeTopicId = topicId || topicsApi.data?.[0]?.id
  const questionsApi = useApi(() => questionsService.listByTopic(activeTopicId), [activeTopicId], {
    skip: !activeTopicId,
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(q) {
    setEditingId(q.id)
    setForm({
      text: q.text,
      options: q.options?.length ? q.options : ['', '', '', ''],
      correctIndex: q.correctIndex ?? 0,
      explanation: q.explanation || '',
      hint: q.hint || '',
      difficulty: q.difficulty || 'medium',
      skillTags: (q.skillTags || []).join(', '),
      errorPatternTags: (q.errorPatternTags || []).join(', '),
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function updateOption(index, value) {
    const next = [...form.options]
    next[index] = value
    setForm({ ...form, options: next })
  }

  function validate() {
    const next = {}
    if (!form.text.trim()) next.text = 'Question text is required.'
    const filledOptions = form.options.filter((o) => o.trim())
    if (filledOptions.length < 2) next.options = 'Add at least two answer options.'
    if (!form.options[form.correctIndex]?.trim()) next.correctIndex = 'Correct answer must match a filled option.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        topicId: activeTopicId,
        text: form.text,
        options: form.options.filter((o) => o.trim()),
        correctIndex: form.correctIndex,
        explanation: form.explanation,
        hint: form.hint,
        difficulty: form.difficulty,
        skillTags: form.skillTags.split(',').map((t) => t.trim()).filter(Boolean),
        errorPatternTags: form.errorPatternTags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      if (editingId) {
        await questionsService.update(editingId, payload)
      } else {
        await questionsService.create(payload)
      }
      setModalOpen(false)
      questionsApi.refetch()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar title="Question management" breadcrumb="Teacher / Content" />
      <main className="flex-1 space-y-6 p-6">
        {subjectsApi.status === 'loading' && <LoadingState label="Loading subjects" rows={1} />}
        {subjectsApi.status === 'error' && <ErrorState message={subjectsApi.error.message} onRetry={subjectsApi.refetch} />}

        {subjectsApi.status === 'success' && subjectsApi.data.length > 0 && (
          <Panel>
            <PanelHeader
              title="Questions"
              subtitle="Create and edit questions for a topic"
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
                  <button type="button" className="btn btn-primary" disabled={!activeTopicId} onClick={openCreate}>
                    New question
                  </button>
                </div>
              }
            />

            {questionsApi.status === 'loading' && <LoadingState rows={4} />}
            {questionsApi.status === 'error' && <ErrorState message={questionsApi.error.message} onRetry={questionsApi.refetch} />}
            {questionsApi.isEmpty && <EmptyState title="No questions on this topic yet" />}
            {questionsApi.status === 'success' && !questionsApi.isEmpty && (
              <Table columns={['Question', 'Difficulty', 'Skill tags', '']}>
                {questionsApi.data.map((q) => (
                  <tr key={q.id}>
                    <td className="max-w-md px-3 py-2">{q.text || q.question_text}</td>
                    <td className="px-3 py-2 capitalize">{q.difficulty === 1 ? 'Easy' : q.difficulty === 2 ? 'Medium' : q.difficulty === 3 ? 'Hard' : q.difficulty}</td>
                    <td className="px-3 py-2 text-ink-faint">{(q.skillTags || (q.skill_name ? [q.skill_name] : [])).join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(q)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        )}
      </main>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit question' : 'New question'}
        wide
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save question'}
            </button>
          </>
        }
      >
        <FormField label="Question text" htmlFor="qText" error={errors.text} required>
          <TextArea id="qText" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </FormField>

        <FormField label="Answer options" error={errors.options || errors.correctIndex} required hint="Mark the correct option">
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={form.correctIndex === i}
                  onChange={() => setForm({ ...form, correctIndex: i })}
                  aria-label={`Mark option ${i + 1} correct`}
                />
                <TextInput
                  value={opt}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </FormField>

        <FormField label="Explanation" htmlFor="qExplanation" hint="Shown after the student answers">
          <TextArea id="qExplanation" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
        </FormField>

        <FormField label="Hint" htmlFor="qHint" hint="Shown if the student answers incorrectly">
          <TextInput id="qHint" value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Difficulty" htmlFor="qDifficulty">
            <Select id="qDifficulty" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </FormField>
          <FormField label="Skill tags" htmlFor="qSkillTags" hint="Comma-separated">
            <TextInput id="qSkillTags" value={form.skillTags} onChange={(e) => setForm({ ...form, skillTags: e.target.value })} />
          </FormField>
          <FormField label="Error-pattern tags" htmlFor="qErrorTags" hint="Comma-separated">
            <TextInput id="qErrorTags" value={form.errorPatternTags} onChange={(e) => setForm({ ...form, errorPatternTags: e.target.value })} />
          </FormField>
        </div>
        {saveError && <p className="text-sm text-clay-700">{saveError}</p>}
      </Modal>
    </>
  )
}
