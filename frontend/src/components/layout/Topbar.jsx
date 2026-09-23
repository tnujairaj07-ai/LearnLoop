import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function Topbar({ title, breadcrumb }) {
  const { user, role, clearSession } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div>
        {breadcrumb && <p className="text-xs text-ink-faint">{breadcrumb}</p>}
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{user?.name || 'Signed in'}</p>
          <p className="text-xs capitalize text-ink-faint">{role}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            clearSession()
            navigate('/login')
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
