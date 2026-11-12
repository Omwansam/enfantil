/** Visit notes (frame 25): the queue of unfinished notes, drafts and signing. */
import { get, patch, post, seg } from './client'
import { isValidISODate, TODAY_ISO } from '../utils/dates'

export const NUTRITION_STATUSES = [
  { value: 'normal', label: 'Normal' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'moderate', label: 'Moderate malnutrition' },
  { value: 'severe', label: 'Severe malnutrition' },
]

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

/** Unfinished notes for the signed-in clinician. */
export function getNotesQueue() {
  return get('/visit-notes/queue')
}

/** The note, the visit, the patient and their previous visit (frame 25). */
export function getVisitNote(id) {
  return get(`/visit-notes/${seg(id)}`)
}

/** Autosave a draft. */
export function saveDraft(id, fields) {
  return patch(`/visit-notes/${seg(id)}`, fields)
}

/** Sign, add the measurements to the record, share the summary with the family. */
export function signNote(id, fields) {
  return post(`/visit-notes/${seg(id)}/sign`, fields)
}
