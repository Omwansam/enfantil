/** Doctors' notifications (D8): requests, messages, overdue care, abnormal readings, unfinished notes. */
import { currentStaffId } from '../../context.js'
import { request } from './client'

export const NOTIFICATION_TYPES = {
  request: 'Appointment requests',
  message: 'Messages',
  overdue: 'Overdue care',
  abnormal: 'Abnormal readings',
  note: 'Unfinished notes',
  record: 'Record updates',
}

/** GET /api/notifications */
export function getStaffNotifications(userId) {
  return request((db) => db.staffNotifications.filter((n) => n.to.includes(userId)).sort((a, b) => (a.at < b.at ? 1 : -1)))
}

/** POST /api/notifications/:id/read */
export function markStaffNotificationRead(id) {
  return request(
    (db) => {
      const n = db.staffNotifications.find((x) => x.id === id)
      const me = currentStaffId()
      if (n && !(n.readBy ??= []).includes(me)) n.readBy.push(me)
      return { ok: true }
    },
    { mutates: true, delay: 100 },
  )
}

/** POST /api/notifications/read-all */
export function markAllStaffNotificationsRead(userId) {
  return request(
    (db) => {
      db.staffNotifications
        .filter((n) => n.to.includes(userId))
        .forEach((n) => {
          if (!(n.readBy ??= []).includes(userId)) n.readBy.push(userId)
        })
      return { ok: true }
    },
    { mutates: true },
  )
}
