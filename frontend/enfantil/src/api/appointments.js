import { ApiError, nextId, notFound, request } from './client'
import { byDateAsc, byDateDesc, enrichAppointment, findClinician } from './helpers'
import { toISODate } from '../utils/dates'

/** when: 'upcoming' | 'past' | 'all'. Optional childId narrows to one child. */
export function getAppointments({ when = 'all', childId } = {}) {
  return request((db) => {
    let list = db.appointments.map((a) => enrichAppointment(db, a))
    if (childId) list = list.filter((a) => a.childId === childId)
    if (when === 'upcoming') return list.filter((a) => a.upcoming).sort(byDateAsc('start'))
    if (when === 'past') return list.filter((a) => !a.upcoming).sort(byDateDesc('start'))
    return list.sort(byDateAsc('start'))
  })
}

export function getAppointment(id) {
  return request((db) => {
    const a = db.appointments.find((x) => x.id === id)
    if (!a) throw notFound('This visit')
    return enrichAppointment(db, a)
  })
}

export function getFacilities() {
  return request((db) => db.facilities, { delay: 150 })
}

export function getClinicians(facilityId) {
  return request(
    (db) =>
      db.clinicians
        .filter((c) => c.facilityId === facilityId && c.messaging !== false && c.role !== 'Clinic staff')
        .map((c) => findClinician(db, c.id)),
    { delay: 120 },
  )
}

const REASONS = {
  vaccination: 'Vaccination',
  growth: 'Growth check',
  unwell: 'Child is unwell',
  followup: 'Follow-up',
}
const TIMES = { morning: '09:00', afternoon: '14:00', any: '09:00' }

/** Saves a request. It shows in Visits as "Requested" until the clinic confirms a time. */
export function requestAppointment({ childId, reason, facilityId, clinicianId, day, timeOfDay, note, rescheduleOf }) {
  return request(
    (db) => {
      if (!REASONS[reason]) throw new ApiError('Choose a reason for the visit.', { field: 'reason' })
      if (!db.children.some((c) => c.id === childId)) throw new ApiError('Choose a child.', { field: 'childId' })
      const appointment = {
        id: nextId('appt-req'),
        childId,
        start: `${toISODate(day)}T${TIMES[timeOfDay] ?? '09:00'}`,
        title: rescheduleOf ? `New time for ${rescheduleOf.title}` : `${REASONS[reason]} (requested)`,
        clinicianId: clinicianId || null,
        facilityId,
        location: null,
        ref: nextId('REQ').toUpperCase(),
        note: note?.trim() || null,
        status: 'requested',
        timeOfDay,
        reason,
        doseIds: [],
      }
      db.appointments.push(appointment)
      return enrichAppointment(db, appointment)
    },
    { mutates: true },
  )
}

/** Withdraws a request the clinic has not confirmed yet. */
export function cancelAppointmentRequest(id) {
  return request(
    (db) => {
      const appointment = db.appointments.find((a) => a.id === id)
      if (!appointment) throw notFound('This request')
      if (appointment.status !== 'requested') throw new ApiError('Only requests that are not confirmed yet can be cancelled here.')
      appointment.status = 'cancelled'
      appointment.summary = 'You cancelled this request.'
      return enrichAppointment(db, appointment)
    },
    { mutates: true },
  )
}
