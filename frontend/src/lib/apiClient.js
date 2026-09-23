// Thin fetch wrapper shared by every service module.
// Member 3 (backend) and Member 4 (learning intelligence) own the actual
// endpoints — this file only standardises how the frontend talks to them.
// Point VITE_API_BASE_URL at the real API host once it exists.

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  let query = ''
  if (params) {
    const usp = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') usp.set(key, value)
    })
    const qs = usp.toString()
    if (qs) query = `?${qs}`
  }

  let response
  try {
    response = await fetch(`${BASE_URL}${path}${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'include',
    })
  } catch (networkError) {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0, networkError)
  }

  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  let payload = null

  if (text) {
    if (contentType.includes('application/json')) {
      try {
        payload = JSON.parse(text)
      } catch {
        throw new ApiError('The server returned a response that was not valid JSON.', response.status, text)
      }
    } else {
      // No backend is wired up at BASE_URL yet: dev servers (and most static
      // hosts) answer unknown paths like `/api/...` with their own index.html
      // (200 OK, text/html) instead of a 404. Treating that HTML as data used
      // to silently get passed on to pages expecting arrays/objects, which
      // then crashed while rendering (e.g. `html.map is not a function`) and
      // blanked the whole app. Surface it as a normal API error instead.
      throw new ApiError(
        response.ok
          ? 'No API server found at this address — got an HTML page instead of JSON. Set VITE_API_BASE_URL to your backend URL.'
          : `Request failed (${response.status})`,
        response.status,
        text
      )
    }
  }

  if (!response.ok) {
    const message = (payload && payload.message) || `Request failed (${response.status})`
    throw new ApiError(message, response.status, payload)
  }

  return payload
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
