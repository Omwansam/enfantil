import { addDays, hoursBetween, now, TODAY, TODAY_ISO, toISODate } from '../utils/dates'
import { alertLabel } from '../utils/kepi'
import { request } from './client'
import { context, enrichAppointment, patientRow } from './helpers'

/** How long the longest-waiting caregiver has been waiting for a reply. */
function oldestWaitingHours(db) {
  const waits = db.conversations
    .filter((c) => c.type === 'caregiver' && c.unread > 0)
    .map((c) => {
      // The caregiver has been waiting since the first message we haven't read.
      const unread = c.messages.filter((m) => m.from === 'them').slice(-c.unread)
      return unread.length ? hoursBetween(unread[0].sentAt, now()) : 0
    })
  return waits.length ? Math.max(...waits) : 0
}

function unfinishedNotes(db, userId) {
  return db.visitNotes.filter((n) => n.authorId === userId && n.status !== 'signed')
}

/** GET /api/dashboard — stat cards, today's schedule, pending notes and overdue alerts (frame 11). */
export function getDashboard(userId) {
  return request((db) => {
    const ctx = context(db)
    const weekAgo = toISODate(addDays(TODAY, -7))
    const today = db.appointments
      .filter((a) => a.start.slice(0, 10) === TODAY_ISO)
      .sort((a, b) => (a.start === b.start ? a.room.localeCompare(b.room) : a.start < b.start ? -1 : 1))
      .map((a) => enrichAppointment(db, ctx, a))
    const upcoming = today.filter((a) => a.status === 'upcoming')
    const next = upcoming[0] ?? null

    const overdueToday = []
    for (const a of upcoming) {
      if (overdueToday.some((o) => o.patientId === a.patientId)) continue
      const row = patientRow(ctx, ctx.patientsById[a.patientId])
      if (row.status === 'Overdue') overdueToday.push({ patientId: a.patientId, name: row.fullName, dose: alertLabel(row.overdueKeys[0]) })
    }

    const notes = unfinishedNotes(db, userId)
    const startOfWeek = toISODate(addDays(TODAY, -((TODAY.getDay() + 6) % 7)))
    const notesFromLastWeek = notes.filter((n) => db.appointments.find((a) => a.id === n.appointmentId).start.slice(0, 10) < startOfWeek).length

    return {
      stats: {
        authorised: db.patients.length,
        addedThisWeek: db.patients.filter((p) => p.registeredOn > weekAgo).length,
        todayTotal: today.length,
        todayCompleted: today.filter((a) => a.status === 'completed').length,
        todayCancelled: today.filter((a) => a.status === 'cancelled').length,
        unreadConversations: db.conversations.filter((c) => c.unread > 0).length,
        oldestWaitingHours: oldestWaitingHours(db),
        unfinishedNotes: notes.length,
        notesFromLastWeek,
      },
      today,
      remaining: upcoming.length,
      next,
      overdueToday,
    }
  })
}

/** GET /api/nav-counts — the sidebar badges. */
export function getNavCounts(userId) {
  return request(
    (db) => ({
      messages: db.conversations.filter((c) => c.unread > 0).length,
      visitNotes: unfinishedNotes(db, userId).length,
    }),
    { delay: 80 },
  )
}
