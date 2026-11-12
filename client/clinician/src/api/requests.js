/** Appointment requests from the family app (D7). Each action notifies the person who asked. */
import { get, post, seg } from './client'
import { formatDate, formatTime, isValidISODate, isWeekend, TODAY_ISO } from '../utils/dates'

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

export function requestWhen(start) {
  return `${formatDate(start, 'weekday')} at ${formatTime(start)}`
}

export function getRequests() {
  return get('/requests')
}

/** Books the visit. */
export function confirmRequest(id, { date, time, clinicianId, room }) {
  return post(`/requests/${seg(id)}/confirm`, { date, time, clinicianId, room })
}

/** Offers another time; the parent accepts or declines in the app. */
export function proposeTime(id, { date, time, clinicianId, note }) {
  return post(`/requests/${seg(id)}/propose`, { date, time, clinicianId, note })
}

export function declineRequest(id, { reason, note }) {
  return post(`/requests/${seg(id)}/decline`, { reason, note })
}
