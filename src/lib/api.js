const TOKEN_KEY = 'fitness-tracker-token'

// Empty in dev, where vite.config.js proxies /api to localhost:3001. In the
// GitHub Pages build this is the API host's absolute origin, injected from the
// VITE_API_URL repository variable.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isLoggedIn() {
  return Boolean(getToken())
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

// Sign-in and sign-up answer bad credentials with a 401. That is not a dead
// session, and the login form shows the server's message inline — reloading
// there would swallow it.
const AUTH_PATHS = ['/api/auth/login', '/api/auth/signup']

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    logout()
    window.location.reload()
    throw new Error('Session expired')
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function signup(email, password) {
  const { token } = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem(TOKEN_KEY, token)
}

export async function login(email, password) {
  const { token } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem(TOKEN_KEY, token)
}

export async function fetchUser() {
  return request('/api/auth/me')
}

export async function updateUnit(unit) {
  return request('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ unit }),
  })
}

export async function fetchWorkouts() {
  return request('/api/workouts')
}

export async function saveWorkouts(entries) {
  return request('/api/workouts', {
    method: 'POST',
    body: JSON.stringify(entries),
  })
}

export async function deleteWorkout(id) {
  return request(`/api/workouts/${id}`, { method: 'DELETE' })
}

export async function deleteWorkoutsByDate(date) {
  return request(`/api/workouts?date=${date}`, { method: 'DELETE' })
}

export async function deleteAllWorkouts() {
  return request('/api/workouts?all=true', { method: 'DELETE' })
}
