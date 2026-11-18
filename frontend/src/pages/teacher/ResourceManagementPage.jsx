import { useState, useMemo, useEffect } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { resourcesService } from '../../services/resourcesService'

const emptyForm = {
  resource_type: 'video',
  title: '',
  url_or_path: '',
  difficulty: '1',
  description: '',
  approved: true,
}

const TYPE_CONFIG = {
  video: {
    label: 'Video Lesson',
    icon: '🎥',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  note: {
    label: 'Concept Notes',
    icon: '📄',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  example: {
    label: 'Worked Example',
    icon: '💡',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
  summary: {
    label: 'Summary Sheet',
    icon: '📝',
    color: 'bg-blue-50 text-blue-900 border-blue-200',
  },
}

const DIFFICULTY_BADGE = {
  1: { label: 'Foundational Support (L1)', cls: 'bg-rose-50 text-rose-800 border-rose-200' },
  2: { label: 'Skill Practice (L2)', cls: 'bg-amber-50 text-amber-900 border-amber-200' },
  3: { label: 'Mastery Deep Dive (L3)', cls: 'bg-blue-50 text-blue-900 border-blue-200' },
}

export default function ResourceManagementPage() {
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [activeTypeFilter, setActiveTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const subjects = useMemo(() => subjectsApi.data || [], [subjectsApi.data])

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

  const resourcesApi = useApi(
    () => resourcesService.listByTopic(activeTopicId),
    [activeTopicId],
    { skip: !activeTopicId }
  )

  const rawResources = useMemo(() => resourcesApi.data || [], [resourcesApi.data])

  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return rawResources.filter((r) => {
      const matchType = activeTypeFilter === 'all' || r.resource_type === activeTypeFilter
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.url_or_path && r.url_or_path.toLowerCase().includes(q))
      return matchType && matchSearch
    })
  }, [rawResources, activeTypeFilter, searchQuery])

  const counts = useMemo(() => {
    return {
      all: rawResources.length,
      video: rawResources.filter((r) => r.resource_type === 'video').length,
      note: rawResources.filter((r) => r.resource_type === 'note' || r.resource_type === 'summary').length,
      example: rawResources.filter((r) => r.resource_type === 'example').length,
    }
  }, [rawResources])

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Resource title is required.'
    const u = form.url_or_path.trim()
    if (!u || (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('/'))) {
      next.url_or_path = 'Enter a valid http(s):// URL or internal / path.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate() || !activeTopicId) return
    setSaving(true)
    setSaveError(null)
    try {
      await resourcesService.create({
        topic_id: activeTopicId,
        title: form.title.trim(),
        resource_type: form.resource_type,
        url_or_path: form.url_or_path.trim(),
        description: form.description.trim(),
        difficulty: Number(form.difficulty),
        approved: Boolean(form.approved),
      })
      setModalOpen(false)
      setForm(emptyForm)
      setNotice('Learning resource saved to database.')
      resourcesApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save resource.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleApproved(res) {
    setActionError(null)
    try {
      await resourcesService.update(res.id, { approved: !res.approved })
      resourcesApi.refetch()
    } catch (err) {
      setActionError(err.message || 'Could not update approval state.')
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    setActionError(null)
    try {
      await resourcesService.remove(removeTarget.id)
      setRemoveTarget(null)
      setNotice('Resource deleted from repository.')
      resourcesApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setRemoveTarget(null)
      setActionError(err.message || 'Could not delete resource.')
    }
  }

  return (
    <>
      <Topbar
        title="Curriculum Resources & Remedial Assets"
        breadcrumb="Teacher / Content"
        subtitle="Curate video walkthroughs, formula sheets, and worked examples linked to curriculum chapters"
        actions={
          <button
            type="button"
            disabled={!activeTopicId}
            onClick={() => {
              setForm(emptyForm)
              setErrors({})
              setSaveError(null)
              setModalOpen(true)
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>+</span>
            <span>Add Learning Asset</span>
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

        {actionError && <ErrorState message={actionError} />}

        {/* 1. TOP SELECTION CONTROLS */}
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
                  <option value="">No topics in this subject</option>
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

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              placeholder="Search resource title or link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-blue-500 focus:outline-hidden shadow-2xs"
            />
            <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* 2. RESOURCE TYPE FILTER TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Resources', count: counts.all },
              { id: 'video', label: '🎥 Videos', count: counts.video },
              { id: 'note', label: '📄 Concept Notes', count: counts.note },
              { id: 'example', label: '💡 Worked Examples', count: counts.example },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                  activeTypeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTypeFilter === tab.id ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Attached to: <strong className="text-slate-800">{activeTopicObj?.title || 'Select topic'}</strong>
          </p>
        </div>

        {resourcesApi.status === 'loading' && <LoadingState label="Loading resources..." rows={4} />}
        {resourcesApi.status === 'error' && (
          <ErrorState message={resourcesApi.error.message} onRetry={resourcesApi.refetch} />
        )}

        {/* 3. RESOURCE CARDS LIST */}
        {(!activeTopicId || resourcesApi.status === 'success') && (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Curated Learning Assets ({filteredResources.length})
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                Approved resources surface automatically in student recommendations
              </span>
            </div>

            {filteredResources.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No resources found"
                  description="Add a video walkthrough, concept note, or worked example for this chapter."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredResources.map((res) => {
                  const conf = TYPE_CONFIG[res.resource_type] || TYPE_CONFIG.video
                  const diff = DIFFICULTY_BADGE[res.difficulty] || DIFFICULTY_BADGE[1]
                  return (
                    <div key={res.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 flex-1">
                          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                            {conf.icon}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${conf.color}`}
                              >
                                {conf.label}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${diff.cls}`}
                              >
                                {diff.label}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleToggleApproved(res)}
                                title="Click to toggle student visibility"
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                                  res.approved
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {res.approved ? '✓ Approved' : 'Draft'}
                              </button>
                            </div>

                            <h3 className="font-display text-sm sm:text-base font-bold text-slate-900">
                              {res.title}
                            </h3>

                            {res.description && (
                              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                                {res.description}
                              </p>
                            )}

                            <div className="pt-1">
                              <a
                                href={res.url_or_path}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline max-w-lg truncate"
                              >
                                <span>🔗</span>
                                <span className="truncate">{res.url_or_path}</span>
                                <span className="text-[10px] text-slate-400">↗</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center gap-2 shrink-0">
                          <a
                            href={res.url_or_path}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <span>Open</span>
                            <span>↗</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setRemoveTarget(res)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>🗑️</span>
                            <span>Remove</span>
                          </button>
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

      {/* ADD LEARNING ASSET MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Attach Learning Asset
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

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Asset Format</label>
                  <select
                    value={form.resource_type}
                    onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800"
                  >
                    <option value="video">🎥 Video Lesson</option>
                    <option value="note">📄 Concept Notes</option>
                    <option value="example">💡 Worked Examples</option>
                    <option value="summary">📝 Summary Sheet</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Difficulty Tier</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800"
                  >
                    <option value="1">Level 1 · Foundational Support</option>
                    <option value="2">Level 2 · Skill Practice</option>
                    <option value="3">Level 3 · Deep Dive / Challenge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Asset Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Visualizing Fraction Addition with Number Lines"
                  className={`w-full p-2.5 rounded-xl border text-slate-800 font-medium ${
                    errors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Resource URL or Path <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.url_or_path}
                  onChange={(e) => setForm({ ...form, url_or_path: e.target.value })}
                  placeholder="https://... or /resources/guide.pdf"
                  className={`w-full p-2.5 rounded-xl border text-slate-800 font-medium ${
                    errors.url_or_path ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {errors.url_or_path && (
                  <p className="text-xs text-rose-600 mt-1">{errors.url_or_path}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pedagogical Note / Context
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="When should this resource be recommended to a student?"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.approved}
                  onChange={(e) => setForm({ ...form, approved: e.target.checked })}
                />
                <span>Approve immediately for student study recommendations</span>
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
                {saving ? 'Saving...' : 'Add to Curriculum'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Remove Learning Asset</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete &ldquo;{removeTarget.title}&rdquo;? It will no longer appear in student recommendations.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Remove Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
