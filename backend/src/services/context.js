/**
 * Who is making the current request, available anywhere in the services
 * without passing it through every function. Set by the auth middleware.
 */
import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()

/** Runs `fn` with the signed-in user ({ kind: 'staff' | 'family', id }) as the current user. */
export function runAs(user, fn) {
  return storage.run({ user }, fn)
}

export function currentUser() {
  return storage.getStore()?.user ?? null
}

/** The signed-in staff member's id (portal requests). */
export function currentStaffId() {
  const u = currentUser()
  return u?.kind === 'staff' ? u.id : null
}

/** The signed-in family account's id (family app requests). */
export function currentAccountId() {
  const u = currentUser()
  return u?.kind === 'family' ? u.id : null
}
