import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Brand } from '../Brand'
import { useAuth } from '../../context/AuthContext'

const TEACHER_LINKS = [
  {
    to: '/teacher',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/teacher/interventions',
    label: 'Interventions',
    badge: 'Active',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/teacher/topics',
    label: 'Topics',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    to: '/teacher/resources',
    label: 'Resources',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    to: '/teacher/questions',
    label: 'Question Bank',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/teacher/reports',
    label: 'Reports',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const ADMIN_LINKS = [
  { to: '/admin/classes', label: 'Classes' },
  { to: '/admin/subjects', label: 'Subjects' },
  { to: '/admin/teachers', label: 'Teachers' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/assignments', label: 'Teacher assignments' },
  { to: '/admin/enrollment', label: 'Student enrollment' },
]

function NavGroup({ heading, links, onNavigate }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{heading}</p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              {link.icon}
              <span>{link.label}</span>
            </div>
            {link.badge && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                {link.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SidebarLinks({ role, onNavigate }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Brand header */}
        <div className="mb-6 pb-4 border-b border-slate-100 px-3">
          <Brand size="md" />
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <p className="text-[11px] font-medium text-slate-400">
              {role === 'admin' ? 'Administration Console' : 'Teacher Workspace · Class 9'}
            </p>
          </div>
        </div>

        {/* Links */}
        {role === 'admin' ? (
          <NavGroup heading="Administration" links={ADMIN_LINKS} onNavigate={onNavigate} />
        ) : (
          <NavGroup heading="Class Teaching" links={TEACHER_LINKS} onNavigate={onNavigate} />
        )}
      </div>

      {/* Bottom Profile & Pilot Info */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {/* Pilot Badge */}
        <div className="rounded-xl bg-blue-50/70 border border-blue-100 p-3 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <span>✨</span>
            <span>Closed-Loop Pilot</span>
          </div>
          <p className="text-[11px] text-blue-700/90 leading-tight">
            Assess → Diagnose → Intervene → Measure gain
          </p>
        </div>

        {/* Teacher Account Info */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Alex Rivera'}</p>
            <p className="text-[10px] text-slate-400 truncate font-mono">{user?.email || 'teacher@demo.com'}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ role, mobileOpen = false, onClose }) {
  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/90 bg-white px-4 py-5 md:block min-h-screen">
        <SidebarLinks role={role} />
      </aside>

      {/* Mobile slide-in drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-white px-4 py-5 shadow-2xl z-50 border-r border-slate-200"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close navigation"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
              <SidebarLinks role={role} onNavigate={onClose} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
