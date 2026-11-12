/** Notifications and the sidebar unread counts. */
import { get, post, seg } from './client'

export function getNotifications() {
  return get('/notifications')
}

export function markNotificationRead(id) {
  return post(`/notifications/${seg(id)}/read`)
}

export function markAllNotificationsRead() {
  return post('/notifications/read-all')
}

/** Unread counts for the sidebar badges. */
export function getUnreadCounts() {
  return get('/notifications/unread-counts')
}
