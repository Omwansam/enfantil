import { daysBetween, formatDate, formatTime, isSameDay, isValidISODate, startOfWeek, TODAY, TODAY_ISO } from '../utils/dates'
import { notifySubject } from '../../notify.js'
import { invalid, notFound, request } from './client'
import { context, latestMeasurement, nowISO, patientBasics, primaryCaregiver, staffSummary } from './helpers'

export const NUTRITION_STATUSES = [
  { value: 'normal', label: 'Normal' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'moderate', label: 'Moderate malnutrition' },
  { value: 'severe', label: 'Severe malnutrition' },
]

const EDITABLE = ['measurements', 'history', 'nutritionStatus', 'plan', 'followUpOn', 'diagnosis', 'caregiverSummary', 'shareWithCaregiver']

function queueItem(db, ctx, note) {
  const a = db.appointments.find((x) => x.id === note.appointmentId)
  const p = ctx.patientsById[note.patientId]
  const daysOld = daysBetween(a.start, TODAY)
  const when = isSameDay(a.start, TODAY) ? `Today ${formatTime(a.start)}` : formatDate(a.start, 'weekday')
  return {
    id: note.id,
    status: note.status,
    patient: patientBasics(p),
    reason: a.reason,
    start: a.start,
    when,
    daysOld,
    lastWeek: a.start.slice(0, 10) < startOfWeekISO(),
  }
}

function startOfWeekISO() {
  const d = startOfWeek(TODAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function myQueue(db, userId) {
  const ctx = context(db)
  return db.visitNotes
    .filter((n) => n.authorId === userId && n.status !== 'signed')
    .map((n) => queueItem(db, ctx, n))
    .sort((a, b) => {
      const ad = a.start.slice(0, 10)
      const bd = b.start.slice(0, 10)
      if (ad !== bd) return ad < bd ? 1 : -1
      return a.start < b.start ? -1 : 1
    })
}

/** GET /api/visit-notes/queue — unfinished notes for the signed-in clinician. */
export function getNotesQueue(userId) {
  return request((db) => myQueue(db, userId))
}

/** GET /api/visit-notes/:id — the note, the visit, the patient and their previous visit (frame 25). */
export function getVisitNote(id, userId) {
  return request((db) => {
    const note = db.visitNotes.find((n) => n.id === id)
    if (!note) throw notFound('This visit note')
    const ctx = context(db)
    const a = db.appointments.find((x) => x.id === note.appointmentId)
    const p = ctx.patientsById[note.patientId]
    const visitDate = a.start.slice(0, 10)
    const previous = db.visitNotes
      .filter((n) => n.patientId === p.id && n.status === 'signed' && n.id !== note.id)
      .map((n) => ({ note: n, appt: db.appointments.find((x) => x.id === n.appointmentId) }))
      .filter((x) => x.appt.start.slice(0, 10) < visitDate)
      .sort((x, y) => (x.appt.start < y.appt.start ? 1 : -1))[0]
    const carer = primaryCaregiver(p)
    return {
      note,
      appointment: {
        id: a.id,
        start: a.start,
        reason: a.reason,
        room: a.room,
        when: isSameDay(a.start, TODAY) ? `Today ${formatTime(a.start)}` : `${formatDate(a.start, 'weekday')} ${formatTime(a.start)}`,
        clinician: staffSummary(db, a.clinicianId),
      },
      patient: { ...patientBasics(p, a.start) },
      caregiver: carer ? { name: carer.name, hasApp: carer.hasApp } : null,
      previousMeasurement: latestMeasurement(ctx, p.id, visitDate),
      previousVisit: previous
        ? {
            date: previous.appt.start.slice(0, 10),
            summary: previous.note.summary || previous.note.plan,
            nutritionStatus: previous.note.nutritionStatus,
            author: staffSummary(db, previous.note.authorId)?.name,
          }
        : null,
      queue: myQueue(db, userId),
      signedBy: note.signedAt ? staffSummary(db, note.authorId) : null,
    }
  })
}

function pickEditable(fields) {
  return Object.fromEntries(EDITABLE.filter((k) => k in fields).map((k) => [k, structuredClone(fields[k])]))
}

/** PATCH /api/visit-notes/:id — autosave a draft. */
export function saveDraft(id, fields) {
  return request(
    (db) => {
      const note = db.visitNotes.find((n) => n.id === id)
      if (!note) throw notFound('This visit note')
      if (note.status === 'signed') throw invalid({ form: 'This note is already signed.' })
      Object.assign(note, pickEditable(fields), { status: 'draft', savedAt: nowISO() })
      return { savedAt: note.savedAt, status: note.status }
    },
    { mutates: true, delay: 350 },
  )
}

const RANGES = {
  weightKg: [0.4, 40, 'Enter a weight between 0.4 and 40 kg.'],
  heightCm: [30, 130, 'Enter a height between 30 and 130 cm.'],
  muacCm: [6, 25, 'Enter a MUAC between 6 and 25 cm.'],
  tempC: [34, 42.5, 'Enter a temperature between 34 and 42.5 °C.'],
}

export function validateNote(fields, { signing = false } = {}) {
  const errors = {}
  for (const [key, [min, max, message]] of Object.entries(RANGES)) {
    const raw = fields.measurements?.[key]
    if (raw === '' || raw === null || raw === undefined) {
      if (signing && key === 'weightKg') errors['measurements.weightKg'] = 'Enter the weight before signing.'
      continue
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < min || n > max) errors[`measurements.${key}`] = message
  }
  if (signing) {
    if (!fields.history.trim()) errors.history = 'Add the history and findings before signing.'
    if (!fields.nutritionStatus) errors.nutritionStatus = 'Choose a nutrition status.'
    if (!fields.plan.trim()) errors.plan = 'Add the plan before signing.'
    if (fields.shareWithCaregiver && !fields.caregiverSummary.trim()) {
      errors.caregiverSummary = 'Write a short summary for the caregiver, or turn sharing off.'
    }
  }
  if (fields.followUpOn) {
    if (!isValidISODate(fields.followUpOn)) errors.followUpOn = 'Enter a real date.'
    else if (fields.followUpOn < TODAY_ISO) errors.followUpOn = 'Choose a follow-up date from today onwards.'
  }
  if ((fields.caregiverSummary ?? '').length > 400) errors.caregiverSummary = 'Keep the summary to 400 characters.'
  return errors
}

/** POST /api/visit-notes/:id/sign — sign, add the measurements to the record, share the summary. */
export function signNote(id, fields, userId) {
  return request(
    (db) => {
      const note = db.visitNotes.find((n) => n.id === id)
      if (!note) throw notFound('This visit note')
      const errors = validateNote(fields, { signing: true })
      if (Object.keys(errors).length) throw invalid(errors)
      const a = db.appointments.find((x) => x.id === note.appointmentId)
      Object.assign(note, pickEditable(fields), { status: 'signed', savedAt: nowISO(), signedAt: nowISO() })
      const m = fields.measurements
      const date = a.start.slice(0, 10)
      db.measurements = db.measurements.filter((x) => !(x.patientId === note.patientId && x.date === date))
      if (m.weightKg || m.heightCm) {
        db.measurements.push({
          id: `m-${note.patientId}-${date}`,
          patientId: note.patientId,
          date,
          weightKg: m.weightKg ? Number(m.weightKg) : null,
          heightCm: m.heightCm ? Number(m.heightCm) : null,
          muacCm: m.muacCm ? Number(m.muacCm) : null,
          tempC: m.tempC ? Number(m.tempC) : null,
          by: staffSummary(db, note.authorId)?.name,
        })
      }
      const ctx = context(db)
      const p = ctx.patientsById[note.patientId]
      if (fields.shareWithCaregiver && fields.caregiverSummary.trim()) {
        a.summary = fields.caregiverSummary.trim()
        notifySubject(db, note.patientId, {
          type: 'record',
          title: `Visit summary from ${staffSummary(db, note.authorId)?.name ?? 'the hospital'}`,
          body: fields.caregiverSummary.trim(),
          target: { page: 'health' },
        })
      }
      const queue = myQueue(db, userId)
      return {
        signedAt: note.signedAt,
        patientName: `${p.firstName} ${p.lastName}`,
        caregiverName: primaryCaregiver(p)?.name ?? null,
        shared: Boolean(fields.shareWithCaregiver && fields.caregiverSummary.trim()),
        nextId: queue[0]?.id ?? null,
      }
    },
    { mutates: true, delay: 650 },
  )
}
