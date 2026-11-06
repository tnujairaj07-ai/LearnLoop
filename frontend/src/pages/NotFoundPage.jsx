import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotFoundPage() {
  const { isAuthenticated, role } = useAuth();
  const destination = !isAuthenticated
    ? "/login"
    : role === "admin"
      ? "/admin/classes"
      : role === "teacher"
        ? "/teacher"
        : "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center">
      <p className="font-display text-3xl font-semibold text-ink">Page not found</p>
      <p className="hc-muted text-sm text-ink/60">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link
        to={destination}
        className="mt-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
      >
        Back to {isAuthenticated ? "dashboard" : "login"}
      </Link>
    </div>
  );
}
