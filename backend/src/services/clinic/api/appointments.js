import { addDays, daysBetween, formatDate, formatTime, isValidISODate, TODAY, TODAY_ISO, toDate, toISODate } from '../utils/dates'
import { pendingDoses, plannedLabel, SCHEDULE_BY_KEY } from '../utils/kepi'
import { locationFor, newRef, notifySubject, when } from '../../notify.js'
import { ApiError, invalid, notFound, request } from './client'
import { context, enrichAppointment, nowISO, primaryCaregiver, scheduleFor, staffSummary } from './helpers'

/** Bookable times: 08:00–12:15 and 14:00–16:30, every 15 minutes. */
export const SLOT_TIMES = (() => {
  const times = []
  const add = (fromH, toH, toM) => {
    for (let h = fromH; h <= toH; h += 1) {
      for (const m of [0, 15, 30, 45]) {
        if (h === toH && m > toM) break
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      }
    }
  }
  add(8, 12, 15)
  add(14, 16, 30)
  return times
})()

export const CANCEL_REASONS = ['Caregiver asked to cancel', 'Child is unwell', 'Clinician unavailable', 'Booked in error', 'Other']

function slotTaken(db, { date, time, clinicianId, excludeId }) {
  return db.appointments.some((a) => a.id !== excludeId && a.clinicianId === clinicianId && a.status !== 'cancelled' && a.start === `${date}T${time}`)
}

function slotInPast(date, time) {
  return `${date}T${time}` <= nowISO()
}

/** GET /api/appointments?from=&to=&clinician=&status= — the clinic schedule grouped by day (frame 13). */
export function getSchedule({ from, to, clinicianId = 'all', status = 'all' }) {
  return request((db) => {
    const ctx = context(db)
    const list = db.appointments
      .filter((a) => {
        const day = a.start.slice(0, 10)
        if (day < from || day > to) return false
        if (clinicianId !== 'all' && a.clinicianId !== clinicianId) return false
        if (status !== 'all' && a.status !== status) return false
        return true
      })
      .sort((a, b) => (a.start === b.start ? a.room.localeCompare(b.room) : a.start < b.start ? -1 : 1))
      .map((a) => enrichAppointment(db, ctx, a))
    const days = []
    for (const a of list) {
      let group = days.find((d) => d.date === a.date)
      if (!group) {
        group = { date: a.date, appointments: [] }
        days.push(group)
      }
      group.appointments.push(a)
    }
    return { days, total: list.length }
  })
}

/** GET /api/appointments/options — clinicians and rooms for filters and forms. */
export function getBookingOptions() {
  return request((db) => ({
    clinicians: db.staff.map((s) => staffSummary(db, s.id)),
    rooms: db.rooms,
    times: SLOT_TIMES,
    cancelReasons: CANCEL_REASONS,
  }))
}

/** GET /api/appointments/availability?date=&clinician= — the time grid in the reschedule dialog. */
export function getAvailability({ date, clinicianId, excludeId }) {
  return request(
    (db) => {
      if (!isValidISODate(date)) return { date, slots: [], closed: false }
      const dow = toDate(date).getDay()
      if (dow === 0) return { date, slots: [], closed: true }
      return {
        date,
        closed: false,
        saturday: dow === 6,
        slots: SLOT_TIMES.filter((time) => dow !== 6 || time < '12:30').map((time) => ({
          time,
          taken: slotTaken(db, { date, time, clinicianId, excludeId }),
          past: slotInPast(date, time),
        })),
      }
    },
    { delay: 220 },
  )
}

/** The doses a new booking covers: everything due on or before 2 weeks after the visit, not already booked. */
function dosesForVisit(db, ctx, patientId, date) {
  const p = ctx.patientsById[patientId]
  const booked = new Set(db.appointments.filter((a) => a.patientId === patientId && a.status === 'upcoming').flatMap((a) => a.doseKeys))
  const limit = toISODate(addDays(date, 14))
  return pendingDoses(scheduleFor(ctx, p)).filter((d) => d.dueOn <= limit && !booked.has(d.key))
}

function reasonFor(doses) {
  if (!doses.length) return 'Follow-up visit'
  const visits = [...new Set(doses.map((d) => SCHEDULE_BY_KEY[d.key].visit))]
  const infant = { '6w': '6-week immunizations', '10w': '10-week immunizations', '14w': '14-week immunizations' }
  if (visits.length === 1 && infant[visits[0]]) return infant[visits[0]]
  return doses.map((d) => plannedLabel(d.key).replace(' · ', ' ')).join(' · ')
}

/** Validation shared by the booking form and the API (frame 16). */
export function validateBooking(db, form) {
  const errors = {}
  if (!form.patientId) errors.patientId = 'Choose the patient.'
  if (!form.clinicianId) errors.clinicianId = 'Choose a clinician.'
  if (!form.room) errors.room = 'Choose a room for this visit.'
  if (!form.date) errors.date = 'Choose a date.'
  else if (!isValidISODate(form.date)) errors.date = 'Enter a real date.'
  else if (form.date < TODAY_ISO) errors.date = 'Choose today or a later date.'
  else if (toDate(form.date).getDay() === 0) errors.date = 'The hospital’s clinics are closed on Sundays. Choose another day.'
  if (!form.time) errors.time = 'Choose a time.'
  else if (form.date && !errors.date && slotInPast(form.date, form.time)) errors.time = 'That time has passed. Choose a later time.'
  else if (db && form.clinicianId && form.date && !errors.date && slotTaken(db, form)) {
    errors.time = 'This clinician already has a patient at that time. Choose another time.'
  }
  if ((form.note ?? '').length > 200) errors.note = 'Keep the note to 200 characters.'
  return errors
}

/** POST /api/appointments */
export function createAppointment(form) {
  return request(
    (db) => {
      const errors = validateBooking(db, form)
      if (Object.keys(errors).length) throw invalid(errors)
      const ctx = context(db)
      const mother = ctx.mothersById[form.patientId]
      const p = ctx.patientsById[form.patientId]
      if (!p && !mother) throw invalid({ patientId: 'Choose a patient you are authorised to see.' })
      const doses = p ? dosesForVisit(db, ctx, p.id, form.date) : []
      const maternalReason = mother ? (mother.pregnancy?.status === 'pregnant' ? 'Antenatal visit' : 'Postnatal check') : null
      const id = `a-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      const appointment = {
        id,
        patientId: form.patientId,
        start: `${form.date}T${form.time}`,
        durationMin: 15,
        reason: form.reason?.trim() || maternalReason || reasonFor(doses),
        reasonLong: form.reason?.trim() || maternalReason || reasonFor(doses),
        visitType: mother ? (mother.pregnancy?.status === 'pregnant' ? 'antenatal' : 'postnatal') : undefined,
        clinicianId: form.clinicianId,
        room: form.room,
        status: 'upcoming',
        doseKeys: doses.map((d) => d.key),
        noteForCaregiver: form.note.trim(),
        clinicalNote: '',
        cancelReason: '',
        history: [{ at: nowISO(), action: 'booked' }],
        createdAt: nowISO(),
        ref: newRef('A'),
        location: locationFor(form.room, mother ? (mother.pregnancy?.status === 'pregnant' ? 'antenatal' : 'postnatal') : null, Boolean(mother)),
      }
      db.appointments.push(appointment)
      notifySubject(db, form.patientId, {
        type: 'appointment',
        title: 'New appointment booked',
        body: `${appointment.reasonLong} · ${when(appointment.start)} with ${staffSummary(db, form.clinicianId)?.name ?? 'the hospital'}.`,
        target: { appointmentId: id },
      })
      return enrichAppointment(db, context(db), appointment)
    },
    { mutates: true, delay: 600 },
  )
}

/** PATCH /api/appointments/:id/reschedule */
export function rescheduleAppointment(id, { date, time, clinicianId, notify }) {
  return request(
    (db) => {
      const a = db.appointments.find((x) => x.id === id)
      if (!a) throw notFound('This appointment')
      if (a.status !== 'upcoming') throw new ApiError('Only upcoming appointments can be rescheduled.', { status: 409 })
      const errors = validateBooking(db, { patientId: a.patientId, clinicianId, room: a.room, date, time, excludeId: id, note: '' })
      if (Object.keys(errors).length) throw invalid(errors)
      a.history.push({ at: nowISO(), action: 'rescheduled', from: a.start, fromClinicianId: a.clinicianId, notified: notify })
      a.start = `${date}T${time}`
      a.clinicianId = clinicianId
      if (notify) {
        notifySubject(db, a.patientId, {
          type: 'appointment',
          title: 'Appointment moved',
          body: `${a.reasonLong ?? a.reason} is now ${when(a.start)} with ${staffSummary(db, clinicianId)?.name ?? 'the hospital'}.`,
          target: { appointmentId: a.id },
        })
      }
      const ctx = context(db)
      return { appointment: enrichAppointment(db, ctx, a), notified: notify ? primaryCaregiver(ctx.patientsById[a.patientId])?.name : null }
    },
    { mutates: true, delay: 500 },
  )
}

/** PATCH /api/appointments/:id/cancel */
export function cancelAppointment(id, { reason, notify }) {
  return request(
    (db) => {
      const a = db.appointments.find((x) => x.id === id)
      if (!a) throw notFound('This appointment')
      if (a.status !== 'upcoming') throw new ApiError('This appointment is no longer upcoming.', { status: 409 })
      if (!reason) throw invalid({ reason: 'Choose a reason for cancelling.' })
      a.status = 'cancelled'
      a.cancelReason = reason
      a.summary = `Cancelled by the hospital: ${reason}.`
      a.history.push({ at: nowISO(), action: 'cancelled', reason, notified: notify })
      if (notify) {
        notifySubject(db, a.patientId, {
          type: 'appointment',
          title: 'Appointment cancelled',
          body: `${a.reasonLong ?? a.reason} on ${when(a.start)} was cancelled: ${reason}.`,
          target: { appointmentId: a.id },
        })
      }
      const ctx = context(db)
      return { appointment: enrichAppointment(db, ctx, a), notified: notify ? primaryCaregiver(ctx.patientsById[a.patientId])?.name : null }
    },
    { mutates: true, delay: 500 },
  )
}

/** Words for banners: 'Tue 10 Nov at 11:30'. */
export function slotWords(start) {
  const diff = daysBetween(TODAY, start)
  const otherYear = start.slice(0, 4) !== String(TODAY.getFullYear())
  const day = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : formatDate(start, otherYear ? 'weekdayYear' : 'weekday')
  return `${day} at ${formatTime(start)}`
}
