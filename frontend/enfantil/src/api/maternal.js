/** The mother's own records (M2–M9): overview, health record, pregnancy, antenatal care, progress, Td doses and postnatal care. */
import { del, get, patch, post, seg } from './client'

export function validateHealthItem(kind, fields) {
  const errors = {}
  if (kind === 'allergies' && !fields.substance?.trim()) errors.substance = 'What are you allergic to?'
  if (kind === 'conditions' && !fields.name?.trim()) errors.name = 'Name the condition'
  if (kind === 'medicines' && !fields.name?.trim()) errors.name = 'Name the medicine'
  return errors
}

/** M2 — the "Me" overview. */
export function getMeOverview() {
  return get('/me/overview')
}

/** M3 — my health record. Items the doctor added are read-only for the mother. */
export function getMyHealthRecord() {
  return get('/me/health-record')
}

/** Adds something the mother reports herself. The care team checks it at the next visit. */
export function addHealthItem(kind, fields) {
  return post(`/me/health-record/${seg(kind)}`, fields)
}

export function removeHealthItem(kind, id) {
  return del(`/me/health-record/${seg(kind)}/${seg(id)}`)
}

export function updatePersonalDetails({ dob, bloodGroup }) {
  return patch('/me/health-record', { dob, bloodGroup })
}

/** M4 — the pregnancy tracker (null when there is no ongoing pregnancy). */
export function getPregnancy() {
  return get('/me/pregnancy')
}

/** M5 — the 8-contact antenatal schedule for the current (or most recent) pregnancy. */
export function getAncSchedule() {
  return get('/me/antenatal')
}

/** M6 — one antenatal visit. */
export function getAncVisit(id) {
  return get(`/me/antenatal/${seg(id)}`)
}

/** M7 — weight and blood pressure across antenatal visits. */
export function getMaternalProgress() {
  return get('/me/progress')
}

/** M8 — Td doses, planned vs given. */
export function getMaternalVaccines() {
  return get('/me/vaccines')
}

/** M9 — delivery summary and postnatal visits (null before the birth). */
export function getPostnatalCare() {
  return get('/me/postnatal')
}
