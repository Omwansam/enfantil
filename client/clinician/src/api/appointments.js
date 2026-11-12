/** The clinic schedule, booking, rescheduling and cancelling (frames 13 and 16). */
import { get, patch, post, seg } from './client'
import { nowISO } from './helpers'
import { daysBetween, formatDate, formatTime, isValidISODate, TODAY, TODAY_ISO, toDate } from '../utils/dates'

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

/** Words for banners: 'Tue 10 Nov at 11:30'. */
export function slotWords(start) {
  const diff = daysBetween(TODAY, start)
  const otherYear = start.slice(0, 4) !== String(TODAY.getFullYear())
  const day = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : formatDate(start, otherYear ? 'weekdayYear' : 'weekday')
  return `${day} at ${formatTime(start)}`
}

/** The clinic schedule grouped by day (frame 13). */
export function getSchedule({ from, to, clinicianId = 'all', status = 'all' }) {
  return get('/appointments', { from, to, clinician: clinicianId, status })
}

/** Clinicians and rooms for filters and forms. */
export function getBookingOptions() {
  return get('/appointments/options')
}

/** The time grid in the booking form and the reschedule dialog. */
export function getAvailability({ date, clinicianId, excludeId }) {
  return get('/appointments/availability', { date, clinician: clinicianId, excludeId })
}

export function createAppointment(form) {
  return post('/appointments', form)
}

export function rescheduleAppointment(id, { date, time, clinicianId, notify }) {
  return patch(`/appointments/${seg(id)}/reschedule`, { date, time, clinicianId, notify })
}

export function cancelAppointment(id, { reason, notify }) {
  return patch(`/appointments/${seg(id)}/cancel`, { reason, notify })
}
