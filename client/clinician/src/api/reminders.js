/** SMS (and in-app) reminders to families. */
import { post } from './client'

/** One SMS (and in-app, if the caregiver uses the app) reminder. */
export function sendReminder(patientId) {
  return post('/reminders', { patientId })
}

/** "Remind all": skips anyone already reminded today. */
export function sendReminders(patientIds) {
  return post('/reminders/bulk', { patientIds })
}
