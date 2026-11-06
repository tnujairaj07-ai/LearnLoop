import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Gate for any authenticated route. Pass `allow` with the list of roles
 * permitted (e.g. `allow={["student"]}` or `allow={["teacher", "admin"]}`).
 * Omit `allow` to require only that someone is signed in.
 */
export default function ProtectedRoute({ allow, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
