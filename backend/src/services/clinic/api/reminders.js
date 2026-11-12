import { TODAY_ISO } from '../utils/dates'
import { notifySubject } from '../../notify.js'
import { notFound, request } from './client'
import { nowISO, primaryCaregiver, reminderSentToday } from './helpers'

function send(db, patientId) {
  const p = db.patients.find((x) => x.id === patientId)
  if (!p) throw notFound('This patient')
  const carer = primaryCaregiver(p)
  const reminder = {
    id: `r-${patientId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    patientId,
    caregiverId: carer?.id,
    channel: carer?.hasApp ? 'sms+app' : 'sms',
    sentAt: nowISO(),
  }
  db.reminders.push(reminder)
  p.contactLog.push({ id: `ca-${reminder.id}-${Math.random().toString(36).slice(2, 6)}`, type: 'sms', at: reminder.sentAt, replied: false })
  if (carer?.hasApp) {
    notifySubject(db, patientId, {
      type: 'overdue',
      title: `${p.firstName} has a vaccine overdue`,
      body: 'Tumaini Family Hospital sent a reminder. Book a visit in the app, or come to the Child Health Clinic.',
      target: { page: 'vaccines' },
    })
  }
  return reminder
}

/** POST /api/reminders — one SMS (and in-app, if the caregiver uses the app) reminder. */
export function sendReminder(patientId) {
  return request((db) => send(db, patientId), { mutates: true, delay: 450 })
}

/** POST /api/reminders/bulk — "Remind all": skips anyone already reminded today. */
export function sendReminders(patientIds) {
  return request(
    (db) => {
      const sent = patientIds.filter((id) => !reminderSentToday(db, id)).map((id) => send(db, id))
      return { sent: sent.length, date: TODAY_ISO }
    },
    { mutates: true, delay: 800 },
  )
}
