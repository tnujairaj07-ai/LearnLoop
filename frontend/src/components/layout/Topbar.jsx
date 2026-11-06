import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function Topbar({ title, breadcrumb, subtitle, actions }) {
  const { user, role, clearSession } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSignOut() {
    clearSession()
    navigate('/login')
  }

  const teacherName = user?.name || 'Alex Rivera'
  const teacherEmail = user?.email || 'alex.rivera@learnloop.edu'
  const teacherRole = role === 'admin' ? 'Administrator' : 'Class 9 Teacher'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 py-3.5 backdrop-blur-md shadow-2xs">
      <div>
        {breadcrumb && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>LearnLoop</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">{breadcrumb}</span>
          </div>
        )}
        <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Quick Active Pilot Tag */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[11px] font-semibold text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Active Pilot: Class 9 Math</span>
        </div>

        {/* Profile Pill with Avatar, Name, Email and Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white py-1 pl-1.5 pr-3 shadow-2xs hover:bg-slate-50 hover:shadow-xs transition-all cursor-pointer group"
            aria-expanded={profileOpen}
          >
            {/* Small Profile Image Avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-2 ring-white">
                {teacherName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
            </div>

            <div className="hidden sm:block text-left max-w-[140px] md:max-w-[170px]">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate group-hover:text-blue-600 transition-colors">
                {teacherName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono leading-tight truncate">
                {teacherEmail}
              </p>
            </div>

            <svg
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden z-50 p-2 animate-in fade-in zoom-in-95">
              <div className="p-3 bg-slate-50 rounded-xl mb-1.5 border border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">{teacherName}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{teacherEmail}</p>
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                  {teacherRole}
                </div>
              </div>

              <div className="space-y-0.5 text-xs font-medium text-slate-700">
                <Link
                  to="/teacher"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <span>📊</span>
                  <span>Teacher Dashboard</span>
                </Link>
                <Link
                  to="/teacher/interventions"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <span>⚡</span>
                  <span>Intervention Queue</span>
                </Link>
                <Link
                  to="/teacher/reports"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <span>📑</span>
                  <span>Report Generator</span>
                </Link>
              </div>

              <div className="pt-2 mt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
