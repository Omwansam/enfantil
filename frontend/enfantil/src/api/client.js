/**
 * In-memory mock backend. Every exported API function goes through `request`,
 * which waits a short, slightly random delay and returns a deep copy, so the
 * UI behaves as it will against a real Express API.
 *
 * To see error states, run this in the browser console and reload:
 *   localStorage.setItem('enfantil:failRate', '0.3')   // 30% of calls fail
 *   localStorage.removeItem('enfantil:failRate')        // back to normal
 */
import { createInitialData } from '../data/mockData'

const db = createInitialData()
const listeners = new Set()
let version = 0

export class ApiError extends Error {
  constructor(message, { status = 400, field } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
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

function emitChange() {
  version += 1
  listeners.forEach((listener) => listener())
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function failRate() {
  try {
    return Math.min(1, Math.max(0, Number(window.localStorage.getItem('enfantil:failRate')) || 0))
  } catch {
    return 0
  }
}

/**
 * Runs `handler(db)` after a simulated network delay.
 * Pass { mutates: true } for writes so subscribed screens refresh.
 */
export async function request(handler, { delay = 320, mutates = false } = {}) {
  await wait(delay + Math.random() * 220)
  if (Math.random() < failRate()) {
    throw new ApiError('We couldn’t reach Enfantil. Check your connection and try again.', { status: 503 })
  }
  const result = handler(db)
  if (mutates) emitChange()
  return result === undefined ? undefined : structuredClone(result)
}

export function notFound(what) {
  return new ApiError(`${what} could not be found.`, { status: 404 })
}

let idCounter = 1000
export function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}
