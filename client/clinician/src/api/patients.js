/** Patients: the list (mothers and infants), search, profile and registration (frame 27). */
import { get, http, post, seg } from './client'
import { daysBetween, isValidISODate, TODAY, TODAY_ISO } from '../utils/dates'
import { isValidEmail, isValidKenyanMobile } from '../utils/format'

/** Validation shared by the form and the API. */
export function validateRegistration(form) {
  const errors = {}
  const name = form.fullName.trim()
  if (!name) errors.fullName = 'Enter the child’s full name.'
  else if (name.split(/\s+/).length < 2) errors.fullName = 'Enter the child’s first name and surname.'
  if (!form.dob) errors.dob = 'Enter the date of birth.'
  else if (!isValidISODate(form.dob)) errors.dob = 'Enter a real date.'
  else if (form.dob > TODAY_ISO) errors.dob = 'Date of birth can’t be in the future.'
  else if (daysBetween(form.dob, TODAY) > 5 * 366) errors.dob = 'Enfantil follows children under 5. Check the year.'
  if (!form.sex) errors.sex = 'Choose girl or boy.'
  if (form.birthWeight) {
    const w = Number(String(form.birthWeight).replace(/kg/i, '').trim())
    if (!Number.isFinite(w) || w < 0.4 || w > 6.5) errors.birthWeight = 'Enter a birth weight in kg, for example 3.1.'
  }
  const carers = [form.caregiver, ...(form.secondCaregiver ? [form.secondCaregiver] : [])]
  carers.forEach((c, i) => {
    const prefix = i === 0 ? 'caregiver' : 'secondCaregiver'
    if (!c.fullName.trim()) errors[`${prefix}.fullName`] = 'Enter the caregiver’s full name.'
    if (!c.relationship) errors[`${prefix}.relationship`] = 'Choose the relationship to the child.'
    if (!c.phone.trim()) errors[`${prefix}.phone`] = 'Enter a phone number for SMS reminders.'
    else if (!isValidKenyanMobile(c.phone)) errors[`${prefix}.phone`] = 'Enter a Kenyan mobile number, for example 0712 345 678.'
    if (c.email.trim() && !isValidEmail(c.email)) errors[`${prefix}.email`] = 'Enter an email address like name@example.com, or leave it empty.'
  })
  if (!form.consent) errors.consent = 'Confirm the caregiver gave consent before registering the child.'
  return errors
}

/** Mothers and infants registered at the facility, with tab counts. */
export function listPatients({ q = '', tab = 'all', group = 'all', page = 1, pageSize = 10 } = {}) {
  return get('/patients', { q, tab, group, page, pageSize })
}

export function exportPatients({ q = '', tab = 'all', group = 'all' } = {}) {
  return get('/patients/export', { q, tab, group })
}

/** The dashboard search box. */
export function searchPatients(q, limit = 6) {
  return get('/patients/search', { q, limit })
}

/** Patient picker on the booking form (mothers first, then infants). */
export function getPatientOptions() {
  return get('/patients/options')
}

/** The patient profile (frame 12). */
export function getPatient(id) {
  return get(`/patients/${seg(id)}`)
}

/** Same date of birth and a matching name. */
export function checkDuplicate({ fullName, dob }) {
  return http('POST', '/patients/duplicate-check', { body: { fullName, dob }, mutates: false })
}

/** Register a child and link the caregiver (frame 27). */
export function registerPatient(form) {
  return post('/patients', form)
}

/** First free 09:00 slot with the immunization nurse. */
export function suggestFirstVisit(dob) {
  return get('/patients/first-visit-suggestion', { dob })
}
