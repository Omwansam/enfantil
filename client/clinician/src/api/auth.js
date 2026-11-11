import { CREDENTIALS, FACILITY, STAFF } from '../data/mockData'
import { normalizeKenyanPhone } from '../utils/format'
import { ApiError, request } from './client'

function normalizeIdentifier(value) {
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
  if (/^[+\d\s()-]+$/.test(text)) return `0${normalizeKenyanPhone(text)}`
  return text
}

/**
 * POST /api/auth/sign-in
 * Staff sign in with staff ID or work email. A caregiver login returns a
 * caregiver session, which the portal sends to the family sign-in.
 */
export function signIn({ identifier, password }) {
  return request(
    () => {
      const id = normalizeIdentifier(identifier)
      const match = CREDENTIALS.find((c) => c.identifiers.includes(id) || c.identifiers.includes(id.replace(/^0/, '')))
      if (!match || match.password !== password) {
        throw new ApiError('The staff ID, email or password is incorrect. Check them and try again.', { status: 401 })
      }
      const token = `demo-${match.role}-${Date.now().toString(36)}`
      if (match.role === 'caregiver') {
        return { token, role: 'caregiver', user: { name: 'Wanjiru Kamau' }, facility: null }
      }
      const staff = STAFF.find((s) => s.id === match.staffId)
      return {
        token,
        role: 'clinician',
        user: {
          id: staff.id,
          name: staff.name,
          shortName: staff.shortName,
          title: staff.title,
          staffId: staff.staffId,
          email: staff.email,
          initials: staff.initials,
          tone: staff.tone,
        },
        facility: { id: FACILITY.id, name: FACILITY.name, department: FACILITY.department, clinic: FACILITY.clinic },
      }
    },
    { delay: 600 },
  )
}

/** POST /api/auth/password-reset — always answers the same way so staff IDs can't be probed. */
export function requestPasswordReset({ identifier }) {
  return request(
    () => {
      const id = normalizeIdentifier(identifier)
      if (!id) throw new ApiError('Enter your staff ID or work email.', { status: 422, field: 'identifier' })
      return { ok: true }
    },
    { delay: 500 },
  )
}
