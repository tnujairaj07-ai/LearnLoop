import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function defaultHomeFor(role) {
  if (role === "admin") return "/admin/classes";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}

/**
 * Gate for any authenticated route. Pass `allow` with the list of roles
 * permitted (e.g. `allow={["student"]}` or `allow={["teacher", "admin"]}`).
 * Renders either explicit `children` or nested `<Outlet />`.
 */
export default function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allow && !allow.includes(role)) {
    return <Navigate to={defaultHomeFor(role)} replace />;
  }
  return children ?? <Outlet />;
}
