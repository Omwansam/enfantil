import { shortDoseName } from '../utils/kepi'
import { notFound, request } from './client'
import { caregiverView, context, lastContact, patientBasics, patientRow, primaryCaregiver, reminderSentToday } from './helpers'

export const COVERAGE_TARGET = 90

/** GET /api/coverage?period= — facility report for the month, compared with the month before (frame 26). */
export function getCoverage(periodId) {
  return request((db) => {
    const index = db.coverage.findIndex((r) => r.id === periodId)
    if (index === -1) throw notFound('This report period')
    const report = db.coverage[index]
    const previous = db.coverage[index + 1] ?? null
    return {
      ...report,
      target: COVERAGE_TARGET,
      previous: previous ? { id: previous.id, label: previous.label, fullyImmunized12m: previous.fullyImmunized12m } : null,
      periods: db.coverage.map((r) => ({ id: r.id, label: r.label })),
      remindersThisWeek: db.remindersSentBeforeToday + db.reminders.length,
    }
  })
}

/** GET /api/coverage/defaulters — authorised children with overdue doses, worked out from their records. */
export function getDefaulters() {
  return request((db) => {
    const ctx = context(db)
    return db.patients
      .map((p) => ({ p, row: patientRow(ctx, p) }))
      .filter(({ row }) => row.status === 'Overdue')
      .map(({ p, row }) => {
        const carer = primaryCaregiver(p)
        return {
          ...patientBasics(p),
          overdueKeys: row.overdueKeys,
          overdueLabel: row.overdueKeys.map(shortDoseName).join(' · '),
          daysLate: row.daysLate,
          caregiver: carer ? caregiverView(carer) : null,
          lastContact: lastContact(db, ctx, p),
          remindedToday: reminderSentToday(db, p.id),
        }
      })
  })
}
