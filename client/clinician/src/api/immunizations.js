/** Recording an immunization (frame 15). */
import { get, post, seg } from './client'
import { daysBetween, isValidISODate, TODAY, TODAY_ISO } from '../utils/dates'

export function validateRecord(form, { dob } = {}) {
  const errors = {}
  if (!form.doseKey) errors.doseKey = 'Choose the vaccine you gave.'
  if (!String(form.doseNumber).trim()) errors.doseNumber = 'Enter the dose number.'
  if (!form.givenOn) errors.givenOn = 'Enter the date the dose was given.'
  else if (!isValidISODate(form.givenOn)) errors.givenOn = 'Enter a real date.'
  else if (form.givenOn > TODAY_ISO) errors.givenOn = 'The date can’t be in the future.'
  else if (dob && form.givenOn < dob) errors.givenOn = 'The date can’t be before the date of birth.'
  else if (daysBetween(form.givenOn, TODAY) > 365 * 5) errors.givenOn = 'Check the year.'
  if (!form.batch.trim()) errors.batch = 'Enter the batch number printed on the vial.'
  else if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,}$/.test(form.batch.trim()))
    errors.batch = 'Use the letters, numbers and dashes printed on the vial, for example MR-26A0457.'
  if (!form.givenById) errors.givenById = 'Choose who gave the dose.'
  if ((form.notes ?? '').length > 500) errors.notes = 'Keep notes to 500 characters.'
  return errors
}

/** Everything the record form needs (frame 15). */
export function getRecordForm(patientId) {
  return get(`/patients/${seg(patientId)}/immunizations/form`)
}

/** Moves a dose from Planned to Administered. */
export function recordImmunization(patientId, form) {
  return post(`/patients/${seg(patientId)}/immunizations`, form)
}
