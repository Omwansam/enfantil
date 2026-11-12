/** Profile, reminders, language, "Who can see my records" and password. */
import { get, patch, post } from './client'

export function getProfile() {
  return get('/me')
}

export function updateProfile({ fullName, phone, email, county }) {
  return patch('/me', { fullName, phone, email, county })
}

export function getSettings() {
  return get('/me/settings')
}

export function updateReminders(changes) {
  return patch('/me/settings/reminders', changes)
}

export function updateLanguage(language) {
  return patch('/me/settings/language', { language })
}

/** "Who can see my records": the Tumaini Family Hospital care team, with the consent date. */
export function getRecordAccess() {
  return get('/me/record-access')
}

export function changePassword({ currentPassword, newPassword }) {
  return post('/me/password', { currentPassword, newPassword })
}
