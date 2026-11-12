/**
 * Server version of the family app's request() helper.
 *
 *   request(handler)  → handler(account view) for reads. The view is built
 *                       from the shared state by familyDb() (projection.js).
 *   write(change)     → change(draft, account, view) for writes. `draft` is
 *                       the shared state (the same records the portal sees);
 *                       `view()` rebuilds the account view from it, so a
 *                       write can return data in the shape the app expects.
 */
import { ApiError } from '../../errors.js'
import { currentAccountId } from '../../context.js'
import { mutate, read } from '../../store/state.js'
import { refreshToday as refreshClinicToday } from '../../clinic/utils/dates.js'
import { refreshToday } from '../utils/dates.js'
import { familyDb } from './projection.js'

export { ApiError }

function signedInAccountId() {
  const id = currentAccountId()
  if (!id) throw new ApiError('Please sign in again.', { status: 401 })
  return id
}

export async function request(handler, { mutates = false } = {}) {
  if (mutates) throw new Error('Family writes go through write(), not request({ mutates }).')
  refreshToday()
  refreshClinicToday()
  const state = await read()
  const db = familyDb(state, signedInAccountId())
  if (!db) throw new ApiError('Please sign in again.', { status: 401 })
  Object.defineProperty(db, 'state', { value: state, enumerable: false })
  return handler(db)
}

export function write(change) {
  refreshToday()
  refreshClinicToday()
  const accountId = signedInAccountId()
  return mutate((draft) => {
    const account = draft.accounts.find((a) => a.id === accountId)
    if (!account) throw new ApiError('Please sign in again.', { status: 401 })
    const view = () => {
      const db = familyDb(draft, accountId)
      Object.defineProperty(db, 'state', { value: draft, enumerable: false })
      return db
    }
    return change(draft, account, view)
  })
}

export function notFound(what) {
  return new ApiError(`${what} could not be found.`, { status: 404 })
}

/** Unique, readable ids for new rows. */
export function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
