/**
 * Family app sign-in, SMS codes, password reset and registration, against the
 * shared accounts table. Passwords are bcrypt hashes; codes come from otp.js.
 */
import bcrypt from 'bcryptjs'
import { ApiError } from './client'
import { FACILITY } from '../data/reference'
import { mutate, read } from '../../store/state.js'
import { checkCode, issueCode } from '../../otp.js'
import { familyToken, resetToken, verify } from '../../tokens.js'
import { notifyStaff } from '../../notify.js'
import { daysBetween, isValidISODate, now, refreshToday, TODAY, toISODate, toISODateTime } from '../utils/dates'
import { refreshToday as refreshClinicToday } from '../../clinic/utils/dates.js'
import { isValidEmail, isValidKenyanMobile, normalizeKenyanPhone } from '../utils/format'
import { eddFromLmp, lmpFromEdd } from '../utils/pregnancy'

const BCRYPT_ROUNDS = 12
const DUMMY_HASH = bcrypt.hashSync('enfantil-family-timing', BCRYPT_ROUNDS)
const NOT_FOUND = 'No family account uses this number. Create an account first.'

function tick() {
  refreshToday()
  refreshClinicToday()
}

function sessionFor(account) {
  return {
    token: familyToken(account.id),
    role: 'caregiver',
    user: {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      fullName: account.fullName,
      relationship: account.relationship,
      phone: account.phone,
      email: account.email ?? '',
      avatarTone: account.avatarTone,
    },
  }
}

function findAccount(state, identifier) {
  const value = String(identifier ?? '').trim().toLowerCase()
  if (!value) return null
  if (value.includes('@')) return state.accounts.find((a) => a.email && a.email.toLowerCase() === value) ?? null
  const phone = normalizeKenyanPhone(value)
  return state.accounts.find((a) => a.phone === phone) ?? null
}

/** POST /api/family/auth/sign-in */
export async function signIn({ identifier, password }) {
  tick()
  const state = await read()
  const account = findAccount(state, identifier)
  const ok = await bcrypt.compare(String(password ?? ''), account ? (state.secrets.accounts[account.id] ?? DUMMY_HASH) : DUMMY_HASH)
  if (!account || !ok) {
    throw new ApiError('That phone number or email and password don’t match. Check them and try again.', { status: 401 })
  }
  return sessionFor(account)
}

/** POST /api/family/auth/sms-code */
export async function sendSmsSignInCode(phone) {
  tick()
  if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
  const state = await read()
  const account = findAccount(state, phone)
  if (!account) throw new ApiError(NOT_FOUND, { field: 'phone', status: 404 })
  return issueCode('sign-in', account.phone)
}

/** POST /api/family/auth/sms-code/verify */
export async function verifySmsSignInCode(phone, code) {
  tick()
  const state = await read()
  const account = findAccount(state, phone)
  if (!account) throw new ApiError(NOT_FOUND, { field: 'phone', status: 404 })
  await checkCode('sign-in', account.phone, code)
  return sessionFor(account)
}

/** POST /api/family/auth/password-reset */
export async function requestPasswordReset(phone) {
  tick()
  if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
  const state = await read()
  const account = findAccount(state, phone)
  if (!account) throw new ApiError('No family account uses this number.', { field: 'phone', status: 404 })
  return { sentTo: (await issueCode('reset', account.phone)).sentTo }
}

/** POST /api/family/auth/password-reset/verify — returns a 15-minute token for the next step. */
export async function verifyResetCode(phone, code) {
  tick()
  const p = normalizeKenyanPhone(phone)
  await checkCode('reset', p, code)
  return { resetToken: resetToken(p) }
}

/** POST /api/family/auth/password-reset/complete */
export async function resetPassword({ resetToken: token, password }) {
  tick()
  let claims
  try {
    claims = verify(token)
  } catch {
    throw new ApiError('This reset has expired. Start again from “Forgot password?”.', { status: 401 })
  }
  if (claims.kind !== 'reset') throw new ApiError('This reset has expired. Start again from “Forgot password?”.', { status: 401 })
  if (String(password ?? '').length < 8) throw new ApiError('Use at least 8 characters.', { field: 'password' })
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  return mutate((state) => {
    const account = state.accounts.find((a) => a.phone === claims.phone)
    if (!account) throw new ApiError('Account not found.', { status: 404 })
    state.secrets.accounts[account.id] = hash
    return { ok: true }
  })
}

/** POST /api/family/auth/register — checks the phone is free and sends the code. */
export async function startRegistration({ fullName, phone, email, relationship }) {
  tick()
  if (String(fullName ?? '').trim().split(/\s+/).length < 2) throw new ApiError('Enter your first and last name.', { field: 'fullName' })
  if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
  if (email && !isValidEmail(email)) throw new ApiError('Enter a valid email address.', { field: 'email' })
  const state = await read()
  if (findAccount(state, phone)) {
    throw new ApiError('This phone number already has an Enfantil account. Sign in instead.', { field: 'phone', status: 409 })
  }
  if (email && findAccount(state, email)) throw new ApiError('This email already has an Enfantil account. Sign in instead.', { field: 'email', status: 409 })
  const { sentTo } = await issueCode('register', normalizeKenyanPhone(phone))
  return { sentTo, fullName, email, relationship }
}

/** Validation for the "My health" step, shared with the form. */
export function validateHealth(health, tracking) {
  const errors = {}
  if (!health.dob) errors.dob = 'Enter your date of birth'
  else if (!isValidISODate(health.dob)) errors.dob = 'Enter a real date'
  else {
    const years = daysBetween(health.dob, TODAY) / 365.25
    if (years < 12 || years > 60) errors.dob = 'Check the year of your date of birth'
  }
  if (tracking !== 'baby') {
    if (health.dateKind === 'lmp') {
      if (!health.lmp) errors.lmp = 'Enter the first day of your last period'
      else if (!isValidISODate(health.lmp)) errors.lmp = 'Enter a real date'
      else if (health.lmp > toISODate(TODAY)) errors.lmp = 'This date can’t be in the future'
      else if (daysBetween(health.lmp, TODAY) > 300) errors.lmp = 'That is more than 42 weeks ago. Check the date'
    } else {
      if (!health.edd) errors.edd = 'Enter your due date'
      else if (!isValidISODate(health.edd)) errors.edd = 'Enter a real date'
      else if (daysBetween(TODAY, health.edd) < -14) errors.edd = 'This due date has passed. Check the date'
      else if (daysBetween(TODAY, health.edd) > 280) errors.edd = 'A due date is at most 40 weeks away'
    }
  }
  return errors
}

function listItems(text, make) {
  return String(text ?? '')
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(make)
}

/**
 * POST /api/family/auth/register/confirm — creates the account and, for a
 * mother, her hospital record (with her pregnancy if she is tracking one).
 */
export async function completeRegistration({ fullName, phone, email, relationship, password, code, tracking = 'baby', health = {} }) {
  tick()
  if (!['baby', 'pregnancy', 'both'].includes(tracking)) throw new ApiError('Choose what to track.', { field: 'tracking' })
  if (String(password ?? '').length < 8) throw new ApiError('Use at least 8 characters.', { field: 'password' })
  const healthErrors = validateHealth(health, tracking)
  const firstError = Object.keys(healthErrors)[0]
  if (firstError) throw new ApiError(healthErrors[firstError], { field: firstError })
  const p = normalizeKenyanPhone(phone)
  await checkCode('register', p, code)
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const account = await mutate((state) => {
    if (findAccount(state, p)) throw new ApiError('This phone number already has an Enfantil account. Sign in instead.', { field: 'phone', status: 409 })
    const name = String(fullName).trim()
    const [firstName, ...rest] = name.split(/\s+/)
    const lastName = rest.join(' ')
    const slug = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z-]/g, '').replace(/-+/g, '-') || 'family'
    let id = `cg-${slug}`
    for (let n = 2; state.accounts.some((a) => a.id === id); n += 1) id = `cg-${slug}-${n}`
    const stamp = toISODateTime(now())
    const today = toISODate(TODAY)

    // A mother (or anyone tracking a pregnancy) gets her own hospital record.
    let motherId = null
    if (relationship === 'Mother' || tracking !== 'baby') {
      motherId = `m-${id.slice(3)}`
      state.patientSerial += 1
      const self = { by: name, at: stamp, source: 'mother' }
      const lmp = tracking === 'baby' ? null : health.dateKind === 'lmp' ? health.lmp : lmpFromEdd(health.edd)
      state.mothers.push({
        id: motherId,
        firstName,
        lastName,
        dob: health.dob || null,
        phone: p,
        patientId: `TFH-M-${String(health.dob ?? today).slice(2).replace(/-/g, '')}-${String(state.patientSerial).padStart(3, '0')}`,
        tone: 'pink',
        bloodGroup: health.bloodGroup && health.bloodGroup !== 'unknown' ? health.bloodGroup : null,
        hasApp: true,
        registeredOn: today,
        nkda: null,
        allergies: listItems(health.allergies, (substance, i) => ({ id: `al-${motherId}-${i + 1}`, substance, reaction: '', ...self })),
        conditions: listItems(health.conditions, (n, i) => ({ id: `cond-${motherId}-${i + 1}`, name: n, detail: '', status: 'Active', ...self })),
        medicines: listItems(health.medicines, (n, i) => ({ id: `med-${motherId}-${i + 1}`, name: n, directions: '', ...self })),
        diagnoses: [],
        history: [],
        pregnancy: lmp
          ? {
              id: `preg-${motherId}`,
              lmp,
              edd: health.dateKind === 'lmp' ? eddFromLmp(health.lmp) : health.edd,
              gravida: null,
              para: null,
              status: 'pregnant',
              ancVisits: [],
              delivery: null,
              pncVisits: [],
            }
          : null,
        td: [],
        audit: [],
      })
      notifyStaff(state, {
        to: state.staff.filter((s) => (s.sees ?? []).includes('me')).map((s) => s.id),
        type: 'record',
        title: `New mother registered in the app · ${name}`,
        body: lmp ? `Pregnant, due ${health.dateKind === 'lmp' ? eddFromLmp(health.lmp) : health.edd}. Book her first antenatal visit.` : 'Confirm her details at her next visit.',
        link: `/clinic/mothers/${motherId}`,
      })
    }

    const created = {
      id,
      motherId,
      firstName,
      lastName,
      fullName: name,
      relationship,
      phone: p,
      email: String(email ?? '').trim(),
      county: 'Kiambu',
      memberSince: today,
      avatarTone: 'pink',
      tracking,
      settings: { reminders: { sms: true, push: true, weeklyEmail: false, timing: '1 day before' }, language: 'en' },
      consent: { since: today, recordedBy: 'You, at registration', lastViewed: null },
    }
    state.accounts.push(created)
    state.secrets.accounts[id] = hash
    state.familyNotifications.push({
      id: `n-${id}-welcome`,
      accountId: id,
      type: 'record',
      childId: 'me',
      title: `Welcome to Enfantil, ${firstName}`,
      body: `${FACILITY.name} will confirm your record at your next visit.`,
      createdAt: stamp,
      read: false,
      target: { page: 'me' },
    })
    return created
  })
  return sessionFor(account)
}

/** Password change for a signed-in account (POST /api/family/me/password). */
export async function changePassword(accountId, { currentPassword, newPassword }) {
  tick()
  const state = await read()
  const ok = await bcrypt.compare(String(currentPassword ?? ''), state.secrets.accounts[accountId] ?? DUMMY_HASH)
  if (!ok) throw new ApiError('Your current password is not right.', { field: 'currentPassword', status: 422 })
  if (String(newPassword ?? '').length < 8) throw new ApiError('Use at least 8 characters.', { field: 'newPassword' })
  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  return mutate((draft) => {
    draft.secrets.accounts[accountId] = hash
    return { ok: true }
  })
}
