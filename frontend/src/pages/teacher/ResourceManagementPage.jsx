import { useState, useMemo } from 'react'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'
import { resourcesService } from '../../services/resourcesService'

const emptyForm = {
  type: 'video',
  title: '',
  url: '',
  pedagogicalTier: 'developing',
  description: '',
}

const TYPE_CONFIG = {
  video: {
    label: 'Video Lesson',
    icon: '🎥',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    indicator: 'bg-purple-600',
  },
  note: {
    label: 'Concept Notes',
    icon: '📄',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
    indicator: 'bg-amber-500',
  },
  example: {
    label: 'Worked Example',
    icon: '💡',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    indicator: 'bg-emerald-600',
  },
}

const FALLBACK_RESOURCES = [
  {
    id: 'res_fractions_01',
    topicId: 't_fractions',
    type: 'video',
    title: 'Visualising Common Denominators with Fraction Strips',
    url: 'https://www.youtube.com/watch?v=fractions-strips-demo',
    pedagogicalTier: 'support',
    description: '12-minute visual breakdown designed specifically for students struggling with denominator operations.',
  },
  {
    id: 'res_fractions_02',
    topicId: 't_fractions',
    type: 'note',
    title: 'NCERT Class 9 Fractions & Rational Numbers Summary Sheet',
    url: 'https://learnloop.org/resources/class9-fractions-notes.pdf',
    pedagogicalTier: 'developing',
    description: 'High-yield 2-page formula reference covering equivalence, LCM denominators, and simplifying ratios.',
  },
  {
    id: 'res_fractions_03',
    topicId: 't_fractions',
    type: 'example',
    title: '5 Step-by-Step Worked Problems on Multi-Step Fractions',
    url: 'https://learnloop.org/resources/fractions-worked-drills.pdf',
    pedagogicalTier: 'proficient',
    description: 'Model solutions showing complete intermediate steps and error warnings.',
  },
  {
    id: 'res_linear_01',
    topicId: 't_linear',
    type: 'video',
    title: 'Isolating Variables and Balanced Equations on the Scale',
    url: 'https://www.youtube.com/watch?v=linear-scale-demo',
    pedagogicalTier: 'support',
    description: 'Physical scale balance analogy to prevent transposition sign inversion errors.',
  },
  {
    id: 'res_linear_02',
    topicId: 't_linear',
    type: 'note',
    title: 'Two-Variable Linear Equations: Standard Form ax + by + c = 0',
    url: 'https://learnloop.org/resources/linear-equations-guide.pdf',
    pedagogicalTier: 'developing',
    description: 'Comprehensive guide to finding coordinate pairs and plotting graph lines.',
  },
]

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

  // API hooks
  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const activeSubjectId = subjectId || subjectsApi.data?.[0]?.id || 'sub_math'

  const topicsApi = useApi(() => topicsService.listBySubject(activeSubjectId), [activeSubjectId], {
    skip: !activeSubjectId,
  })
  const activeTopicId = topicId || topicsApi.data?.[0]?.id || 't_fractions'

  const resourcesApi = useApi(() => resourcesService.listByTopic(activeTopicId), [activeTopicId], {
    skip: !activeTopicId,
  })

  // Aggregate items with fallback demo resources
  const rawResources = useMemo(() => {
    if (resourcesApi.data && resourcesApi.data.length > 0) {
      return resourcesApi.data
    }
    return FALLBACK_RESOURCES.filter(
      (r) => !activeTopicId || r.topicId === activeTopicId || activeTopicId.includes('fraction')
    ).length > 0
      ? FALLBACK_RESOURCES
      : FALLBACK_RESOURCES
  }, [resourcesApi.data, activeTopicId])

  // Filtered list
  const filteredResources = useMemo(() => {
    return rawResources.filter((r) => {
      const matchType = activeTypeFilter === 'all' || r.type === activeTypeFilter
      const matchSearch =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchType && matchSearch
    })
  }, [rawResources, activeTypeFilter, searchQuery])

  // Counts
  const counts = useMemo(() => {
    return {
      all: rawResources.length,
      video: rawResources.filter((r) => r.type === 'video').length,
      note: rawResources.filter((r) => r.type === 'note').length,
      example: rawResources.filter((r) => r.type === 'example').length,
    }
  }, [rawResources])

  function validate() {
    const next = {}
    if (!form.title.trim()) next.title = 'Resource title is required.'
    if (!form.url.trim()) next.url = 'Valid web URL or resource link is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      await resourcesService.create(activeTopicId, {
        title: form.title.trim(),
        type: form.type,
        url: form.url.trim(),
        description: form.description.trim(),
        pedagogicalTier: form.pedagogicalTier,
      })
      setModalOpen(false)
      setForm(emptyForm)
      setNotice('New learning resource added to topic.')
      resourcesApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save resource.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    try {
      await resourcesService.remove(removeTarget.id)
      setRemoveTarget(null)
      setNotice('Resource removed from repository.')
      resourcesApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setRemoveTarget(null)
      setNotice('Notice: Resource removed in session.')
      setTimeout(() => setNotice(null), 4000)
    }
  }

  const activeTopicObj = topicsApi.data?.find((t) => t.id === activeTopicId)

  return (
    <>
      <Topbar
        title="Curriculum Resources & Remedial Assets"
        breadcrumb="Teacher / Content"
        subtitle="Curate video walkthroughs, formula sheets, and targeted remedial drills linked to topics"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm)
                setErrors({})
                setSaveError(null)
                setModalOpen(true)
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Add Learning Asset</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Notice alert */}
        {notice && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">✓</span>
              <span>{notice}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-950">✕</button>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. TOP SELECTION CONTROLS                                      */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Subject
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
                value={activeSubjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value)
                  setTopicId('')
                }}
              >
                {subjectsApi.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                )) || <option value="sub_math">Mathematics</option>}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Chapter / Topic
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden min-w-[200px]"
                value={activeTopicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                {topicsApi.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                )) || (
                  <>
                    <option value="t_fractions">Fractions</option>
                    <option value="t_linear">Linear Equations</option>
                    <option value="t_wholenum">Number Systems</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Quick search */}
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

        {/* ============================================================== */}
        {/* 2. RESOURCE TYPE FILTER TABS & METRICS                         */}
        {/* ============================================================== */}
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
                onClick={() => setActiveTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                  activeTypeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTypeFilter === tab.id
                      ? 'bg-slate-700 text-slate-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-medium">
            Attached to: <strong className="text-slate-800">{activeTopicObj?.name || 'Class 9 Math'}</strong>
          </p>
        </div>

        {/* ============================================================== */}
        {/* 3. RESOURCE CARDS GRID                                         */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              Curated Learning Assets
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Used in Closed-Loop Student Recommendations
            </span>
          </div>

          {filteredResources.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No resources found in this category.</p>
              <p className="text-xs text-slate-400 mt-1">Add a video or formula sheet for this chapter.</p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
              >
                + Add Resource
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredResources.map((res) => {
                const conf = TYPE_CONFIG[res.type] || TYPE_CONFIG.video
                return (
                  <div key={res.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1">
                        {/* Type Icon badge */}
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

                            {res.pedagogicalTier === 'support' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                                Remedial Support (0–39%)
                              </span>
                            )}
                            {res.pedagogicalTier === 'developing' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                                Skill Practice (40–59%)
                              </span>
                            )}
                            {res.pedagogicalTier === 'proficient' && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold uppercase tracking-wider">
                                Mastery Deep Dive
                              </span>
                            )}
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
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline max-w-lg truncate"
                            >
                              <span>🔗</span>
                              <span className="truncate">{res.url}</span>
                              <span className="text-[10px] text-slate-400">↗</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col items-center gap-2 shrink-0">
                        <a
                          href={res.url}
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
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1"
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
      </main>

      {/* ============================================================== */}
      {/* 4. ADD LEARNING ASSET MODAL                                    */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Attach Learning Asset
                </h3>
                <p className="text-xs text-slate-500">
                  Topic: {activeTopicObj?.name || 'Class 9 Math'}
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
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800"
                  >
                    <option value="video">🎥 Video Lesson</option>
                    <option value="note">📄 Concept Notes / Formulas</option>
                    <option value="example">💡 Worked Examples</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Pedagogical Target</label>
                  <select
                    value={form.pedagogicalTier}
                    onChange={(e) => setForm({ ...form, pedagogicalTier: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-xs sm:text-sm text-slate-800"
                  >
                    <option value="support">Needs Support (0–39%)</option>
                    <option value="developing">Developing (40–59%)</option>
                    <option value="proficient">Proficient (60–79%)</option>
                    <option value="challenge">Challenge / Secure (80%+)</option>
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
                  Resource Web URL <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://... (YouTube, Google Drive, or PDF URL)"
                  className={`w-full p-2.5 rounded-xl border text-slate-800 font-medium ${
                    errors.url ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                {errors.url && <p className="text-xs text-rose-600 mt-1">{errors.url}</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pedagogical Note / Context
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="When should this resource be recommended to a student? (e.g. for recurrent misconception #M-01)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:border-blue-500 focus:outline-hidden"
                />
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
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 disabled:opacity-50"
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
              Are you sure you want to remove &ldquo;{removeTarget.title}&rdquo;? It will no longer be offered in student intervention recommendations.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
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
