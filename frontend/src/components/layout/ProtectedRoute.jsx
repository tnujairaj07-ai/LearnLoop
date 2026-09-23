import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Routes through whatever the real auth system decides (isAuthenticated,
// role). This component makes no authentication decisions itself — it just
// keeps teacher/admin pages behind the existing login gate.
export function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />
  }
  return children
}
