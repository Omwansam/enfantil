import { ApiError, request, write } from './client'
import { changePassword as changeAccountPassword } from './auth'
import { currentAccountId } from '../../context.js'
import { findFacility } from './helpers'
import { isValidEmail, isValidKenyanMobile, normalizeKenyanPhone } from '../utils/format'

export function getProfile() {
  return request((db) => db.caregiver)
}

export function updateProfile({ fullName, phone, email, county } = {}) {
  return write((state, account, view) => {
    if (String(fullName ?? '').trim().split(/\s+/).length < 2) throw new ApiError('Enter your first and last name.', { field: 'fullName' })
    if (!isValidKenyanMobile(phone)) throw new ApiError('Enter a valid Kenyan mobile number.', { field: 'phone' })
    if (email && !isValidEmail(email)) throw new ApiError('Enter a valid email address.', { field: 'email' })
    const p = normalizeKenyanPhone(phone)
    if (state.accounts.some((a) => a.id !== account.id && a.phone === p)) throw new ApiError('Another account already uses this number.', { field: 'phone', status: 409 })
    const [firstName, ...rest] = fullName.trim().split(/\s+/)
    Object.assign(account, { firstName, lastName: rest.join(' '), fullName: fullName.trim(), phone: p, email: String(email ?? '').trim(), county })
    // Keep the hospital's records in step: her own record and her entry on each child's record.
    const m = state.mothers.find((x) => x.id === account.motherId)
    if (m) Object.assign(m, { firstName, lastName: account.lastName, phone: p })
    for (const child of state.patients) {
      for (const c of child.caregivers) if (c.id === account.id) Object.assign(c, { name: account.fullName, phone: p, email: account.email })
    }
    return view().caregiver
  })
}

export function getSettings() {
  return request((db) => ({ ...db.settings, phone: db.caregiver.phone }))
}

export function updateReminders(changes = {}) {
  return write((state, account) => {
    const allowed = ['sms', 'push', 'weeklyEmail', 'timing']
    for (const k of Object.keys(changes)) if (allowed.includes(k)) account.settings.reminders[k] = changes[k]
    return account.settings.reminders
  })
}

export function updateLanguage(language) {
  return write((state, account) => {
    if (!['en', 'sw'].includes(language)) throw new ApiError('Choose English or Kiswahili.')
    account.settings.language = language
    return { language }
  })
}

/** "Who can see my records": the Tumaini Family Hospital care team, with the consent date. */
export function getRecordAccess() {
  return request((db) => {
    const facility = findFacility(db, 'tfh')
    const team = db.clinicians.filter((c) => c.role !== 'Clinic staff').map((c) => ({ id: c.id, name: c.name, role: c.role }))
    return {
      facility,
      team,
      consent: db.consent,
      people: [{ id: 'me', name: 'You' }, ...db.children.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))],
    }
  })
}

export function changePassword({ currentPassword, newPassword } = {}) {
  const id = currentAccountId()
  if (!id) throw new ApiError('Please sign in again.', { status: 401 })
  return changeAccountPassword(id, { currentPassword, newPassword })
}
