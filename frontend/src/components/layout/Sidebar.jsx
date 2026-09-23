import { NavLink } from 'react-router-dom'

const TEACHER_LINKS = [
  { to: '/teacher', label: 'Dashboard', end: true },
  { to: '/teacher/interventions', label: 'Interventions' },
  { to: '/teacher/topics', label: 'Topics' },
  { to: '/teacher/resources', label: 'Resources' },
  { to: '/teacher/questions', label: 'Questions' },
  { to: '/teacher/reports', label: 'Reports' },
]

const ADMIN_LINKS = [
  { to: '/admin/classes', label: 'Classes' },
  { to: '/admin/subjects', label: 'Subjects' },
  { to: '/admin/teachers', label: 'Teachers' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/assignments', label: 'Teacher assignments' },
  { to: '/admin/enrollment', label: 'Student enrollment' },
]

function NavGroup({ heading, links }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-xs font-medium text-ink-faint">{heading}</p>
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded px-3 py-1.5 text-sm transition-colors ${
                isActive ? 'bg-teal-50 font-medium text-teal-700' : 'text-ink-light hover:bg-surface-sunken'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Sidebar({ role }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface px-3 py-5 md:block">
      <div className="mb-6 px-3">
        <p className="font-serif text-lg font-semibold text-ink">Classroom Insight</p>
        <p className="text-xs text-ink-faint">{role === 'admin' ? 'Admin console' : 'Teacher workspace'}</p>
      </div>
      {role === 'admin' ? (
        <NavGroup heading="Administration" links={ADMIN_LINKS} />
      ) : (
        <NavGroup heading="Teaching" links={TEACHER_LINKS} />
      )}
    </aside>
  )
}
