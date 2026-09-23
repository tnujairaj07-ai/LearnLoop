import { createContext, useContext, useMemo, useState } from 'react'

// This context only tracks *which UI* to show (teacher vs admin nav) and
// carries whatever profile the real auth system returns. It performs no
// authentication itself — Member 3's backend owns login/session/JWT logic.
// Until that's wired up, `role` and `user` are seeded from a lightweight
// local placeholder so the app is navigable during frontend development.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = window.sessionStorage.getItem('ci_session')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session),
      role: session?.role ?? null,
      user: session?.user ?? null,
      // Called once the real backend confirms a login. Frontend never
      // decides identity or permissions on its own.
      setSession: (next) => {
        setSession(next)
        try {
          window.sessionStorage.setItem('ci_session', JSON.stringify(next))
        } catch {
          /* ignore storage failures */
        }
      },
      clearSession: () => {
        setSession(null)
        try {
          window.sessionStorage.removeItem('ci_session')
        } catch {
          /* ignore storage failures */
        }
      },
    }),
    [session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
