import { request } from './client'
import { byDateDesc, childSummary } from './helpers'

export function getNotifications() {
  return request((db) =>
    [...db.notifications].sort(byDateDesc('createdAt')).map((n) => ({ ...n, child: childSummary(db, n.childId) })),
  )
}

export function markNotificationRead(id) {
  return request(
    (db) => {
      const n = db.notifications.find((x) => x.id === id)
      if (n) n.read = true
      return { ok: true }
    },
    { mutates: true, delay: 100 },
  )
}

export function markAllNotificationsRead() {
  return request(
    (db) => {
      db.notifications.forEach((n) => {
        n.read = true
      })
      return { ok: true }
    },
    { mutates: true },
  )
}

/** Unread counts for the sidebar badges. */
export function getUnreadCounts() {
  return request(
    (db) => ({
      messages: db.conversations.filter((c) => c.messages.some((m) => m.from === 'clinician' && !m.read)).length,
      notifications: db.notifications.filter((n) => !n.read).length,
    }),
    { delay: 80 },
  )
}
