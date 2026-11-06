import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authService, DEMO_CREDENTIALS } from "../services/authService";
import { Brand } from "../components/Brand";

const ROLES = [
  { id: "student", label: "Student" },
  { id: "teacher", label: "Teacher" },
  { id: "admin", label: "Admin" },
];

function destinationFor(role) {
  if (role === "admin") return "/admin/classes";
  if (role === "teacher") return "/teacher";
  return "/dashboard";
}

export default function Login() {
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn, setSession, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function selectRole(nextRole) {
    setRole(nextRole);
    setLocalError("");
  }

  function fillDemo(account) {
    setRole(account.role);
    setEmail(account.email);
    setPassword(account.password);
    setLocalError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");
    setSubmitting(true);
    try {
      let resolvedRole = role;
      if (role === "student") {
        const user = await signIn(email, password);
        resolvedRole = user.role;
      } else {
        const result = await authService.login({ email, password, role });
        setSession(result);
        resolvedRole = result.role;
      }
      navigate(location.state?.from?.pathname || destinationFor(resolvedRole), { replace: true });
    } catch (err) {
      setLocalError(err.message || "Sign in failed. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const demoAccounts =
    role === "student"
      ? [{ role: "student", email: "student@demo.com", password: "demo1234" }]
      : DEMO_CREDENTIALS.filter((account) => account.role === role);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Brand size="lg" className="justify-center" />
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Sign in to continue</h1>
          <p className="hc-muted mt-1 text-sm text-ink/60">One platform for students, teachers and admins.</p>
        </div>

        <div
          role="tablist"
          aria-label="Sign in as"
          className="hc-border mb-4 flex rounded-card border border-border bg-white p-1"
        >
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={role === r.id}
              onClick={() => selectRole(r.id)}
              className={`flex-1 rounded-card px-3 py-1.5 text-sm font-medium transition-colors ${
                role === r.id ? "bg-primary text-white" : "text-ink/60 hover:bg-paper"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="hc-border rounded-card border border-border bg-white p-6" noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="hc-border w-full rounded-card border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder={role === "student" ? "you@school.edu" : `${role}@demo.com`}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hc-border w-full rounded-card border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          {(localError || error) && (
            <p role="alert" className="mb-4 rounded-card bg-attention-light px-3 py-2 text-sm text-attention">
              {localError || error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-card bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="hc-border mt-4 rounded-card border border-dashed border-border bg-white p-4 text-xs text-ink/60">
          <p className="mb-2 font-medium text-ink">No backend yet? Try it instantly:</p>
          <div className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="flex w-full items-center justify-between rounded-card border border-border px-3 py-2 text-left hover:bg-paper"
              >
                <span className="capitalize text-ink">{account.role} demo</span>
                <span>
                  {account.email} / {account.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
