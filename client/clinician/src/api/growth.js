/** Infant growth measurements (D6): list, add, edit and delete. */
import { del, get, post, seg } from './client'
import { isValidISODate, TODAY_ISO } from '../utils/dates'

export function validateMeasurement(f, { dob } = {}) {
  const errors = {}
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the date.'
  else if (f.date > TODAY_ISO) errors.date = 'The date can’t be in the future.'
  else if (dob && f.date < dob) errors.date = 'The date is before the date of birth.'
  const w = f.weightKg === '' ? null : Number(f.weightKg)
  const h = f.heightCm === '' ? null : Number(f.heightCm)
  if (w === null && h === null) errors.weightKg = 'Enter a weight, a height or both.'
  if (w !== null && (!Number.isFinite(w) || w < 0.4 || w > 40)) errors.weightKg = 'Weight should be between 0.4 and 40 kg.'
  if (h !== null && (!Number.isFinite(h) || h < 30 || h > 130)) errors.heightCm = 'Height should be between 30 and 130 cm.'
  if (f.muacCm && (Number(f.muacCm) < 6 || Number(f.muacCm) > 25)) errors.muacCm = 'MUAC should be between 6 and 25 cm.'
  return errors
}

/** Oldest first, with age at each. */
export function getMeasurements(patientId) {
  return get(`/patients/${seg(patientId)}/measurements`)
}

/** Adds a measurement, or edits it when `f.id` is set. */
export function saveMeasurement(patientId, f) {
  return post(`/patients/${seg(patientId)}/measurements`, f)
}

export function deleteMeasurement(id) {
  return del(`/measurements/${seg(id)}`)
}
