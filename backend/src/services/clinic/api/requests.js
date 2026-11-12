/**
 * Appointment requests from the family app (D7). Each action notifies the
 * person who asked by SMS and in the app.
 */
import { formatDate, formatTime, isValidISODate, isWeekend, TODAY_ISO } from '../utils/dates'
import { locationFor, newRef, notifyFamily, when } from '../../notify.js'
import { currentStaffId } from '../../context.js'
import { invalid, notFound, request } from './client'
import { context, motherBasics, nowISO, patientBasics, staffSummary } from './helpers'

export const VISIT_TYPES = {
  antenatal: 'Antenatal',
  postnatal: 'Postnatal',
  vaccination: 'Baby vaccination',
  growth: 'Growth check',
  sick: 'Sick visit',
  general: 'General consultation',
}

export const DECLINE_REASONS = [
  'The clinic is closed at that time',
  'No doctor available for this visit type',
  'Please go to the emergency department instead',
  'Duplicate request',
  'Other',
]

function subjectFor(db, ctx, id) {
  const mother = ctx.mothersById[id]
  if (mother) return motherBasics(mother)
  const p = ctx.patientsById[id]
  return p ? patientBasics(p) : null
}

function enrich(db, ctx, r) {
  return {
    ...r,
    typeLabel: VISIT_TYPES[r.visitType],
    subject: subjectFor(db, ctx, r.patientId),
    clinician: r.clinicianId ? staffSummary(db, r.clinicianId) : null,
    proposal: r.proposal ? { ...r.proposal, clinician: staffSummary(db, r.proposal.clinicianId) } : null,
  }
}

/** GET /api/requests */
export function getRequests() {
  return request((db) => {
    const ctx = context(db)
    const order = { pending: 0, proposed: 1, confirmed: 2, declined: 3, cancelled: 4 }
    return db.requests.map((r) => enrich(db, ctx, r)).sort((a, b) => order[a.status] - order[b.status] || (a.requestedAt < b.requestedAt ? -1 : 1))
  })
}

function slotTaken(db, { date, time, clinicianId }) {
  return db.appointments.some((a) => a.clinicianId === clinicianId && a.status !== 'cancelled' && a.start === `${date}T${time}`)
}

export function validateSlot(db, { date, time, clinicianId }) {
  const errors = {}
  if (!date || !isValidISODate(date)) errors.date = 'Choose a date.'
  else if (date < TODAY_ISO) errors.date = 'Choose today or a later date.'
  else if (isWeekend(date) && new Date(`${date}T00:00`).getDay() === 0) errors.date = 'The hospital’s clinics are closed on Sundays.'
  if (!clinicianId) errors.clinicianId = 'Choose a clinician.'
  if (!time) errors.time = 'Choose a time.'
  else if (db && date && clinicianId && slotTaken(db, { date, time, clinicianId })) errors.time = 'That time is already booked. Choose another.'
  return errors
}

function find(db, id) {
  const r = db.requests.find((x) => x.id === id)
  if (!r) throw notFound('This request')
  return r
}

/** POST /api/requests/:id/confirm — books the visit. */
export function confirmRequest(id, { date, time, clinicianId, room }) {
  return request(
    (db) => {
      const r = find(db, id)
      if (!['pending', 'proposed'].includes(r.status)) throw invalid({ form: 'This request has already been handled.' })
      const errors = validateSlot(db, { date, time, clinicianId })
      if (!room) errors.room = 'Choose a room.'
      if (Object.keys(errors).length) throw invalid(errors)
      const appt = {
        id: `a-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        patientId: r.patientId,
        start: `${date}T${time}`,
        durationMin: 20,
        reason:
          VISIT_TYPES[r.visitType] === 'Antenatal'
            ? 'Antenatal visit'
            : VISIT_TYPES[r.visitType] === 'Postnatal'
              ? 'Postnatal check'
              : VISIT_TYPES[r.visitType],
        reasonLong: VISIT_TYPES[r.visitType],
        clinicianId,
        room,
        status: 'upcoming',
        visitType: r.visitType,
        doseKeys: [],
        noteForCaregiver: r.note ?? '',
        clinicalNote: '',
        cancelReason: '',
        history: [{ at: nowISO(), action: 'confirmed from request' }],
        createdAt: nowISO(),
        ref: (r.ref ?? newRef('A')).replace('-R-', '-A-'),
        location: locationFor(room, r.visitType, Boolean(db.mothers.find((m) => m.id === r.patientId))),
      }
      db.appointments.push(appt)
      Object.assign(r, { status: 'confirmed', confirmedStart: appt.start, confirmedClinicianId: clinicianId, respondedAt: nowISO(), appointmentId: appt.id })
      if (r.accountId) {
        const isMe = r.requestedBy?.motherId && r.requestedBy.motherId === r.patientId
        notifyFamily(db, {
          accountId: r.accountId,
          type: 'request-confirmed',
          childId: isMe ? 'me' : r.patientId,
          title: 'Appointment request confirmed',
          body: `${r.title ?? VISIT_TYPES[r.visitType]} · ${when(appt.start)} with ${staffSummary(db, clinicianId)?.name ?? 'the hospital'}.`,
          target: { appointmentId: appt.id },
        })
      }
      return { notified: r.requestedBy.name, start: appt.start, appointmentId: appt.id }
    },
    { mutates: true, delay: 550 },
  )
}

/** POST /api/requests/:id/propose — offers another time; the parent accepts or declines in the app. */
export function proposeTime(id, { date, time, clinicianId, note }) {
  return request(
    (db) => {
      const r = find(db, id)
      if (r.status !== 'pending') throw invalid({ form: 'You can only propose a time for a pending request.' })
      const errors = validateSlot(db, { date, time, clinicianId })
      if ((note ?? '').length > 200) errors.note = 'Keep the note to 200 characters.'
      if (Object.keys(errors).length) throw invalid(errors)
      Object.assign(r, {
        status: 'proposed',
        proposal: { start: `${date}T${time}`, clinicianId, note: note?.trim() ?? '', at: nowISO(), by: staffSummary(db, currentStaffId())?.name ?? null },
        respondedAt: nowISO(),
      })
      if (r.accountId) {
        const isMe = r.requestedBy?.motherId && r.requestedBy.motherId === r.patientId
        notifyFamily(db, {
          accountId: r.accountId,
          type: 'request-proposed',
          childId: isMe ? 'me' : r.patientId,
          title: 'New time proposed for your request',
          body: `${r.title ?? VISIT_TYPES[r.visitType]}: ${when(r.proposal.start)} instead of ${when(r.preferredStart)}. Accept or decline in Visits.`,
          target: { appointmentId: r.id },
        })
      }
      return { notified: r.requestedBy.name, start: r.proposal.start }
    },
    { mutates: true, delay: 500 },
  )
}

/** POST /api/requests/:id/decline */
export function declineRequest(id, { reason, note }) {
  return request(
    (db) => {
      const r = find(db, id)
      if (!['pending', 'proposed'].includes(r.status)) throw invalid({ form: 'This request has already been handled.' })
      if (!reason) throw invalid({ reason: 'Choose a reason. The parent sees it.' })
      Object.assign(r, { status: 'declined', declineReason: reason, declineNote: note?.trim() ?? '', respondedAt: nowISO() })
      r.summary = [reason, note?.trim()].filter(Boolean).join('. ')
      if (r.accountId) {
        const isMe = r.requestedBy?.motherId && r.requestedBy.motherId === r.patientId
        notifyFamily(db, {
          accountId: r.accountId,
          type: 'request-declined',
          childId: isMe ? 'me' : r.patientId,
          title: 'Appointment request declined',
          body: `${r.title ?? VISIT_TYPES[r.visitType]} on ${when(r.preferredStart)}: ${r.summary}`,
          target: { appointmentId: r.id },
        })
      }
      return { notified: r.requestedBy.name }
    },
    { mutates: true, delay: 450 },
  )
}

export function requestWhen(start) {
  return `${formatDate(start, 'weekday')} at ${formatTime(start)}`
}
