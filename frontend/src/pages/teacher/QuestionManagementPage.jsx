import { useState, useMemo, useEffect } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { questionsService } from '../../services/questionsService'

const DIFFICULTY_META = {
  1: { label: 'Easy', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  2: { label: 'Medium', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  3: { label: 'Hard', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
}

const OPTION_IDS = ['a', 'b', 'c', 'd']

const emptyForm = {
  question_text: '',
  question_type: 'mcq',
  options: ['', '', '', ''],
  correctIndex: 0,
  correct_text: '',
  explanation: '',
  hint: '',
  difficulty: '2',
  approved: true,
  errorTagIds: [],
}

export default function QuestionManagementPage() {
  const { role } = useAuth()
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [notice, setNotice] = useState(null)

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const errorTagsApi = useApi(() => questionsService.listErrorTags(), [])

  const subjects = useMemo(() => subjectsApi.data || [], [subjectsApi.data])
  const errorTags = useMemo(() => errorTagsApi.data || [], [errorTagsApi.data])

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(String(subjects[0].id))
    }
  }, [subjects, subjectId])

  const activeSubjectId = subjectId ? Number(subjectId) : subjects[0]?.id || null

  const topicsApi = useApi(
    () => topicsService.listBySubject(activeSubjectId),
    [activeSubjectId],
    { skip: !activeSubjectId }
  )
  const topics = useMemo(() => topicsApi.data || [], [topicsApi.data])

  useEffect(() => {
    if (topics.length > 0 && (!topicId || !topics.some((t) => String(t.id) === String(topicId)))) {
      setTopicId(String(topics[0].id))
    } else if (topics.length === 0) {
      setTopicId('')
    }
  }, [topics, topicId])

  const activeTopicId = topicId ? Number(topicId) : topics[0]?.id || null
  const activeTopicObj = topics.find((t) => t.id === activeTopicId) || null

  const questionsApi = useApi(
    () => questionsService.listByTopic(activeTopicId),
    [activeTopicId],
    { skip: !activeTopicId }
  )

  const rawQuestions = useMemo(() => questionsApi.data || [], [questionsApi.data])

  const filteredQuestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return rawQuestions.filter((item) => {
      const matchDiff =
        difficultyFilter === 'all' || String(item.difficulty) === String(difficultyFilter)
      const matchText =
        !q ||
        (item.question_text || '').toLowerCase().includes(q) ||
        (item.error_tags || []).some((t) => (t.name || '').toLowerCase().includes(q))
      return matchDiff && matchText
    })
  }, [rawQuestions, difficultyFilter, searchQuery])

  const stats = useMemo(() => {
    return {
      total: rawQuestions.length,
      easy: rawQuestions.filter((q) => q.difficulty === 1).length,
      medium: rawQuestions.filter((q) => q.difficulty === 2).length,
      hard: rawQuestions.filter((q) => q.difficulty === 3).length,
      taggedWithErrors: rawQuestions.filter((q) => q.error_tags && q.error_tags.length > 0).length,
    }
  }, [rawQuestions])

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(q) {
    setEditingId(q.id)
    const opts = [0, 1, 2, 3].map((idx) => {
      const o = q.options?.[idx]
      if (!o) return ''
      return typeof o === 'string' ? o : o.text || ''
    })
    const correctIdx = Math.max(
      0,
      (q.options || []).findIndex(
        (o) => (typeof o === 'object' ? o.id : o) === q.correct_answer
      )
    )
    setForm({
      question_text: q.question_text || '',
      question_type: q.question_type || 'mcq',
      options: opts,
      correctIndex: correctIdx,
      correct_text: q.question_type !== 'mcq' ? q.correct_answer || '' : '',
      explanation: q.explanation || '',
      hint: q.hint || '',
      difficulty: String(q.difficulty || 2),
      approved: Boolean(q.approved),
      errorTagIds: (q.error_tags || []).map((t) => t.id),
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

  function toggleErrorTag(tagId) {
    setForm((prev) => ({
      ...prev,
      errorTagIds: prev.errorTagIds.includes(tagId)
        ? prev.errorTagIds.filter((id) => id !== tagId)
        : [...prev.errorTagIds, tagId],
    }))
  }

  function validate() {
    const next = {}
    if (!form.question_text.trim()) next.question_text = 'Question prompt is required.'
    if (!form.explanation.trim()) next.explanation = 'Explanation is required.'
    if (!form.hint.trim()) next.hint = 'Hint is required.'

    if (form.question_type === 'mcq') {
      const filled = form.options.map((text, idx) => ({ id: OPTION_IDS[idx], text: text.trim() })).filter((o) => o.text)
      if (filled.length < 2) next.options = 'At least two answer options are required.'
      if (!form.options[form.correctIndex]?.trim()) {
        next.correctIndex = 'Selected correct answer option cannot be blank.'
      }
    } else if (!form.correct_text.trim()) {
      next.correct_text = 'Correct answer is required.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate() || !activeTopicId) return
    setSaving(true)
    setSaveError(null)
    try {
      const formattedOptions =
        form.question_type === 'mcq'
          ? form.options
              .map((text, idx) => ({ id: OPTION_IDS[idx], text: text.trim() }))
              .filter((o) => o.text.length > 0)
          : undefined

      const correctAnswer =
        form.question_type === 'mcq' ? OPTION_IDS[form.correctIndex] : form.correct_text.trim()

      const payload = {
        topic_id: activeTopicId,
        question_type: form.question_type,
        question_text: form.question_text.trim(),
        ...(formattedOptions ? { options: formattedOptions } : {}),
        correct_answer: correctAnswer,
        explanation: form.explanation.trim(),
        hint: form.hint.trim(),
        difficulty: Number(form.difficulty),
        approved: Boolean(form.approved),
        error_tags: form.errorTagIds,
      }

      if (editingId) {
        await questionsService.update(editingId, payload)
        setNotice('Question updated in database.')
      } else {
        await questionsService.create(payload)
        setNotice('New question saved to item bank.')
      }
      setModalOpen(false)
      questionsApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save question.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleApproval(q) {
    try {
      await questionsService.setApproval(q.id, !q.approved)
      questionsApi.refetch()
    } catch (err) {
      setSaveError(err.message || 'Failed to update approval.')
    }
  }

  async function handleDelete(id) {
    setDeleteError(null)
    try {
      await questionsService.remove(id)
      setDeleteConfirmId(null)
      setNotice('Question deleted from item bank.')
      questionsApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setDeleteError(err.message || 'Only administrators can delete published bank questions.')
    }
  }

  return (
    <>
      <Topbar
        title="Question Bank & Diagnostic Items"
        breadcrumb="Teacher / Content"
        subtitle="Calibrate questions, map error-pattern tags, and configure scaffolding hints"
        actions={
          <button
            type="button"
            disabled={!activeTopicId}
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>+</span>
            <span>New Question</span>
          </button>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* 1. TOP CONTROLS & SELECTION BAR */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Subject
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                value={activeSubjectId || ''}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setTopicId('')
                }}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Chapter / Topic
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden min-w-[220px]"
                value={activeTopicId || ''}
                onChange={(e) => setTopicId(e.target.value)}
              >
                {topics.length === 0 ? (
                  <option value="">No topics found</option>
                ) : (
                  topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter by Difficulty
            </label>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {[
                { id: 'all', label: 'All' },
                { id: '1', label: 'Easy' },
                { id: '2', label: 'Medium' },
                { id: '3', label: 'Hard' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficultyFilter(d.id)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    difficultyFilter === d.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. STATS KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Items
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-500 font-normal">in selected topic</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Easy Tier (1)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-emerald-900">{stats.easy}</span>
              <span className="text-xs text-emerald-700 font-normal">Foundational</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Medium Tier (2)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-amber-900">{stats.medium}</span>
              <span className="text-xs text-amber-700 font-normal">Application</span>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Hard (3) &amp; Error Tags
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-rose-900">{stats.hard}</span>
              <span className="text-xs text-rose-700 font-normal">
                {stats.taggedWithErrors} misconception-tagged
              </span>
            </div>
          </div>
        </div>

        {questionsApi.status === 'loading' && <LoadingState label="Loading question bank..." rows={5} />}
        {questionsApi.status === 'error' && (
          <ErrorState message={questionsApi.error.message} onRetry={questionsApi.refetch} />
        )}

        {/* 3. SEARCH & QUESTIONS LIST */}
        {(!activeTopicId || questionsApi.status === 'success') && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  {activeTopicObj?.title || 'Topic'} Question Inventory ({filteredQuestions.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Questions include difficulty levels, answer keys, explanations, and error-pattern tags.
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search questions or error tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden shadow-2xs"
                />
                <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No questions in this topic view"
                  description="Create a diagnostic or practice question for this topic to populate assessments."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredQuestions.map((q) => {
                  const diffMeta = DIFFICULTY_META[q.difficulty] || DIFFICULTY_META[2]
                  return (
                    <div key={q.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                              Q#{q.id}
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${diffMeta.cls}`}
                            >
                              {diffMeta.label}
                            </span>

                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                              {q.question_type}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleApproval(q)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer ${
                                q.approved
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {q.approved ? '✓ Approved' : 'Unapproved'}
                            </button>
                          </div>

                          <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                            {q.question_text}
                          </p>

                          {q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-w-3xl">
                              {q.options.map((opt, oIdx) => {
                                const optId = typeof opt === 'object' ? opt.id : String(oIdx)
                                const optText = typeof opt === 'object' ? opt.text : String(opt)
                                const isCorrect = optId === q.correct_answer
                                return (
                                  <div
                                    key={optId}
                                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                                      isCorrect
                                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                                        : 'bg-white border-slate-200/80 text-slate-700'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold uppercase ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {optId}
                                    </span>
                                    <span className="flex-1 truncate">{optText}</span>
                                    {isCorrect && (
                                      <span className="text-emerald-700 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100">
                                        Correct Key
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 w-fit">
                              Correct Key: {q.correct_answer}
                            </div>
                          )}

                          {q.error_tags && q.error_tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-rose-700 bg-rose-50/80 border border-rose-200/70 px-3 py-1.5 rounded-xl w-fit">
                              <span>⚠️</span>
                              <span className="font-semibold">Tagged Error Pattern:</span>
                              <span>{q.error_tags.map((t) => t.name).join(', ')}</span>
                            </div>
                          )}

                          {q.explanation && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-3xl">
                              <strong className="text-slate-700">Explanation:</strong> {q.explanation}
                            </p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(q)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                          {role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null)
                                setDeleteConfirmId(q.id)
                              }}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Diagnostic Question' : 'Create New Question'}
                </h3>
                <p className="text-xs text-slate-500">
                  Topic: {activeTopicObj?.title || 'Selected Chapter'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Question Type</label>
                  <select
                    value={form.question_type}
                    disabled={Boolean(editingId)}
                    onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800 disabled:bg-slate-50"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="numeric">Numeric Answer</option>
                    <option value="short_text">Short Text</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Difficulty Tier</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800"
                  >
                    <option value="1">Easy (1 · Foundational Recall)</option>
                    <option value="2">Medium (2 · Application)</option>
                    <option value="3">Hard (3 · Multi-step Challenge)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Question Prompt <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                  placeholder="Enter question statement..."
                  className={`w-full p-3 rounded-2xl border text-slate-800 text-xs sm:text-sm focus:outline-hidden ${
                    errors.question_text ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {errors.question_text && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">{errors.question_text}</p>
                )}
              </div>

              {form.question_type === 'mcq' ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">
                      Multiple Choice Options <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select the radio button next to the correct answer
                    </span>
                  </div>

                  <div className="space-y-2">
                    {form.options.map((opt, i) => {
                      const isCorrect = form.correctIndex === i
                      return (
                        <div
                          key={OPTION_IDS[i]}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="correctAnswerChoice"
                            checked={isCorrect}
                            onChange={() => setForm({ ...form, correctIndex: i })}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                          />
                          <span className="w-5 text-center font-mono font-bold text-xs text-slate-500 uppercase">
                            {OPTION_IDS[i]}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(i, e.target.value)}
                            placeholder={`Option ${OPTION_IDS[i].toUpperCase()}`}
                            className="flex-1 bg-transparent border-0 text-xs sm:text-sm font-medium focus:outline-hidden text-slate-800"
                          />
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {errors.options && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">{errors.options}</p>
                  )}
                  {errors.correctIndex && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">{errors.correctIndex}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Correct Answer <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.correct_text}
                    onChange={(e) => setForm({ ...form, correct_text: e.target.value })}
                    placeholder="Expected numeric or short text answer..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                  {errors.correct_text && (
                    <p className="text-xs text-rose-600 font-semibold mt-1">{errors.correct_text}</p>
                  )}
                </div>
              )}

              {errorTags.length > 0 && !editingId && (
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Error Pattern Tags (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {errorTags.map((tag) => {
                      const selected = form.errorTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleErrorTag(tag.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            selected
                              ? 'bg-rose-50 border-rose-400 text-rose-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '}
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Explanation <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.explanation}
                    onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                    placeholder="Step-by-step reasoning shown after attempt submission..."
                    className={`w-full p-2.5 rounded-xl border font-medium text-xs sm:text-sm text-slate-800 ${
                      errors.explanation ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {errors.explanation && (
                    <p className="text-xs text-rose-600 mt-1">{errors.explanation}</p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Scaffolding Hint <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.hint}
                    onChange={(e) => setForm({ ...form, hint: e.target.value })}
                    placeholder="Nudge shown if a student needs a hint..."
                    className={`w-full p-2.5 rounded-xl border font-medium text-xs sm:text-sm text-slate-800 ${
                      errors.hint ? 'border-rose-400' : 'border-slate-200'
                    }`}
                  />
                  {errors.hint && <p className="text-xs text-rose-600 mt-1">{errors.hint}</p>}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.approved}
                  onChange={(e) => setForm({ ...form, approved: e.target.checked })}
                />
                <span>Approve for live assessments and student practice</span>
              </label>

              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                  {saveError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving...' : editingId ? 'Update Question' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Delete Question</h3>
            <p className="text-xs text-slate-600">
              Permanently remove this question from the item bank?
            </p>
            {deleteError && <p className="text-xs text-rose-600 font-semibold">{deleteError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
