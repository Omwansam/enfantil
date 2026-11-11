import { ApiError, request } from './client'
import { childSummary, findFacility } from './helpers'
import { isValidEmail, isValidKenyanMobile, normalizeKenyanPhone } from '../utils/format'

export function getProfile() {
  return request((db) => db.caregiver)
}

export function updateProfile({ fullName, phone, email, county }) {
  return request(
    (db) => {
      if (fullName.trim().split(/\s+/).length < 2) throw new ApiError('Enter your first and last name.', { field: 'fullName' })
      if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
      if (email && !isValidEmail(email)) throw new ApiError('Enter a valid email address.', { field: 'email' })
      const [firstName, ...rest] = fullName.trim().split(/\s+/)
      Object.assign(db.caregiver, {
        firstName,
        lastName: rest.join(' '),
        fullName: fullName.trim(),
        phone: normalizeKenyanPhone(phone),
        email: email.trim(),
        county,
      })
      const credential = db.credentials.find((c) => c.userId === db.caregiver.id)
      if (credential) Object.assign(credential, { phone: db.caregiver.phone, email: db.caregiver.email })
      return db.caregiver
    },
    { mutates: true },
  )
}

export function getSettings() {
  return request((db) => ({ ...db.settings, phone: db.caregiver.phone }))
}

export function updateReminders(changes) {
  return request(
    (db) => {
      Object.assign(db.settings.reminders, changes)
      return db.settings.reminders
    },
    { mutates: true, delay: 200 },
  )
}

export function updateLanguage(language) {
  return request(
    (db) => {
      if (!['en', 'sw'].includes(language)) throw new ApiError('Choose English or Kiswahili.')
      db.settings.language = language
      return { language }
    },
    { mutates: true, delay: 200 },
  )
}

export function getClinicAccess() {
  return request((db) =>
    db.clinicAccess.map((a) => ({
      ...a,
      facility: findFacility(db, a.facilityId),
      children: a.childIds.map((id) => childSummary(db, id)).filter(Boolean),
    })),
  )
}

export function setClinicAccess(id, active) {
  return request(
    (db) => {
      const access = db.clinicAccess.find((a) => a.id === id)
      if (!access) throw new ApiError('This clinic could not be found.', { status: 404 })
      access.active = active
      return access
    },
    { mutates: true },
  )
}

export function changePassword({ currentPassword, newPassword }) {
  return request(
    (db) => {
      const credential = db.credentials.find((c) => c.userId === db.caregiver.id)
      if (!credential || credential.password !== currentPassword) {
        throw new ApiError('Your current password is not right.', { field: 'currentPassword', status: 401 })
      }
      credential.password = newPassword
      return { ok: true }
    },
    { mutates: true },
  )
}
