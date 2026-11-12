import { request, write } from './client'
import { byDateDesc, profileSummary } from './helpers'

export function getNotifications() {
  return request((db) =>
    [...db.notifications].sort(byDateDesc('createdAt')).map((n) => ({ ...n, child: profileSummary(db, n.childId) })),
  )
}

export function markNotificationRead(id) {
  return write((state, account) => {
    const n = state.familyNotifications.find((x) => x.id === id && x.accountId === account.id)
    if (n) n.read = true
    return { ok: true }
  })
}

export function markAllNotificationsRead() {
  return write((state, account) => {
    state.familyNotifications.forEach((n) => {
      if (n.accountId === account.id) n.read = true
    })
    return { ok: true }
  })
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
