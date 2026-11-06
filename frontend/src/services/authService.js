// Authentication itself belongs to Member 3's backend. This module only
// wraps whatever endpoints/session the backend exposes so pages don't call
// fetch directly. No token handling or auth logic lives here.
import { apiClient } from '../lib/apiClient'

// --- Demo login -------------------------------------------------------
// There's no backend wired up yet, so the real /auth/login call below has
// nothing to talk to. These fixed demo accounts let the app be explored
// end-to-end without a backend. Remove DEMO_ACCOUNTS (and the shortcut in
// `login` below) once Member 3's real auth endpoint is live — everything
// else in this file already calls the real API and needs no changes.
const DEMO_ACCOUNTS = {
  'teacher@demo.com': {
    password: 'demo1234',
    role: 'teacher',
    user: { id: 'demo-teacher-1', name: 'Alex Rivera', email: 'teacher@demo.com' },
  },
  'admin@demo.com': {
    password: 'demo1234',
    role: 'admin',
    user: { id: 'demo-admin-1', name: 'Jordan Lee', email: 'admin@demo.com' },
  },
}

export const DEMO_CREDENTIALS = Object.entries(DEMO_ACCOUNTS).map(([email, { password, role }]) => ({
  email,
  password,
  role,
}))

export const authService = {
  login: async (credentials) => {
    const demo = DEMO_ACCOUNTS[credentials.email?.trim().toLowerCase()]
    if (demo && demo.password === credentials.password) {
      // Simulate network latency so the submitting state still shows.
      await new Promise((resolve) => setTimeout(resolve, 300))
      return { role: demo.role, user: demo.user, token: 'demo-token' }
    }
    return apiClient.post('/auth/login', credentials)
  },
  logout: () => apiClient.post('/auth/logout'),
  currentUser: () => apiClient.get('/auth/me'),
}
