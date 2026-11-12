/** Vaccines: KEPI doses with status, dose detail, optional (paid) vaccines and school share links. */
import { del, get, post, put, seg } from './client'

/** All doses for a child with derived status, plus the counts shown on the progress card. */
export function getImmunizations(childId) {
  return get(`/children/${seg(childId)}/immunizations`)
}

/** One dose with its vaccine information, the child's other doses of that vaccine and the linked visit. */
export function getDose(doseId) {
  return get(`/doses/${seg(doseId)}`)
}

export function getShareLink(childId) {
  return get(`/children/${seg(childId)}/share-link`)
}

export function createShareLink(childId) {
  return post(`/children/${seg(childId)}/share-link`)
}

export function revokeShareLink(childId) {
  return del(`/children/${seg(childId)}/share-link`)
}

/** The optional (paid) vaccines Tumaini Family Hospital offers, and whether each is in the child's plan. */
export function getOptionalVaccines(childId) {
  return get(`/children/${seg(childId)}/optional-vaccines`)
}

/** Adds an optional vaccine to the child's plan (planned doses appear), or takes it out. */
export function setOptionalVaccine(childId, vaccineId, inPlan) {
  return put(`/children/${seg(childId)}/optional-vaccines/${seg(vaccineId)}`, { inPlan })
}
