import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { role } = useAuth()
  return (
    <div className="flex min-h-screen bg-surface-sunken">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
