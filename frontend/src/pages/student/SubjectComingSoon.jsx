import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/PageShell";

const SUBJECTS_DIRECTORY = {
  science: {
    id: "science",
    name: "Science",
    code: "CBSE Code 086",
    curriculum: "Class 9 NCERT Core",
    icon: "🔬",
    color: "emerald",
    accentBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    description:
      "Physics, Chemistry, and Biology fundamentals aligned with NCERT Class 9. Covers Matter, Atoms, Cellular Biology, Tissues, Motion, Laws of Motion, Gravitation, Work & Energy, and Food Production.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Curriculum Authoring & Diagnostic Tree Tagging",
    plannedChapters: [
      { num: 1, title: "Matter in Our Surroundings", domain: "Chemistry", topicsCount: 5 },
      { num: 2, title: "Is Matter Around Us Pure", domain: "Chemistry", topicsCount: 5 },
      { num: 3, title: "Atoms and Molecules", domain: "Chemistry", topicsCount: 6 },
      { num: 4, title: "Structure of the Atom", domain: "Chemistry", topicsCount: 6 },
      { num: 5, title: "The Fundamental Unit of Life (Cell)", domain: "Biology", topicsCount: 6 },
      { num: 6, title: "Tissues", domain: "Biology", topicsCount: 5 },
      { num: 7, title: "Motion", domain: "Physics", topicsCount: 6 },
      { num: 8, title: "Force and Laws of Motion", domain: "Physics", topicsCount: 5 },
      { num: 9, title: "Gravitation & Floatation", domain: "Physics", topicsCount: 6 },
      { num: 10, title: "Work and Energy", domain: "Physics", topicsCount: 5 },
      { num: 11, title: "Sound", domain: "Physics", topicsCount: 5 },
      { num: 12, title: "Improvement in Food Resources", domain: "Applied Biology", topicsCount: 4 },
    ],
  },
  "social-science": {
    id: "social-science",
    name: "Social Science",
    code: "CBSE Code 087",
    curriculum: "Class 9 NCERT Core",
    icon: "🌍",
    color: "amber",
    accentBg: "bg-amber-50 text-amber-900 border-amber-200",
    description:
      "Integrated social sciences including History (French & Russian Revolutions), Geography (Physical Features & Drainage of India), Democratic Politics, and Economics.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Syllabus Tagging & Question Authoring",
    plannedChapters: [
      { num: 1, title: "The French Revolution", domain: "History", topicsCount: 5 },
      { num: 2, title: "Socialism in Europe & Russian Revolution", domain: "History", topicsCount: 5 },
      { num: 3, title: "Nazism and the Rise of Hitler", domain: "History", topicsCount: 4 },
      { num: 4, title: "India: Size and Location", domain: "Geography", topicsCount: 3 },
      { num: 5, title: "Physical Features of India", domain: "Geography", topicsCount: 6 },
      { num: 6, title: "Drainage & River Systems", domain: "Geography", topicsCount: 4 },
      { num: 7, title: "What is Democracy? Why Democracy?", domain: "Democratic Politics", topicsCount: 4 },
      { num: 8, title: "Constitutional Design", domain: "Democratic Politics", topicsCount: 4 },
      { num: 9, title: "The Story of Village Palampur", domain: "Economics", topicsCount: 4 },
      { num: 10, title: "People as Resource", domain: "Economics", topicsCount: 4 },
    ],
  },
  english: {
    id: "english",
    name: "English Language & Literature",
    code: "CBSE Code 184",
    curriculum: "Class 9 CBSE Core",
    icon: "📚",
    color: "purple",
    accentBg: "bg-purple-50 text-purple-900 border-purple-200",
    description:
      "Beehive Literature Reader, Moments Supplementary Reader, Reading Comprehension, Integrated Grammar drills, and structured creative writing.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Passage Tagging & Grammar Question Pool",
    plannedChapters: [
      { num: 1, title: "The Fun They Had & The Road Not Taken", domain: "Beehive", topicsCount: 4 },
      { num: 2, title: "The Sound of Music & Wind", domain: "Beehive", topicsCount: 4 },
      { num: 3, title: "The Little Girl & Rain on the Roof", domain: "Beehive", topicsCount: 4 },
      { num: 4, title: "A Truly Beautiful Mind", domain: "Beehive", topicsCount: 3 },
      { num: 5, title: "The Lost Child & The Adventures of Toto", domain: "Moments", topicsCount: 4 },
      { num: 6, title: "Iswaran the Storyteller", domain: "Moments", topicsCount: 3 },
      { num: 7, title: "Integrated Grammar: Tenses, Modals & Subject-Verb Concord", domain: "Grammar", topicsCount: 5 },
      { num: 8, title: "Descriptive Paragraph & Story Writing", domain: "Writing Skills", topicsCount: 4 },
    ],
  },
  hindi: {
    id: "hindi",
    name: "Hindi Course (A / B)",
    code: "CBSE Code 002 / 085",
    curriculum: "Class 9 CBSE Core",
    icon: "📖",
    color: "rose",
    accentBg: "bg-rose-50 text-rose-900 border-rose-200",
    description:
      "NCERT Kshitij, Kritika, Sparsh, and Sanchayan literary works, Hindi Vyakaran (Upsarg, Pratyay, Samas, Vakya Bhed), and structured nibandh/patra lekhan.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Vyakaran Drills & Chapter Synthesis",
    plannedChapters: [
      { num: 1, title: "Do Bailon Ki Katha (Premchand)", domain: "Gadya Khand", topicsCount: 4 },
      { num: 2, title: "Lhasa Ki Aur (Rahul Sankrityayan)", domain: "Gadya Khand", topicsCount: 3 },
      { num: 3, title: "Upbhoktavaad Ki Sanskriti", domain: "Gadya Khand", topicsCount: 3 },
      { num: 4, title: "Saakhiyan Evam Sabad (Kabir)", domain: "Kavya Khand", topicsCount: 4 },
      { num: 5, title: "Vakh (Laldyad)", domain: "Kavya Khand", topicsCount: 3 },
      { num: 6, title: "Hindi Vyakaran: Upsarg, Pratyay, Samas, Vakya Bhed", domain: "Vyakaran", topicsCount: 6 },
      { num: 7, title: "Anuched Lekhan Evam Patra Lekhan", domain: "Rachnatmak Lekhan", topicsCount: 4 },
    ],
  },
  it: {
    id: "it",
    name: "Information Technology (Code 402)",
    code: "CBSE Skill Track 402",
    curriculum: "Class 9 Vocational Skill",
    icon: "💻",
    color: "blue",
    accentBg: "bg-blue-50 text-blue-900 border-blue-200",
    description:
      "Vocational IT curriculum covering Digital Documentation, Electronic Spreadsheets, Digital Presentations, IT/ITeS industry foundations, and Employability Skills.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Practical Lab Projects & Skill Checks",
    plannedChapters: [
      { num: 1, title: "Introduction to IT & ITeS Industry", domain: "Industry Knowledge", topicsCount: 3 },
      { num: 2, title: "Data Entry & Keyboarding Skills", domain: "Practical Skills", topicsCount: 3 },
      { num: 3, title: "Digital Documentation (Word Processing)", domain: "Office Tools", topicsCount: 5 },
      { num: 4, title: "Electronic Spreadsheet (Calc / Excel)", domain: "Office Tools", topicsCount: 6 },
      { num: 5, title: "Digital Presentation", domain: "Office Tools", topicsCount: 4 },
      { num: 6, title: "Employability Skills (Communication, ICT & Green Skills)", domain: "Employability", topicsCount: 5 },
    ],
  },
  ai: {
    id: "ai",
    name: "Artificial Intelligence (Code 417)",
    code: "CBSE Skill Track 417",
    curriculum: "Class 9 Skill Track",
    icon: "🤖",
    color: "indigo",
    accentBg: "bg-indigo-50 text-indigo-900 border-indigo-200",
    description:
      "CBSE AI framework: Excite, Relate, Purpose, Possibilities, AI Project Cycle, introductory Computer Vision, Data Science exploration, and Ethical AI practices.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "AI Project Framework & Interactive Demos",
    plannedChapters: [
      { num: 1, title: "Introduction to AI & Everyday Smart Systems", domain: "Foundations", topicsCount: 4 },
      { num: 2, title: "AI Project Cycle: Scoping & Data Acquisition", domain: "Project Cycle", topicsCount: 4 },
      { num: 3, title: "Data Exploration, Representation & Bias", domain: "Data Science", topicsCount: 4 },
      { num: 4, title: "Computer Vision & Rule-Based vs AI Vision", domain: "Domain Models", topicsCount: 4 },
      { num: 5, title: "Natural Language Processing (NLP) Intro", domain: "Domain Models", topicsCount: 3 },
      { num: 6, title: "Ethics, Data Privacy & Responsible AI", domain: "Ethics & Safety", topicsCount: 3 },
    ],
  },
  "applied-math": {
    id: "applied-math",
    name: "Applied Mathematics & Logic",
    code: "Class 9 Enrichment",
    curriculum: "Enrichment & Olympiad",
    icon: "📐",
    color: "slate",
    accentBg: "bg-slate-100 text-slate-800 border-slate-300",
    description:
      "Fast mental math techniques, quantitative reasoning, pattern sequences, geometric deductions, and competitive Olympiad problem solving.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Problem Set Curation",
    plannedChapters: [
      { num: 1, title: "Mental Math & Speed Arithmetic Techniques", domain: "Arithmetic", topicsCount: 4 },
      { num: 2, title: "Number Sequences & Pattern Recognition", domain: "Logic", topicsCount: 4 },
      { num: 3, title: "Logical Venn Diagrams & Set Operations", domain: "Logic", topicsCount: 3 },
      { num: 4, title: "Spatial Reasoning & Geometric Deductions", domain: "Geometry", topicsCount: 4 },
    ],
  },
  environmental: {
    id: "environmental",
    name: "Environmental Education",
    code: "Class 9 Interdisciplinary",
    curriculum: "SDG-4 & Eco-Literacy",
    icon: "🌱",
    color: "emerald",
    accentBg: "bg-emerald-50 text-emerald-900 border-emerald-200",
    description:
      "Ecosystem stability, water and forest resource stewardship, biodiversity conservation, sustainable energy, and climate resilience.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Curriculum Integration",
    plannedChapters: [
      { num: 1, title: "Ecosystems & Energy Flow Dynamics", domain: "Ecology", topicsCount: 3 },
      { num: 2, title: "Water and Forest Resource Conservation", domain: "Resources", topicsCount: 3 },
      { num: 3, title: "Waste Management & Sustainable Practices", domain: "Action", topicsCount: 3 },
    ],
  },
  sanskrit: {
    id: "sanskrit",
    name: "Sanskrit",
    code: "CBSE Code 122",
    curriculum: "Class 9 Elective",
    icon: "📜",
    color: "amber",
    accentBg: "bg-amber-50 text-amber-900 border-amber-200",
    description:
      "Shemushi Prathamo Bhaag prose and shlokas, Sandhi, Karak, Shabd Roop, Dhatu Roop, and Sanskrit vyakaran principles.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Textbook Parsing & Shloka Audio Guides",
    plannedChapters: [
      { num: 1, title: "Bharativasantgiti (Shloka Vyakhyan)", domain: "Padya", topicsCount: 3 },
      { num: 2, title: "Swarnakakah (Katha Bhaag)", domain: "Gadya", topicsCount: 3 },
      { num: 3, title: "Sanskrit Vyakaran: Sandhi, Karak, Shabd Roop", domain: "Vyakaran", topicsCount: 5 },
    ],
  },
  "health-pe": {
    id: "health-pe",
    name: "Health & Physical Education",
    code: "Class 9 Practical",
    curriculum: "CBSE Physical Wellness",
    icon: "🏃",
    color: "orange",
    accentBg: "bg-orange-50 text-orange-900 border-orange-200",
    description:
      "Foundations of physical fitness, sports physiology, adolescent nutritional guidelines, injury prevention, first aid, and yoga asanas.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Fitness Benchmarks & Activity Guides",
    plannedChapters: [
      { num: 1, title: "Foundations of Physical Fitness & Motor Skills", domain: "Physiology", topicsCount: 3 },
      { num: 2, title: "Adolescent Nutrition & Dietary Planning", domain: "Nutrition", topicsCount: 3 },
      { num: 3, title: "Yoga Asanas, Pranayama & Stress Relief", domain: "Mental & Physical Wellness", topicsCount: 3 },
    ],
  },
  "financial-literacy": {
    id: "financial-literacy",
    name: "Financial Literacy & Commerce",
    code: "Class 9 Skill Track",
    curriculum: "Financial Education & Digital Economy",
    icon: "💳",
    color: "teal",
    accentBg: "bg-teal-50 text-teal-900 border-teal-200",
    description:
      "Basics of banking, savings instruments, budgeting, digital payments, UPI security, interest calculations, and cyber fraud avoidance.",
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Interactive Budget Case Studies",
    plannedChapters: [
      { num: 1, title: "Money, Banking & Account Operations", domain: "Banking", topicsCount: 3 },
      { num: 2, title: "Personal Budgeting & Savings Discipline", domain: "Financial Planning", topicsCount: 3 },
      { num: 3, title: "Digital Payments, UPI & Cyber Security", domain: "Digital Economy", topicsCount: 3 },
    ],
  },
};

export default function SubjectComingSoon({ subjectId: propSubjectId }) {
  const params = useParams();
  const navigate = useNavigate();
  const activeSubjectId = propSubjectId || params.subjectId || "science";

  const subject = SUBJECTS_DIRECTORY[activeSubjectId] || {
    id: activeSubjectId,
    name: activeSubjectId.charAt(0).toUpperCase() + activeSubjectId.slice(1).replace(/-/g, " "),
    code: "Class 9 Elective",
    curriculum: "Class 9 CBSE Curriculum",
    icon: "📖",
    color: "blue",
    accentBg: "bg-blue-50 text-blue-900 border-blue-200",
    description: `Curriculum roadmap, diagnostic question pools, and concept resources for Class 9 ${activeSubjectId} are currently under active authoring.`,
    targetTerm: "Term 2 Pilot Release",
    statusBadge: "Curriculum Ingestion & Review",
    plannedChapters: [
      { num: 1, title: "Introduction & Foundational Concepts", domain: "Core", topicsCount: 4 },
      { num: 2, title: "Intermediate Principles & Applications", domain: "Core", topicsCount: 4 },
      { num: 3, title: "Advanced Topics & CBSE Exemplar Problems", domain: "Core", topicsCount: 4 },
    ],
  };

  const [bookmarked, setBookmarked] = useState(false);
  const [notified, setNotified] = useState(() => {
    try {
      return localStorage.getItem(`learnloop_notify_${activeSubjectId}`) === "true";
    } catch {
      return false;
    }
  });

  function handleToggleNotify() {
    const nextState = !notified;
    setNotified(nextState);
    try {
      localStorage.setItem(`learnloop_notify_${activeSubjectId}`, String(nextState));
    } catch {
      // ignore
    }
  }

  return (
    <PageShell>
      <div className="bg-[#fafbfd] min-h-screen pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          {/* ========================================================== */}
          {/* 1. TOP BREADCRUMB & NAVIGATION BAR                         */}
          {/* ========================================================== */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
            <button
              onClick={() => navigate("/roadmap")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer group"
            >
              <svg
                className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>All Roadmaps</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Active Pilot: Mathematics
              </span>

              <button
                onClick={() => setBookmarked(!bookmarked)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 text-slate-500 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer"
                title="Bookmark Subject"
              >
                <svg
                  className={`w-4 h-4 ${bookmarked ? "text-blue-600 fill-blue-600" : "fill-none"}`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. HERO: COMING SOON BANNER                                 */}
          {/* ========================================================== */}
          <div className="pt-8 pb-6">
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs">
                <span>🚧 Coming Soon</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {subject.code}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                {subject.curriculum}
              </span>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#0f172a] flex items-center justify-center text-3xl sm:text-4xl shrink-0">
                {subject.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
                  Class 9 {subject.name}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-2xl">
                  {subject.description}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 3. PRIMARY CALLOUT: ACTIVE PILOT PROMPT                     */}
          {/* ========================================================== */}
          <div className="rounded-2xl border-2 border-slate-900 bg-white p-5 sm:p-6 shadow-[4px_4px_0px_#0f172a] mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    Active Learning Pilot
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Ready to explore right now</span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                  Class 9 Mathematics is fully live with 15 NCERT Chapters!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  Our interactive roadmap engine, diagnostic checkpoints, misconception analysis, formula sheets, and curated video masterclasses are active for Mathematics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                <Link
                  to="/roadmap/math"
                  className="px-4 py-2.5 rounded-xl border-2 border-slate-900 bg-[#ffd000] hover:bg-[#ffe033] font-display font-bold text-xs sm:text-sm text-slate-950 shadow-[2px_2px_0px_#0f172a] hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Mathematics Roadmap</span>
                  <span>→</span>
                </Link>

                <button
                  type="button"
                  onClick={handleToggleNotify}
                  className={`px-4 py-2.5 rounded-xl border-2 border-slate-900 font-display font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#0f172a] hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                    notified
                      ? "bg-emerald-100 text-emerald-950 border-emerald-900"
                      : "bg-white hover:bg-slate-50 text-slate-900"
                  }`}
                >
                  <span>{notified ? "✓ Notified" : "🔔 Notify Me When Ready"}</span>
                </button>
              </div>
            </div>

            {notified && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>
                  You will receive an in-app alert and dashboard notification as soon as the Class 9 {subject.name} roadmap is published!
                </span>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* 4. PLANNED CHAPTER ROADMAP ARCHITECTURE PREVIEW            */}
          {/* ========================================================== */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Planned Curriculum Architecture</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {subject.plannedChapters.length} Chapters
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The official NCERT syllabus sequence for Class 9 {subject.name} currently being structured.
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                <span>Status:</span>
                <span className="text-amber-700 font-bold">{subject.statusBadge}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {subject.plannedChapters.map((ch) => (
                <div
                  key={ch.num}
                  className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
                      <span>Chapter {ch.num}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {ch.domain}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">
                      {ch.title}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      ~{ch.topicsCount} subtopics planned
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>In Authoring</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================== */}
          {/* 5. WHAT'S INCLUDED UPON RELEASE                            */}
          {/* ========================================================== */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs mb-8">
            <h3 className="font-display font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
              <span>Features in Development for {subject.name}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl mb-1.5">🗺</div>
                <h4 className="font-bold text-slate-900 mb-1">Interactive Node Roadmap</h4>
                <p className="text-slate-500 leading-relaxed">
                  roadmap.sh-style sequential learning path connecting chapters and prerequisite subtopics.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl mb-1.5">🎯</div>
                <h4 className="font-bold text-slate-900 mb-1">Diagnostic Checkpoints</h4>
                <p className="text-slate-500 leading-relaxed">
                  Pre-test and post-test assessment batteries to accurately measure learning gain.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl mb-1.5">🧠</div>
                <h4 className="font-bold text-slate-900 mb-1">Explainable Mastery Engine</h4>
                <p className="text-slate-500 leading-relaxed">
                  Transparent 4-part scoring (Accuracy, Difficulty, Recency, Trend) with tagged misconception detection.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xl mb-1.5">📑</div>
                <h4 className="font-bold text-slate-900 mb-1">Notes, Formulas &amp; AI Tutor</h4>
                <p className="text-slate-500 leading-relaxed">
                  Curated video masterclasses, NCERT revision sheets, and doubt clearing assistant.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 6. BOTTOM NAVIGATION ACTIONS                               */}
          {/* ========================================================== */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => navigate("/roadmap")}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>← Back to My Courses</span>
            </button>

            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/roadmap/math"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1"
              >
                <span>Explore Mathematics Roadmap</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
