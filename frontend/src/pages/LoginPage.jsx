import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService, DEMO_CREDENTIALS } from '../services/authService'
import { FormField, Select, TextInput } from '../components/ui/FormField'

// UI only. The actual credential check, session/JWT issuing, and role
// resolution happen in Member 3's backend via authService.login — this page
// just renders the shared login form and reacts to the response.
export default function LoginPage() {
  const [role, setRole] = useState('teacher')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function fillDemo(account) {
    setRole(account.role)
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await authService.login({ email, password, role })
      setSession(result)
      navigate(location.state?.from?.pathname || (result.role === 'admin' ? '/admin/classes' : '/teacher'), {
        replace: true,
      })
    } catch (err) {
      setError(err.message || 'Sign in failed. Check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-serif text-2xl font-semibold text-ink">Classroom Insight</p>
          <p className="mt-1 text-sm text-ink-faint">Sign in to your teacher or admin workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="panel p-6">
          <FormField label="I am signing in as" htmlFor="role">
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label="Email" htmlFor="email" required>
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" required>
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          {error && <p className="mb-4 text-sm text-clay-700">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-xs text-ink-faint">
          <p className="mb-2 font-medium text-ink">No backend yet? Use a demo account:</p>
          <div className="space-y-2">
            {DEMO_CREDENTIALS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-surface-sunken"
              >
                <span className="capitalize text-ink">{account.role} demo</span>
                <span>{account.email} / {account.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
