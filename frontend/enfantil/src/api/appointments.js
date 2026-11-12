/** Visits, booking options, free times and appointment requests (M10). */
import { del, get, post, seg } from './client'

/** Validation shared by the booking form and the API. */
export function validateBooking(form) {
  const errors = {}
  if (!form.forId) errors.forId = 'Choose who the visit is for'
  if (!form.visitType) errors.visitType = 'Choose the type of visit'
  if (!form.date || !form.time) errors.slot = 'Choose a day and a free time'
  if (form.visitType === 'sick' && !form.note?.trim()) errors.note = 'Tell the doctor what is wrong, so they can prepare'
  if ((form.note ?? '').length > 300) errors.note = 'Keep the note to 300 characters'
  return errors
}

/** when: 'upcoming' | 'past' | 'all'. Optional childId ('me' or a child) narrows to one profile. */
export function getAppointments({ when = 'all', childId } = {}) {
  return get('/appointments', { when, childId })
}

export function getAppointment(id) {
  return get(`/appointments/${seg(id)}`)
}

/** Everything the booking flow needs: who, which visit types, which doctors. */
export function getBookingOptions() {
  return get('/booking/options')
}

/** Free times for the next 12 clinic days. `forId` ('me' or a child) narrows to the doctors who see them. */
export function getAvailability({ clinicianId, forId } = {}) {
  return get('/booking/slots', { clinicianId, forId })
}

/** Sends a booking request. It shows as "Pending" until a doctor confirms it or proposes another time. */
export function requestAppointment({ forId, visitType, clinicianId, date, time, note, rescheduleOf }) {
  return post('/appointments/requests', { forId, visitType, clinicianId, date, time, note, rescheduleOf })
}

/** Withdraws a request the hospital has not confirmed yet. */
export function cancelAppointmentRequest(id) {
  return del(`/appointments/requests/${seg(id)}`)
}

/** Accept or decline a new time the doctor proposed. */
export function respondToProposal(id, accept) {
  return post(`/appointments/requests/${seg(id)}/proposal`, { accept })
}
