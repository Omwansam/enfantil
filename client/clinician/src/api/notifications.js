/** Doctors' notifications (D8): requests, messages, overdue care, abnormal readings, unfinished notes. */
import { get, post, seg } from './client'

export const NOTIFICATION_TYPES = {
  request: 'Appointment requests',
  message: 'Messages',
  overdue: 'Overdue care',
  abnormal: 'Abnormal readings',
  note: 'Unfinished notes',
  record: 'Record updates',
}

export function getStaffNotifications() {
  return get('/notifications')
}

export function markStaffNotificationRead(id) {
  return post(`/notifications/${seg(id)}/read`)
}

export function markAllStaffNotificationsRead() {
  return post('/notifications/read-all')
}
