/**
 * Server version of the portal's request() helper. The service functions in
 * this folder were the portal's mock API; on the server they run the same
 * logic against the shared state loaded from Postgres:
 *
 *   request(handler)                     → handler(view) for reads
 *   request(handler, { mutates: true })  → handler(view of a draft); the
 *                                          changes are saved in one transaction
 *
 * The view a clinician sees: only confirmed patients (not children a family
 * entered that the hospital has not checked yet), only the signed-in staff
 * member's message threads, and notifications marked read for them.
 */
import { ApiError } from '../../errors.js'
import { currentStaffId } from '../../context.js'
import { mutate, read } from '../../store/state.js'
import { refreshToday } from '../utils/dates.js'

export { ApiError }

function view(state, me) {
  const v = { ...state }
  v.patients = state.patients.filter((p) => p.recordStatus !== 'pending')
  v.conversations = state.conversations.filter((c) => c.ownerId === me)
  return v
}

function forReading(state, me) {
  const v = view(state, me)
  v.staffNotifications = state.staffNotifications.map((n) => ({ ...n, read: (n.readBy ?? []).includes(me) }))
  return v
}

/** Copies a write handler's changes from the view back to the full state. */
function writeBack(draft, v, me) {
  for (const key of Object.keys(v)) {
    if (key === 'patients' || key === 'conversations') continue
    draft[key] = v[key]
  }
  const pending = draft.patients.filter((p) => p.recordStatus === 'pending')
  draft.patients = [...v.patients, ...pending.filter((p) => !v.patients.includes(p))]
  const others = draft.conversations.filter((c) => c.ownerId !== me)
  draft.conversations = [...v.conversations.map((c) => (c.ownerId ? c : { ...c, ownerId: me })), ...others]
}

export async function request(handler, { mutates = false } = {}) {
  refreshToday()
  const me = currentStaffId()
  if (!mutates) return handler(forReading(await read(), me))
  return mutate((draft) => {
    const v = view(draft, me)
    const result = handler(v)
    writeBack(draft, v, me)
    return result
  })
}

export function notFound(what) {
  return new ApiError(`${what} could not be found, or you are not authorised to see it.`, { status: 404 })
}

/** Field validation error: { field: message } is shown inline and in the error summary. */
export function invalid(errors) {
  return new ApiError('Some fields need attention.', { status: 422, fields: errors })
}

/** Unique, readable ids for new rows: `${prefix}-<time><random>`. */
export function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
