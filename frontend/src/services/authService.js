// Authentication service wired to Flask /api/auth endpoints
import { apiClient } from '../lib/apiClient'

export const DEMO_CREDENTIALS = [
  { email: 'teacher@learnloop.demo', password: 'demo1234', role: 'teacher' },
  { email: 'admin@learnloop.demo', password: 'demo1234', role: 'admin' },
]

export const authService = {
  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', {
      email: credentials.email?.trim().toLowerCase(),
      password: credentials.password,
    })
    const user = res.user || res
    const role = user?.role || res.role
    const token = res.access_token || res.token
    return { role, user, token, access_token: token }
  },
  logout: () => apiClient.post('/auth/logout'),
  currentUser: () => apiClient.get('/auth/me'),
}
