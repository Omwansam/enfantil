/** Staff sign-in and password reset (POST /api/clinic/auth/…). */
import { post } from './client'

/**
 * Staff sign in with staff ID or work email. A family app login comes back
 * with role 'caregiver', and the portal sends them to the family sign-in.
 */
export function signIn({ identifier, password }) {
  return post('/auth/sign-in', { identifier, password })
}

/** Always answers the same way so staff IDs can't be probed. */
export function requestPasswordReset({ identifier }) {
  return post('/auth/password-reset', { identifier })
}
