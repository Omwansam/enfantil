import { ApiError, request } from './client'
import { isValidKenyanMobile, normalizeKenyanPhone } from '../utils/format'

/** Any 6-digit code works in the demo except 000000, which simulates a wrong code. */
const isAcceptedCode = (code) => /^\d{6}$/.test(code) && code !== '000000'

function sessionFor(db, userId) {
  const c = db.caregiver
  if (c.id !== userId) throw new ApiError('Account not found.', { status: 404 })
  return {
    token: `mock-token-${userId}`,
    role: 'caregiver',
    user: {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email,
      avatarTone: c.avatarTone,
    },
  }
}

function findCredential(db, identifier) {
  const value = String(identifier ?? '').trim().toLowerCase()
  if (value.includes('@')) return db.credentials.find((c) => c.email.toLowerCase() === value)
  const phone = normalizeKenyanPhone(value)
  return db.credentials.find((c) => c.phone === phone)
}

export function signIn({ identifier, password }) {
  return request((db) => {
    const credential = findCredential(db, identifier)
    if (!credential || credential.password !== password) {
      throw new ApiError('That phone number or email and password don’t match. Check them and try again.', { status: 401 })
    }
    return sessionFor(db, credential.userId)
  })
}

export function sendSmsSignInCode(phone) {
  return request((db) => {
    if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
    const credential = findCredential(db, phone)
    if (!credential) throw new ApiError('No family account uses this number. Create an account first.', { field: 'phone', status: 404 })
    return { sentTo: normalizeKenyanPhone(phone), expiresInSeconds: 300 }
  })
}

export function verifySmsSignInCode(phone, code) {
  return request((db) => {
    if (!isAcceptedCode(code)) throw new ApiError('That code is not right. Check the SMS and try again.', { field: 'code' })
    return sessionFor(db, findCredential(db, phone).userId)
  })
}

export function requestPasswordReset(phone) {
  return request((db) => {
    if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
    if (!findCredential(db, phone)) throw new ApiError('No family account uses this number.', { field: 'phone', status: 404 })
    return { sentTo: normalizeKenyanPhone(phone) }
  })
}

export function verifyResetCode(phone, code) {
  return request(() => {
    if (!isAcceptedCode(code)) throw new ApiError('That code is not right. Check the SMS and try again.', { field: 'code' })
    return { resetToken: `reset-${normalizeKenyanPhone(phone)}-${code}` }
  })
}

export function resetPassword({ phone, password }) {
  return request(
    (db) => {
      const credential = findCredential(db, phone)
      if (!credential) throw new ApiError('Account not found.', { status: 404 })
      credential.password = password
      return { ok: true }
    },
    { mutates: true },
  )
}

export function startRegistration({ fullName, phone, email, relationship }) {
  return request((db) => {
    if (findCredential(db, phone)) {
      throw new ApiError('This phone number already has an Enfantil account. Sign in instead.', { field: 'phone', status: 409 })
    }
    return { sentTo: normalizeKenyanPhone(phone), fullName, email, relationship }
  })
}

/** Completes registration. The demo signs the new account in to the sample family's records. */
export function completeRegistration({ fullName, phone, email, relationship, password, code }) {
  return request(
    (db) => {
      if (!isAcceptedCode(code)) throw new ApiError('That code is not right. Check the SMS and try again.', { field: 'code' })
      const [firstName, ...rest] = fullName.trim().split(/\s+/)
      Object.assign(db.caregiver, {
        firstName,
        lastName: rest.join(' '),
        fullName: fullName.trim(),
        relationship,
        phone: normalizeKenyanPhone(phone),
        email: email || db.caregiver.email,
      })
      db.credentials.push({ userId: db.caregiver.id, phone: normalizeKenyanPhone(phone), email: email || '', password })
      return sessionFor(db, db.caregiver.id)
    },
    { mutates: true },
  )
}
