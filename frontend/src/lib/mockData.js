// In-memory mock data + request router for the Teacher/Admin side.
//
// No backend exists yet for these endpoints, so `apiClient.js` routes every
// request through here instead of hitting the network when
// VITE_API_BASE_URL is unset. Everything below is fake/static demo data —
// no real student information, no real network calls, no persistence
// beyond the current browser session (a refresh resets it).
//
// This mirrors the shape every services/*.js function already expects, so
// no service or page needed to change.

function delay(data, ms = 280) {
  return new Promise((resolve) => setTimeout(() => resolve(JSON.parse(JSON.stringify(data))), ms))
}

function fail(message, status = 404) {
  const err = new Error(message)
  err.status = status
  return Promise.reject(err)
}

// Deterministic pseudo-random number in [0, 1) seeded by a string, so the
// same student/topic combination always renders the same mastery value
// instead of jumping around on every refetch.
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  h = Math.abs(h)
  return (h % 1000) / 1000
}

function masteryFor(studentId, topicId) {
  const r = seededRandom(`${studentId}:${topicId}`)
  return Math.round(20 + r * 78)
}

let idCounter = 1000
function nextId(prefix) {
  idCounter += 1
  return `${prefix}_${idCounter}`
}

/* ------------------------------ Seed data ------------------------------ */

const subjects = [
  { id: 'sub_math', name: 'Mathematics' },
  { id: 'sub_sci', name: 'Science' },
  { id: 'sub_eng', name: 'English' },
  { id: 'sub_soc', name: 'Social Studies' },
]

const topics = [
  { id: 't_wholenum', subjectId: 'sub_math', name: 'Whole Numbers', description: 'Place value, operations and estimation with whole numbers.', order: 1 },
  { id: 't_fractions', subjectId: 'sub_math', name: 'Fractions', description: 'Equivalence, comparison and the four operations on fractions.', order: 2 },
  { id: 't_linear', subjectId: 'sub_math', name: 'Linear Equations', description: 'Solving one- and two-step linear equations.', order: 3 },
  { id: 't_quad', subjectId: 'sub_math', name: 'Quadratic Basics', description: 'Introduction to quadratic expressions and factoring.', order: 4 },
  { id: 't_coord', subjectId: 'sub_math', name: 'Coordinate Geometry', description: 'Plotting points, distance and midpoint on the coordinate plane.', order: 5 },
  { id: 't_wordprob', subjectId: 'sub_math', name: 'Word Problems', description: 'Translating written scenarios into solvable equations.', order: 6 },

  { id: 't_photo', subjectId: 'sub_sci', name: 'Photosynthesis', description: 'How plants convert light energy into chemical energy.', order: 1 },
  { id: 't_cell', subjectId: 'sub_sci', name: 'Cell Structure', description: 'Organelles and their functions in plant and animal cells.', order: 2 },
  { id: 't_newton', subjectId: 'sub_sci', name: "Newton's Laws", description: 'The three laws of motion and everyday examples.', order: 3 },
  { id: 't_chemrx', subjectId: 'sub_sci', name: 'Chemical Reactions', description: 'Balancing equations and types of chemical reactions.', order: 4 },
  { id: 't_ecosys', subjectId: 'sub_sci', name: 'Ecosystems', description: 'Food webs, energy flow and interdependence.', order: 5 },

  { id: 't_tenses', subjectId: 'sub_eng', name: 'Grammar — Tenses', description: 'Past, present and future tense usage.', order: 1 },
  { id: 't_reading', subjectId: 'sub_eng', name: 'Reading Comprehension', description: 'Identifying main ideas and inference in passages.', order: 2 },
  { id: 't_essay', subjectId: 'sub_eng', name: 'Essay Writing', description: 'Structuring an argument with an intro, body and conclusion.', order: 3 },
  { id: 't_vocab', subjectId: 'sub_eng', name: 'Vocabulary Building', description: 'Context clues, roots, prefixes and suffixes.', order: 4 },

  { id: 't_geo', subjectId: 'sub_soc', name: 'World Geography', description: 'Continents, climate zones and physical features.', order: 1 },
  { id: 't_civics', subjectId: 'sub_soc', name: 'Civics Basics', description: 'How local and national government works.', order: 2 },
  { id: 't_history1', subjectId: 'sub_soc', name: 'Early Civilizations', description: 'River-valley civilizations and their legacies.', order: 3 },
]

const teachers = [
  { id: 'demo-teacher-1', name: 'Alex Rivera', email: 'teacher@demo.com' },
  { id: 'teacher_002', name: 'Priya Nair', email: 'priya.nair@learnloop.edu' },
  { id: 'teacher_003', name: 'Marcus Chen', email: 'marcus.chen@learnloop.edu' },
  { id: 'teacher_004', name: 'Sofia Torres', email: 'sofia.torres@learnloop.edu' },
]

const cohorts = {
  cohort_9a: { grade: 'Grade 9', section: 'A' },
  cohort_9b: { grade: 'Grade 9', section: 'B' },
  cohort_10a: { grade: 'Grade 10', section: 'A' },
  cohort_10b: { grade: 'Grade 10', section: 'B' },
}

const studentNames = [
  'Aanya Sharma', 'Rohan Verma', 'Meera Iyer', 'Kabir Singh', 'Ishita Rao',
  'Aditya Kapoor', 'Diya Patel', 'Vivaan Nair', 'Ananya Gupta', 'Arjun Mehta',
  'Sara Khan', 'Neha Joshi', 'Karan Malhotra', 'Priyanka Das', 'Yash Chopra',
  'Riya Bansal', 'Zoya Ahmed', 'Dev Kulkarni', 'Tanvi Reddy', 'Ayaan Sheikh',
  'Naveen Pillai', 'Kavya Menon', 'Farhan Ali', 'Simran Kaur', 'Rahul Bose',
  'Ipsita Mishra', 'Vikram Rao', 'Lakshmi Pillai', 'Omar Farooqi', 'Anjali Desai',
  'Nikhil Anand', 'Pooja Reddy', 'Sameer Iqbal', 'Trisha Ghosh', 'Manav Chawla',
]

const cohortAssignments = [
  ['cohort_9a', 8], ['cohort_9b', 7], ['cohort_10a', 8], ['cohort_10b', 6],
]

const students = []
{
  let nameIdx = 0
  cohortAssignments.forEach(([cohortId, count]) => {
    for (let i = 0; i < count; i++) {
      const name = studentNames[nameIdx % studentNames.length]
      nameIdx += 1
      const id = `stu_${String(students.length + 1).padStart(3, '0')}`
      const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@learnloop.edu`
      students.push({ id, name, email, cohortId })
    }
  })
}

function cohortLabel(cohortId) {
  const c = cohorts[cohortId]
  return c ? `${c.grade} - ${c.section}` : '—'
}

const classes = [
  { id: 'cls_001', cohortId: 'cohort_9a', subjectId: 'sub_math', teacherId: 'demo-teacher-1' },
  { id: 'cls_002', cohortId: 'cohort_9b', subjectId: 'sub_math', teacherId: 'demo-teacher-1' },
  { id: 'cls_003', cohortId: 'cohort_10a', subjectId: 'sub_sci', teacherId: 'demo-teacher-1' },
  { id: 'cls_004', cohortId: 'cohort_9a', subjectId: 'sub_eng', teacherId: 'teacher_002' },
  { id: 'cls_005', cohortId: 'cohort_10b', subjectId: 'sub_soc', teacherId: 'teacher_003' },
  { id: 'cls_006', cohortId: 'cohort_9b', subjectId: 'sub_sci', teacherId: 'teacher_003' },
]

function subjectName(subjectId) {
  return subjects.find((s) => s.id === subjectId)?.name || 'Unknown subject'
}

function classDisplayName(cls) {
  return cohortLabel(cls.cohortId)
}

function studentsInCohort(cohortId) {
  return students.filter((s) => s.cohortId === cohortId)
}

function topicsForSubject(subjectId) {
  return topics.filter((t) => t.subjectId === subjectId).sort((a, b) => a.order - b.order)
}

const THRESHOLD = 60

const errorPatternPool = [
  'Sign errors when isolating variables',
  'Confusing reactants and products',
  'Misreading word problems into equations',
  'Mixing up past and present tense verbs',
  'Dropping units in multi-step conversions',
  'Confusing area and perimeter formulas',
  'Skipping the distributive step',
  'Mixing up cause and effect in reading passages',
]

const recommendedActivities = [
  'Small-group re-teach session',
  'Assign remedial practice set',
  '1:1 walkthrough with worked examples',
  'Peer tutoring pair-up',
  'Short video review + follow-up quiz',
]

// Interventions are generated once per class the first time they're
// requested, then kept in memory so accept/dismiss actions persist for the
// session.
const interventionsByClass = {}

function generateInterventionsForClass(classId) {
  const cls = classes.find((c) => c.id === classId)
  if (!cls) return []
  const clsTopics = topicsForSubject(cls.subjectId)
  const roster = studentsInCohort(cls.cohortId)
  const list = []
  clsTopics.forEach((topic, i) => {
    const masteries = roster.map((s) => ({ student: s, mastery: masteryFor(s.id, topic.id) }))
    const avg = Math.round(masteries.reduce((sum, m) => sum + m.mastery, 0) / masteries.length)
    const below = masteries.filter((m) => m.mastery < THRESHOLD)
    // Only the lowest 1-2 topics per class generate a suggested intervention.
    if (avg < THRESHOLD - 5 && below.length >= 2) {
      list.push({
        id: nextId('intv'),
        classId,
        topicId: topic.id,
        topicName: topic.name,
        affectedCount: below.length,
        threshold: THRESHOLD,
        status: 'suggested',
        mainErrorPattern: errorPatternPool[(i + roster.length) % errorPatternPool.length],
        recommendedActivity: recommendedActivities[i % recommendedActivities.length],
        recommendedPracticeSet: `Practice Set ${String.fromCharCode(65 + i)}${i + 1} — ${topic.name}`,
        affectedStudents: below.map((m) => ({ id: m.student.id, name: m.student.name, mastery: m.mastery })),
      })
    }
  })
  return list
}

function getInterventionsForClass(classId) {
  if (!interventionsByClass[classId]) {
    interventionsByClass[classId] = generateInterventionsForClass(classId)
  }
  return interventionsByClass[classId]
}

function findIntervention(interventionId) {
  for (const classId of Object.keys(interventionsByClass)) {
    const found = interventionsByClass[classId].find((i) => i.id === interventionId)
    if (found) return found
  }
  // Not generated yet — search all classes.
  for (const cls of classes) {
    const list = getInterventionsForClass(cls.id)
    const found = list.find((i) => i.id === interventionId)
    if (found) return found
  }
  return null
}

// Per-student manual notes / assigned practice / dismissed error patterns,
// kept in memory for the session.
const studentNotes = {}
const overriddenPatterns = {}

// Questions and resources, keyed by topic id, seeded with a couple of
// realistic entries per topic so the content-management pages aren't empty.
const questionsByTopic = {}
const resourcesByTopic = {}

function seedQuestionsForTopic(topicId, topicName) {
  return [
    {
      id: nextId('q'),
      topicId,
      text: `Which of the following best demonstrates a key idea in "${topicName}"?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 1,
      explanation: `Option B correctly applies the core concept from ${topicName}.`,
      hint: 'Re-read the topic summary before answering.',
      difficulty: 'medium',
      skillTags: [topicName.split(' ')[0].toLowerCase()],
      errorPatternTags: [],
    },
    {
      id: nextId('q'),
      topicId,
      text: `A common mistake students make in "${topicName}" is skipping a step — which step is it?`,
      options: ['Reading the question twice', 'Checking units', 'Simplifying first', 'Showing work'],
      correctIndex: 2,
      explanation: 'Simplifying first prevents compounding errors later in the solution.',
      hint: 'Think about what makes later steps easier.',
      difficulty: 'easy',
      skillTags: [topicName.split(' ')[0].toLowerCase()],
      errorPatternTags: ['skips-simplification'],
    },
  ]
}

function seedResourcesForTopic(topicId, topicName) {
  return [
    { id: nextId('res'), topicId, type: 'video', title: `Intro video: ${topicName}`, url: 'https://example.com/video' },
    { id: nextId('res'), topicId, type: 'note', title: `Worked notes: ${topicName}`, url: 'https://example.com/notes' },
  ]
}

function getQuestionsForTopic(topicId) {
  if (!questionsByTopic[topicId]) {
    const topic = topics.find((t) => t.id === topicId)
    questionsByTopic[topicId] = seedQuestionsForTopic(topicId, topic?.name || 'this topic')
  }
  return questionsByTopic[topicId]
}

function getResourcesForTopic(topicId) {
  if (!resourcesByTopic[topicId]) {
    const topic = topics.find((t) => t.id === topicId)
    resourcesByTopic[topicId] = seedResourcesForTopic(topicId, topic?.name || 'this topic')
  }
  return resourcesByTopic[topicId]
}

/* ------------------------------ Derived views ------------------------------ */

function teacherSummary(teacher) {
  const classCount = classes.filter((c) => c.teacherId === teacher.id).length
  return { ...teacher, classCount }
}

function classSummary(cls) {
  const roster = studentsInCohort(cls.cohortId)
  const clsTopics = topicsForSubject(cls.subjectId)
  const avg =
    roster.length && clsTopics.length
      ? Math.round(
          roster.reduce((sum, s) => sum + clsTopics.reduce((tSum, t) => tSum + masteryFor(s.id, t.id), 0) / clsTopics.length, 0) /
            roster.length
        )
      : null
  return {
    id: cls.id,
    name: classDisplayName(cls),
    gradeLevel: cohorts[cls.cohortId]?.grade || '—',
    subjectId: cls.subjectId,
    subjectName: subjectName(cls.subjectId),
    teacherId: cls.teacherId,
    studentCount: roster.length,
    averageMastery: avg,
  }
}

function studentSummary(student) {
  const cls = classes.find((c) => c.cohortId === student.cohortId)
  return { id: student.id, name: student.name, email: student.email, className: cohortLabel(student.cohortId), classId: cls?.id }
}

function subjectSummary(subject) {
  return { id: subject.id, name: subject.name, topicCount: topicsForSubject(subject.id).length }
}

/* -------------------------------- Router -------------------------------- */

const routes = [
  // Auth (demo accounts already short-circuit in authService; these are
  // just safe fallbacks so nothing throws if ever reached).
  { method: 'POST', pattern: /^\/auth\/login$/, handler: () => fail('Invalid credentials.', 401) },
  { method: 'POST', pattern: /^\/auth\/logout$/, handler: () => delay({ success: true }) },
  { method: 'GET', pattern: /^\/auth\/me$/, handler: () => fail('Not signed in.', 401) },

  // Admin: teachers
  { method: 'GET', pattern: /^\/admin\/teachers$/, handler: () => delay(teachers.map(teacherSummary)) },
  {
    method: 'POST',
    pattern: /^\/admin\/teachers$/,
    handler: (m, body) => {
      const t = { id: nextId('teacher'), name: body.name, email: body.email }
      teachers.push(t)
      return delay(teacherSummary(t))
    },
  },

  // Admin: assignments
  {
    method: 'POST',
    pattern: /^\/admin\/assignments\/teacher$/,
    handler: (m, body) => {
      const cls = classes.find((c) => c.id === body.classId)
      if (cls) cls.teacherId = body.teacherId
      return delay({ success: true })
    },
  },
  {
    method: 'POST',
    pattern: /^\/admin\/assignments\/enrollment$/,
    handler: (m, body) => {
      const student = students.find((s) => s.id === body.studentId)
      const cls = classes.find((c) => c.id === body.classId)
      if (student && cls) student.cohortId = cls.cohortId
      return delay({ success: true })
    },
  },

  // Teacher/analytics
  {
    method: 'GET',
    pattern: /^\/teacher\/classes\/([^/]+)\/topics\/([^/]+)\/analytics$/,
    handler: ([, classId, topicId]) => {
      const cls = classes.find((c) => c.id === classId)
      const topic = topics.find((t) => t.id === topicId)
      if (!cls || !topic) return fail('Class or topic not found.')
      const roster = studentsInCohort(cls.cohortId)
      const masteries = roster.map((s) => masteryFor(s.id, topic.id))
      const low = masteries.filter((v) => v < 40).length
      const medium = masteries.filter((v) => v >= 40 && v < 70).length
      const high = masteries.filter((v) => v >= 70).length
      const qs = getQuestionsForTopic(topicId).map((q, i) => ({
        id: q.id,
        text: q.text,
        difficulty: q.difficulty,
        correctRate: Math.max(15, 90 - i * 22 - Math.round(seededRandom(q.id) * 20)),
        missedCount: Math.max(1, Math.round(roster.length * (0.15 + i * 0.12))),
      }))
      const patterns = errorPatternPool.slice(0, 2).map((label, i) => ({
        id: nextId('pat'),
        label,
        count: Math.max(1, Math.round(roster.length * (0.3 - i * 0.1))),
      }))
      return delay({
        topicName: topic.name,
        distribution: [
          { label: 'Low', students: low },
          { label: 'Medium', students: medium },
          { label: 'High', students: high },
        ],
        questions: qs,
        errorPatterns: patterns,
      })
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/([^/]+)\/error-patterns$/,
    handler: ([, studentId]) => {
      const patterns = errorPatternPool.slice(0, 3).map((label, i) => {
        const id = `${studentId}_pat_${i}`
        return { id, label, overridden: Boolean(overriddenPatterns[id]) }
      })
      return delay(patterns)
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/([^/]+)\/growth$/,
    handler: ([, studentId]) => {
      const points = [1, 2, 3, 4, 5].map((week) => ({
        label: `Week ${week}`,
        mastery: Math.max(10, Math.min(95, masteryFor(studentId, `week${week}`) - (5 - week) * 4)),
      }))
      return delay(points)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/student\/([^/]+)\/error-patterns\/([^/]+)$/,
    handler: ([, , patternId], body) => {
      overriddenPatterns[patternId] = Boolean(body?.overridden)
      return delay({ success: true })
    },
  },

  // Classes
  {
    method: 'GET',
    pattern: /^\/teacher\/([^/]+)\/classes$/,
    handler: ([, teacherId]) => delay(classes.filter((c) => c.teacherId === teacherId).map(classSummary)),
  },
  {
    method: 'GET',
    pattern: /^\/classes\/([^/]+)$/,
    handler: ([, classId]) => {
      const cls = classes.find((c) => c.id === classId)
      return cls ? delay(classSummary(cls)) : fail('Class not found.')
    },
  },
  { method: 'GET', pattern: /^\/admin\/classes$/, handler: () => delay(classes.map(classSummary)) },
  {
    method: 'POST',
    pattern: /^\/admin\/classes$/,
    handler: (m, body) => {
      const cohortId = nextId('cohort')
      cohorts[cohortId] = { grade: body.gradeLevel || 'Ungraded', section: '' }
      const cls = { id: nextId('cls'), cohortId, subjectId: subjects[0].id, teacherId: null, _name: body.name }
      classes.push(cls)
      const summary = classSummary(cls)
      return delay({ ...summary, name: body.name || summary.name })
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/admin\/classes\/([^/]+)$/,
    handler: ([, classId], body) => {
      const cls = classes.find((c) => c.id === classId)
      if (!cls) return fail('Class not found.')
      Object.assign(cls, body)
      return delay(classSummary(cls))
    },
  },

  // Interventions
  {
    method: 'GET',
    pattern: /^\/teacher\/classes\/([^/]+)\/interventions$/,
    handler: ([, classId]) => delay(getInterventionsForClass(classId)),
  },
  {
    method: 'GET',
    pattern: /^\/teacher\/interventions\/([^/]+)$/,
    handler: ([, interventionId]) => {
      const found = findIntervention(interventionId)
      return found ? delay(found) : fail('Intervention not found.')
    },
  },
  {
    method: 'POST',
    pattern: /^\/teacher\/interventions$/,
    handler: (m, body) => {
      const list = getInterventionsForClass(body.classId)
      const created = { id: nextId('intv'), status: 'suggested', affectedStudents: [], ...body }
      list.push(created)
      return delay(created)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/teacher\/interventions\/([^/]+)$/,
    handler: ([, interventionId], body) => {
      const found = findIntervention(interventionId)
      if (!found) return fail('Intervention not found.')
      Object.assign(found, body)
      return delay(found)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/teacher\/interventions\/([^/]+)\/assign$/,
    handler: ([, interventionId], body) => {
      const found = findIntervention(interventionId)
      if (!found) return fail('Intervention not found.')
      found.status = 'assigned'
      found.assignment = body
      return delay(found)
    },
  },

  // Mastery
  {
    method: 'GET',
    pattern: /^\/teacher\/classes\/([^/]+)\/mastery-heatmap$/,
    handler: ([, classId], body, params) => {
      const cls = classes.find((c) => c.id === classId)
      if (!cls) return fail('Class not found.')
      const clsTopics = topicsForSubject(cls.subjectId)
      const filteredTopics = params?.topicId ? clsTopics.filter((t) => t.id === params.topicId) : clsTopics
      const roster = studentsInCohort(cls.cohortId)
      const rows = roster.map((s) => {
        const mastery = {}
        clsTopics.forEach((t) => {
          mastery[t.id] = masteryFor(s.id, t.id)
        })
        const values = Object.values(mastery)
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        return { studentId: s.id, studentName: s.name, mastery, belowThreshold: avg < THRESHOLD }
      })
      const topicsWithAverage = filteredTopics.map((t) => {
        const values = roster.map((s) => masteryFor(s.id, t.id))
        return { id: t.id, name: t.name, average: Math.round(values.reduce((a, b) => a + b, 0) / values.length) }
      })
      return delay({
        className: classDisplayName(cls),
        subjectName: subjectName(cls.subjectId),
        threshold: THRESHOLD,
        topics: topicsWithAverage,
        rows,
      })
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/([^/]+)\/mastery\/([^/]+)\/history$/,
    handler: ([, studentId, topicId]) => {
      const points = [1, 2, 3, 4].map((week) => ({
        label: `Week ${week}`,
        mastery: Math.max(5, masteryFor(studentId, `${topicId}_w${week}`)),
      }))
      return delay(points)
    },
  },

  // Questions
  {
    method: 'GET',
    pattern: /^\/topics\/([^/]+)\/questions$/,
    handler: ([, topicId]) => delay(getQuestionsForTopic(topicId)),
  },
  {
    method: 'POST',
    pattern: /^\/questions$/,
    handler: (m, body) => {
      const q = { id: nextId('q'), ...body }
      const list = getQuestionsForTopic(body.topicId)
      list.push(q)
      return delay(q)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/questions\/([^/]+)$/,
    handler: ([, questionId], body) => {
      for (const topicId of Object.keys(questionsByTopic)) {
        const q = questionsByTopic[topicId].find((item) => item.id === questionId)
        if (q) {
          Object.assign(q, body)
          return delay(q)
        }
      }
      return fail('Question not found.')
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/questions\/([^/]+)$/,
    handler: ([, questionId]) => {
      for (const topicId of Object.keys(questionsByTopic)) {
        const idx = questionsByTopic[topicId].findIndex((item) => item.id === questionId)
        if (idx !== -1) {
          questionsByTopic[topicId].splice(idx, 1)
          return delay({ success: true })
        }
      }
      return fail('Question not found.')
    },
  },

  // Reports
  { method: 'POST', pattern: /^\/reports\/class$/, handler: () => delay({ jobId: nextId('job'), status: 'ready', downloadUrl: '#' }, 600) },
  { method: 'POST', pattern: /^\/reports\/students$/, handler: () => delay({ jobId: nextId('job'), status: 'ready', downloadUrl: '#' }, 600) },
  { method: 'GET', pattern: /^\/reports\/jobs\/([^/]+)$/, handler: ([, jobId]) => delay({ jobId, status: 'ready', downloadUrl: '#' }) },

  // Resources
  {
    method: 'GET',
    pattern: /^\/topics\/([^/]+)\/resources$/,
    handler: ([, topicId]) => delay(getResourcesForTopic(topicId)),
  },
  {
    method: 'POST',
    pattern: /^\/topics\/([^/]+)\/resources$/,
    handler: ([, topicId], body) => {
      const r = { id: nextId('res'), topicId, ...body }
      getResourcesForTopic(topicId).push(r)
      return delay(r)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/resources\/([^/]+)$/,
    handler: ([, resourceId], body) => {
      for (const topicId of Object.keys(resourcesByTopic)) {
        const r = resourcesByTopic[topicId].find((item) => item.id === resourceId)
        if (r) {
          Object.assign(r, body)
          return delay(r)
        }
      }
      return fail('Resource not found.')
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/resources\/([^/]+)$/,
    handler: ([, resourceId]) => {
      for (const topicId of Object.keys(resourcesByTopic)) {
        const idx = resourcesByTopic[topicId].findIndex((item) => item.id === resourceId)
        if (idx !== -1) {
          resourcesByTopic[topicId].splice(idx, 1)
          return delay({ success: true })
        }
      }
      return fail('Resource not found.')
    },
  },

  // Students
  {
    method: 'GET',
    pattern: /^\/classes\/([^/]+)\/students$/,
    handler: ([, classId]) => {
      const cls = classes.find((c) => c.id === classId)
      if (!cls) return fail('Class not found.')
      return delay(studentsInCohort(cls.cohortId).map(studentSummary))
    },
  },
  {
    method: 'GET',
    pattern: /^\/students\/([^/]+)$/,
    handler: ([, studentId]) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return fail('Student not found.')
      const relevantTopics = topics.filter((t) => t.subjectId === 'sub_math' || t.subjectId === 'sub_sci').slice(0, 6)
      const topicMastery = relevantTopics.map((t) => ({ topicId: t.id, topicName: t.name, mastery: masteryFor(student.id, t.id) }))
      return delay({ ...studentSummary(student), topicMastery })
    },
  },
  { method: 'GET', pattern: /^\/admin\/students$/, handler: () => delay(students.map(studentSummary)) },
  {
    method: 'POST',
    pattern: /^\/admin\/students$/,
    handler: (m, body) => {
      const s = { id: nextId('stu'), name: body.name, email: body.email, cohortId: 'cohort_9a' }
      students.push(s)
      return delay(studentSummary(s))
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/([^/]+)\/recommendations$/,
    handler: ([, studentId]) => {
      const picks = [
        { id: nextId('rec'), title: 'Practice: Linear Equations Level 2', reason: 'Accuracy dipped on the last attempt.' },
        { id: nextId('rec'), title: 'Review: Sign-error walkthrough', reason: 'This mistake shows up most frequently in recent work.' },
      ]
      return delay(seededRandom(studentId) > 0.15 ? picks : [])
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/([^/]+)\/interventions$/,
    handler: ([, studentId]) => {
      const history = [
        { id: nextId('ihist'), topicName: 'Fractions', outcome: 'Retested at 82% mastery', status: 'completed' },
        { id: nextId('ihist'), topicName: 'Word Problems', outcome: null, status: 'assigned' },
      ]
      return delay(seededRandom(studentId + 'h') > 0.3 ? history : [])
    },
  },
  {
    method: 'POST',
    pattern: /^\/students\/([^/]+)\/notes$/,
    handler: ([, studentId], body) => {
      studentNotes[studentId] = studentNotes[studentId] || []
      studentNotes[studentId].push({ id: nextId('note'), text: body.text, createdAt: new Date().toISOString() })
      return delay({ success: true })
    },
  },
  {
    method: 'POST',
    pattern: /^\/students\/([^/]+)\/assign-practice$/,
    handler: () => delay({ success: true }),
  },

  // Subjects
  { method: 'GET', pattern: /^\/admin\/subjects$/, handler: () => delay(subjects.map(subjectSummary)) },
  {
    method: 'POST',
    pattern: /^\/admin\/subjects$/,
    handler: (m, body) => {
      const s = { id: nextId('sub'), name: body.name }
      subjects.push(s)
      return delay(subjectSummary(s))
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/admin\/subjects\/([^/]+)$/,
    handler: ([, subjectId], body) => {
      const s = subjects.find((item) => item.id === subjectId)
      if (!s) return fail('Subject not found.')
      Object.assign(s, body)
      return delay(subjectSummary(s))
    },
  },

  // Topics
  {
    method: 'GET',
    pattern: /^\/topics$/,
    handler: (m, body, params) => delay(topicsForSubject(params?.subjectId)),
  },
  {
    method: 'POST',
    pattern: /^\/topics$/,
    handler: (m, body) => {
      const t = { id: nextId('topic'), order: topics.length + 1, ...body }
      topics.push(t)
      return delay(t)
    },
  },
  {
    method: 'PATCH',
    pattern: /^\/topics\/([^/]+)$/,
    handler: ([, topicId], body) => {
      const t = topics.find((item) => item.id === topicId)
      if (!t) return fail('Topic not found.')
      Object.assign(t, body)
      return delay(t)
    },
  },
]

export function mockRequest(path, { method = 'GET', body, params } = {}) {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = path.match(route.pattern)
    if (match) return route.handler(match, body, params)
  }
  return fail(`No mock route for ${method} ${path}`, 404)
}
