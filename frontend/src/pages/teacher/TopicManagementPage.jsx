import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { classesService } from '../../services/classesService'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { pickDefaultSubject } from '../../lib/teacherHelpers'

const emptyForm = {
  title: '',
  description: '',
  unit_name: '',
  common_mistake_tip: '',
  order_index: '',
  mastery_threshold: '60',
  is_pilot: true,
}

export default function TopicManagementPage() {
  const [subjectId, setSubjectId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const classesApi = useApi(() => classesService.listForTeacher(), [])

  const subjects = useMemo(() => subjectsApi.data || [], [subjectsApi.data])
  const defaultAnalyticsClassId = classesApi.data?.[0]?.class_id || null

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      const defSubj = pickDefaultSubject(subjects)
      if (defSubj) setSubjectId(String(defSubj.id))
    }
  }, [subjects, subjectId])

  const activeSubjectId = subjectId ? Number(subjectId) : pickDefaultSubject(subjects)?.id || null
  const activeSubjectObj = subjects.find((s) => s.id === activeSubjectId) || null

  const topicsApi = useApi(
    () => topicsService.listBySubject(activeSubjectId),
    [activeSubjectId],
    { skip: !activeSubjectId }
  )

  const allTopics = useMemo(() => topicsApi.data || [], [topicsApi.data])

  const filteredTopics = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return allTopics.filter(
      (t) =>
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.unit_name && t.unit_name.toLowerCase().includes(q))
    )
  }, [allTopics, searchQuery])

  const stats = useMemo(() => {
    return {
      totalChapters: allTopics.length,
      pilotCount: allTopics.filter((t) => t.is_pilot).length,
      questionsCount: allTopics.reduce((acc, t) => acc + (t.questions_count || 0), 0),
      resourcesCount: allTopics.reduce((acc, t) => acc + (t.resources_count || 0), 0),
    }
  }, [allTopics])

  function openCreate() {
    const maxOrder = allTopics.reduce((m, t) => Math.max(m, t.order_index || 0), 0)
    setEditingId(null)
    setForm({
      ...emptyForm,
      order_index: String(maxOrder + 1),
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(topic) {
    setEditingId(topic.id)
    setForm({
      title: topic.title || '',
      description: topic.description || '',
      unit_name: topic.unit_name || '',
      common_mistake_tip: topic.common_mistake_tip || '',
      order_index: String(topic.order_index ?? ''),
      mastery_threshold: String(topic.mastery_threshold ?? 60),
      is_pilot: Boolean(topic.is_pilot),
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Topic / Chapter title is required.'
    if (form.order_index === '' || isNaN(Number(form.order_index)) || Number(form.order_index) < 0) {
      next.order_index = 'Valid non-negative chapter order is required.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate() || !activeSubjectId) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        subject_id: activeSubjectId,
        title: form.title.trim(),
        description: form.description.trim(),
        unit_name: form.unit_name.trim() || undefined,
        common_mistake_tip: form.common_mistake_tip.trim() || undefined,
        order_index: Number(form.order_index),
        mastery_threshold: Number(form.mastery_threshold || 60),
        is_pilot: Boolean(form.is_pilot),
      }

      if (editingId) {
        await topicsService.update(editingId, payload)
        setNotice(`Chapter "${form.title}" updated in database.`)
      } else {
        await topicsService.create(payload)
        setNotice(`Chapter "${form.title}" added to curriculum.`)
      }
      setModalOpen(false)
      topicsApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save topic.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await topicsService.remove(id)
      setDeleteConfirmId(null)
      setNotice('Topic deleted successfully.')
      topicsApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setDeleteError(err.message || 'Could not delete topic.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Topbar
        title="Curriculum & Topic Management"
        breadcrumb="Teacher / Content"
        subtitle="Manage subject chapters, learning progressions, common-mistake notes, and mastery thresholds"
        actions={
          <button
            type="button"
            disabled={!activeSubjectId}
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>+</span>
            <span>New Chapter / Unit</span>
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

        {/* 1. CURRICULUM OVERVIEW & SUBJECT SELECTOR */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Subject
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden min-w-[200px]"
                value={activeSubjectId || ''}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {activeSubjectObj && (
              <div className="md:border-l md:border-slate-200 md:pl-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Curriculum Track
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{activeSubjectObj.curriculum_label || activeSubjectObj.name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Filter chapters by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden shadow-2xs"
            />
            <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* 2. CURRICULUM PROGRESSION STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Chapters
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-slate-900">
                {stats.totalChapters}
              </span>
              <span className="text-xs text-slate-500 font-normal">In selected subject</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Pilot Core Topics
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-blue-900">
                {stats.pilotCount}
              </span>
              <span className="text-xs text-blue-700 font-normal">Flagged active pilot</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Diagnostic Items
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-emerald-900">
                {stats.questionsCount}
              </span>
              <span className="text-xs text-emerald-700 font-normal">Live questions</span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Learning Resources
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-purple-900">
                {stats.resourcesCount}
              </span>
              <span className="text-xs text-purple-700 font-normal">Linked assets</span>
            </div>
          </div>
        </div>

        {topicsApi.status === 'loading' && <LoadingState label="Loading chapters..." rows={4} />}
        {topicsApi.status === 'error' && (
          <ErrorState message={topicsApi.error.message} onRetry={topicsApi.refetch} />
        )}

        {/* 3. CHAPTER INVENTORY LIST */}
        {topicsApi.status === 'success' && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Chapter Sequence &amp; Competencies
                </h2>
                <p className="text-xs text-slate-500">
                  Sequential chapters with mastery thresholds and linked assets.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400">
                Showing {filteredTopics.length} chapters
              </span>
            </div>

            {filteredTopics.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No chapters configured"
                  description="Add the first chapter to this subject to attach questions and resources."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredTopics.map((topic) => (
                  <div key={topic.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500">
                            CH
                          </span>
                          <span className="font-display font-black text-xs leading-none">
                            {String(topic.order_index ?? 0).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-base font-bold text-slate-900">
                              {topic.title}
                            </h3>

                            {topic.is_pilot ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Pilot Scope
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                                Standard Chapter
                              </span>
                            )}

                            {topic.unit_name && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800">
                                {topic.unit_name}
                              </span>
                            )}
                          </div>

                          {topic.description && (
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                              {topic.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1 font-medium">
                              <span>📝</span> {topic.questions_count ?? 0} Questions
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <span>📚</span> {topic.resources_count ?? 0} Resources
                            </span>
                            <span className="text-slate-400">
                              Threshold: {topic.mastery_threshold ?? 60}%
                            </span>
                            {defaultAnalyticsClassId && (
                              <Link
                                to={`/teacher/classes/${defaultAnalyticsClassId}/topics/${topic.id}`}
                                className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                <span>📊 View Item Analytics →</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(topic)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleteConfirmId(topic.id)
                          }}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT CHAPTER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Chapter Details' : 'Add New Chapter / Unit'}
                </h3>
                <p className="text-xs text-slate-500">
                  Subject: {activeSubjectObj?.name || 'Selected Subject'}
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

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-800 mb-1">
                    Sequence # <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.order_index}
                    onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-bold text-slate-800 ${
                      errors.order_index ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.order_index && (
                    <p className="text-xs text-rose-600 mt-1">{errors.order_index}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Chapter Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Linear Equations in Two Variables"
                    className={`w-full p-2.5 rounded-xl border text-slate-800 font-medium ${
                      errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Unit Name</label>
                  <input
                    type="text"
                    value={form.unit_name}
                    onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                    placeholder="e.g. Unit II: Algebra"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Mastery Threshold (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.mastery_threshold}
                    onChange={(e) => setForm({ ...form, mastery_threshold: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Learning Objectives &amp; Scope</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline core competencies and diagnostic coverage..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Common Mistake Warning Tip</label>
                <input
                  type="text"
                  value={form.common_mistake_tip}
                  onChange={(e) => setForm({ ...form, common_mistake_tip: e.target.value })}
                  placeholder="Optional guidance shown to students before practice..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="inPilotCheck"
                  checked={form.is_pilot}
                  onChange={(e) => setForm({ ...form, is_pilot: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="inPilotCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Include in Active Pilot Diagnostic Scope
                </label>
              </div>

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
                {saving ? 'Saving...' : editingId ? 'Update Chapter' : 'Add Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Delete Chapter</h3>
            <p className="text-xs text-slate-600">
              Topics without existing questions or student mastery records can be deleted permanently.
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
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
