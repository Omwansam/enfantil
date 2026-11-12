/**
 * HTTP client for the Enfantil API (the backend/ folder, mounted at /api/family).
 *
 * Every function in src/api calls the API through http() and returns its JSON.
 * Writes notify subscribers (useDataVersion), so lists and sidebar badges
 * refresh after a change. Errors arrive as ApiError with the server's message,
 * plus `field` / `fields` for inline form errors.
 *
 * Point the app at the API with VITE_API_URL in .env (default http://localhost:5000/api/family).
 */
import { readJSON, removeKey } from '../utils/storage'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/family').replace(/\/$/, '')
const SESSION_KEY = 'enfantil:session'
const SIGN_IN_PATH = '/sign-in'

const listeners = new Set()
let version = 0

export class ApiError extends Error {
  constructor(message, { status = 400, field, fields } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
    if (fields) this.fields = fields
  }
}

/** Subscribe to data changes (used by useDataVersion so badges and lists refresh). */
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getVersion() {
  return version
}

export function emitChange() {
  version += 1
  listeners.forEach((listener) => listener())
}

function sessionToken() {
  const session = readJSON(SESSION_KEY) ?? readJSON(SESSION_KEY, { kind: 'session' })
  return session?.token ?? null
}

function endSession() {
  removeKey(SESSION_KEY)
  removeKey(SESSION_KEY, { kind: 'session' })
  if (!window.location.pathname.startsWith(SIGN_IN_PATH)) window.location.assign(SIGN_IN_PATH)
}

/**
 * Calls the API. `query` values that are null, undefined or '' are left out.
 * Anything but GET counts as a change unless `mutates: false` is passed.
 */
export async function http(method, path, { body, query, mutates = method !== 'GET' } = {}) {
  const url = new URL(`${API_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const token = sessionToken()
  let res
  try {
    res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('We couldn’t reach Enfantil. Check your connection and try again.', { status: 503 })
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    // An expired or revoked session: sign out and go back to the sign-in page.
    if (res.status === 401 && token) endSession()
    throw new ApiError(data?.message ?? 'Something went wrong. Try again.', { status: res.status, field: data?.field, fields: data?.fields })
  }
  if (mutates) emitChange()
  return data
}

export const get = (path, query) => http('GET', path, { query })
export const post = (path, body = {}) => http('POST', path, { body })
export const put = (path, body = {}) => http('PUT', path, { body })
export const patch = (path, body = {}) => http('PATCH', path, { body })
export const del = (path) => http('DELETE', path)

/** Path segment for an id taken from a URL or typed by a user. */
export const seg = (value) => encodeURIComponent(String(value ?? ''))
