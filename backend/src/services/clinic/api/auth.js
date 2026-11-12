import bcrypt from 'bcryptjs'
import { normalizeKenyanPhone } from '../utils/format'
import { read } from '../../store/state.js'
import { staffToken } from '../../tokens.js'
import { ApiError } from './client'

const FAILED = 'The staff ID, email or password is incorrect. Check them and try again.'
/** Compared against when the ID is unknown, so a wrong ID takes as long as a wrong password. */
const DUMMY_HASH = bcrypt.hashSync('enfantil-timing-equaliser', 12)

function sessionFor(state, staff) {
  const f = state.facility
  return {
    token: staffToken(staff.id),
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
    facility: { id: f.id, name: f.name, department: f.department, clinic: f.clinic, phone: f.phone },
  }
}

/**
 * POST /api/clinic/auth/sign-in
 * Staff sign in with staff ID or work email. A family app login gets
 * role 'caregiver' (and no token), and the portal sends them to the family sign-in.
 */
export async function signIn({ identifier, password }) {
  const state = await read()
  const id = String(identifier ?? '').trim()
  const lower = id.toLowerCase()
  if (!id || !password) throw new ApiError('Enter your staff ID or email and your password.', { status: 422, field: 'identifier' })
  const staff = state.staff.find((s) => s.email?.toLowerCase() === lower || s.staffId?.toLowerCase() === lower)
  if (staff && state.secrets.staff[staff.id] && (await bcrypt.compare(password, state.secrets.staff[staff.id]))) {
    return sessionFor(state, staff)
  }
  // A caregiver typed their family-app login here.
  const phone = /^[+\d\s()-]+$/.test(id) ? normalizeKenyanPhone(id) : null
  const account = state.accounts.find((a) => (phone && a.phone === phone) || (a.email && a.email.toLowerCase() === lower))
  if (account && (await bcrypt.compare(password, state.secrets.accounts[account.id] ?? DUMMY_HASH))) {
    return { token: null, role: 'caregiver', user: { name: account.fullName }, facility: null }
  }
  if (!staff) await bcrypt.compare(password, DUMMY_HASH)
  throw new ApiError(FAILED, { status: 401 })
}

/** POST /api/clinic/auth/password-reset — always answers the same way so staff IDs can't be probed. */
export async function requestPasswordReset({ identifier }) {
  const id = String(identifier ?? '').trim()
  if (!id) throw new ApiError('Enter your staff ID or work email.', { status: 422, field: 'identifier' })
  const state = await read()
  const staff = state.staff.find((s) => s.email?.toLowerCase() === id.toLowerCase() || s.staffId?.toLowerCase() === id.toLowerCase())
  if (staff?.email) console.log(`[mail] password reset requested for ${staff.email} (connect a mail provider to send the link)`)
  return { ok: true }
}

/** The signed-in staff member (GET /api/clinic/auth/me). */
export async function me(staffId) {
  const state = await read()
  const staff = state.staff.find((s) => s.id === staffId)
  if (!staff) throw new ApiError('Please sign in again.', { status: 401 })
  const { token: _t, ...session } = sessionFor(state, staff)
  return session
}
