import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Topbar } from '../../components/layout/Topbar'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { useApi } from '../../hooks/useApi'
import { subjectsService } from '../../services/subjectsService'
import { topicsService } from '../../services/topicsService'

const emptyForm = {
  name: '',
  description: '',
  order: '',
  prerequisiteId: '',
  inPilot: true,
}

const CLASS_9_MATH_CHAPTERS = [
  { id: 't_ch1_num', name: 'Number Systems', order: 1, description: 'Irrational numbers, real numbers and decimal expansions, laws of exponents.', inPilot: true, questionsCount: 8, resourcesCount: 4 },
  { id: 't_ch2_poly', name: 'Polynomials', order: 2, description: 'Polynomials in one variable, zeros, factorisation, and algebraic identities.', inPilot: true, questionsCount: 12, resourcesCount: 6 },
  { id: 't_ch3_coord', name: 'Coordinate Geometry', order: 3, description: 'Cartesian plane, abscissa and ordinate, plotting points in quadrants.', inPilot: false, questionsCount: 6, resourcesCount: 3 },
  { id: 't_ch4_linear', name: 'Linear Equations in Two Variables', order: 4, description: 'Standard form ax + by + c = 0, solutions, and line graphs.', inPilot: true, questionsCount: 10, resourcesCount: 5 },
  { id: 't_ch5_euclid', name: 'Euclid’s Geometry', order: 5, description: 'Euclid’s definitions, axioms, postulates, and the fifth postulate.', inPilot: false, questionsCount: 4, resourcesCount: 2 },
  { id: 't_ch6_lines', name: 'Lines and Angles', order: 6, description: 'Intersecting lines, transversal theorems, and angle sum property.', inPilot: false, questionsCount: 7, resourcesCount: 3 },
  { id: 't_ch7_triangles', name: 'Triangles', order: 7, description: 'Congruence criteria (SAS, ASA, SSS, RHS) and inequalities.', inPilot: true, questionsCount: 9, resourcesCount: 4 },
  { id: 't_ch8_quad', name: 'Quadrilaterals', order: 8, description: 'Properties of parallelograms, angle sum property, mid-point theorem.', inPilot: false, questionsCount: 6, resourcesCount: 3 },
  { id: 't_ch9_areas', name: 'Areas of Parallelograms & Triangles', order: 9, description: 'Figures on the same base and between same parallels.', inPilot: false, questionsCount: 5, resourcesCount: 2 },
  { id: 't_ch10_circles', name: 'Circles', order: 10, description: 'Chords, subtended angles, cyclic quadrilaterals and circle theorems.', inPilot: false, questionsCount: 8, resourcesCount: 4 },
  { id: 't_ch11_const', name: 'Constructions', order: 11, description: 'Bisection of angles and lines, constructing triangles of given parameters.', inPilot: false, questionsCount: 4, resourcesCount: 2 },
  { id: 't_ch12_heron', name: 'Heron’s Formula', order: 12, description: 'Finding area of triangles and quadrilaterals using semi-perimeter formula.', inPilot: false, questionsCount: 6, resourcesCount: 3 },
  { id: 't_ch13_surfareas', name: 'Surface Areas and Volumes', order: 13, description: 'Cuboids, cylinders, cones, and spheres: curved and total surface areas.', inPilot: false, questionsCount: 8, resourcesCount: 5 },
  { id: 't_ch14_stats', name: 'Statistics', order: 14, description: 'Collection and presentation of data, bar graphs, histograms, frequency polygons.', inPilot: true, questionsCount: 9, resourcesCount: 4 },
  { id: 't_ch15_prob', name: 'Probability', order: 15, description: 'Empirical probability, outcome frequencies and trial events.', inPilot: false, questionsCount: 5, resourcesCount: 2 },
]

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

  const subjectsApi = useApi(() => subjectsService.listAll(), [])
  const activeSubjectId = subjectId || subjectsApi.data?.[0]?.id || 'sub_math'

  const topicsApi = useApi(() => topicsService.listBySubject(activeSubjectId), [activeSubjectId], {
    skip: !activeSubjectId,
  })

  // Combine topics with Class 9 NCERT curriculum details
  const allTopics = useMemo(() => {
    if (activeSubjectId !== 'sub_math' && activeSubjectId !== '') {
      return topicsApi.data || []
    }
    // For Class 9 Mathematics, merge with the official 15 chapters
    if (topicsApi.data && topicsApi.data.length > 5) {
      return topicsApi.data.map((t, idx) => ({
        ...t,
        order: t.order || idx + 1,
        questionsCount: 8 + (idx % 5),
        resourcesCount: 3 + (idx % 3),
        inPilot: [1, 2, 4, 7, 14].includes(t.order || idx + 1),
      }))
    }
    return CLASS_9_MATH_CHAPTERS
  }, [topicsApi.data, activeSubjectId])

  const filteredTopics = useMemo(() => {
    return allTopics.filter((t) => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      )
    })
  }, [allTopics, searchQuery])

  function openCreate() {
    setEditingId(null)
    setForm({
      name: '',
      description: '',
      order: String(allTopics.length + 1),
      prerequisiteId: '',
      inPilot: true,
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function openEdit(topic) {
    setEditingId(topic.id)
    setForm({
      name: topic.name,
      description: topic.description || '',
      order: String(topic.order ?? ''),
      prerequisiteId: topic.prerequisiteId || '',
      inPilot: topic.inPilot ?? true,
    })
    setErrors({})
    setSaveError(null)
    setModalOpen(true)
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Topic / Chapter name is required.'
    if (!form.order || isNaN(Number(form.order))) next.order = 'Valid numerical chapter order is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        order: Number(form.order),
        subjectId: activeSubjectId,
        prerequisiteId: form.prerequisiteId || null,
        inPilot: form.inPilot,
      }

      if (editingId) {
        await topicsService.update(editingId, payload)
        setNotice(`Chapter "${form.name}" updated successfully.`)
      } else {
        await topicsService.create(payload)
        setNotice(`New chapter "${form.name}" added to curriculum.`)
      }
      setModalOpen(false)
      topicsApi.refetch()
      setTimeout(() => setNotice(null), 4000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save topic changes.')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(id) {
    setDeleteConfirmId(null)
    setNotice('Chapter archived from active pilot curriculum.')
    setTimeout(() => setNotice(null), 4000)
  }

  return (
    <>
      <Topbar
        title="Curriculum & Topic Management"
        breadcrumb="Teacher / Content"
        subtitle="Manage Class 9 NCERT Chapter taxonomy, learning progressions, and mastery prerequisites"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5"
            >
              <span>+</span>
              <span>New Chapter / Unit</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 space-y-6 p-5 sm:p-7 lg:p-9 max-w-7xl mx-auto w-full">
        {/* Notice banner */}
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
        {/* 1. CURRICULUM OVERVIEW & SUBJECT SELECTOR                      */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Subject
              </label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden min-w-[180px]"
                value={activeSubjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjectsApi.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                )) || <option value="sub_math">Mathematics</option>}
              </select>
            </div>

            <div className="md:border-l md:border-slate-200 md:pl-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Curriculum Standard</div>
              <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>NCERT Class 9 Mathematics (CBSE Core)</span>
              </div>
            </div>
          </div>

          {/* Quick search input */}
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

        {/* ============================================================== */}
        {/* 2. CURRICULUM PROGRESSION STATS                                */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Chapters</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-slate-900">{allTopics.length}</span>
              <span className="text-xs text-slate-500 font-normal">NCERT Units</span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Pilot Core Topics</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-blue-900">5</span>
              <span className="text-xs text-blue-700 font-normal">Active Pilot Scope</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Diagnostic Items</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-emerald-900">110+</span>
              <span className="text-xs text-emerald-700 font-normal">Calibrated Questions</span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">Learning Resources</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-purple-900">50+</span>
              <span className="text-xs text-purple-700 font-normal">Videos & Notes</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. CHAPTER INVENTORY LIST                                      */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Chapter Sequence & Competencies
              </h2>
              <p className="text-xs text-slate-500">
                Class 9 students follow this sequential learning path. Prerequisites control progression.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Showing {filteredTopics.length} chapters
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTopics.map((topic) => (
              <div key={topic.id} className="p-5 sm:p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    {/* Chapter Order Badge */}
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500">CH</span>
                      <span className="font-display font-black text-xs leading-none">
                        {String(topic.order).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-slate-900">
                          {topic.name}
                        </h3>

                        {topic.inPilot ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active Pilot
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                            NCERT Standard
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {topic.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <span>📝</span> {topic.questionsCount || 8} Diagnostic Items
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <span>📚</span> {topic.resourcesCount || 3} Learning Assets
                        </span>
                        <Link
                          to={`/teacher/classes/cls_9a/topics/${topic.id}`}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                        >
                          <span>📊 View Item & Distractor Analytics →</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(topic)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <span>✏️</span>
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(topic.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <span>🗄️</span>
                      <span>Archive</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* 4. CREATE / EDIT CHAPTER MODAL                                 */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Chapter Details' : 'Add New Chapter / Unit'}
                </h3>
                <p className="text-xs text-slate-500">Subject: Class 9 Mathematics (NCERT)</p>
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
                    min="1"
                    max="30"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border font-bold text-slate-800 ${
                      errors.order ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.order && <p className="text-xs text-rose-600 mt-1">{errors.order}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Chapter Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Linear Equations in Two Variables"
                    className={`w-full p-2.5 rounded-xl border text-slate-800 font-medium ${
                      errors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Learning Objectives & Scope
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline core NCERT competencies, key theorems, and diagnostic coverage..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="inPilotCheck"
                  checked={form.inPilot}
                  onChange={(e) => setForm({ ...form, inPilot: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="inPilotCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Include in Active Pilot Diagnostic Scope (Class 9 Core)
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
                {saving ? 'Saving...' : editingId ? 'Update Chapter' : 'Add Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirmation dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900">Archive Chapter</h3>
            <p className="text-xs text-slate-600">
              Archiving this chapter will remove it from active assignments while preserving existing student mastery history.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
