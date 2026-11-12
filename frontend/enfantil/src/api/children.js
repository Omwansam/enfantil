/** The mother's profiles and children, and adding or linking a child. */
import { get, post, seg } from './client'

export function getChildren() {
  return get('/children')
}

/** The profiles a mother can switch between: herself ("Me") and each child. */
export function getProfiles() {
  return get('/me/profiles')
}

export function getChild(childId) {
  return get(`/children/${seg(childId)}`)
}

/** Everything the Health profile side cards need. */
export function getHealthProfile(childId) {
  return get(`/children/${seg(childId)}/health`)
}

/** Dashboard summary for one child: latest growth, overdue doses, next vaccine and next visit. */
export function getChildOverview(childId) {
  return get(`/children/${seg(childId)}/overview`)
}

/** Finds a hospital record by patient ID and date of birth; the hospital texts a code to your phone. */
export function findChildRecord({ patientId, dob }) {
  return post('/children/lookup', { patientId, dob })
}

/** Links a hospital record after the caregiver enters the SMS code. */
export function linkChildRecord({ patientId, dob, code }) {
  return post('/children/link', { patientId, dob, code })
}

/** Adds a child from details the caregiver typed. The hospital confirms them at the next visit. */
export function addChildManually(form) {
  return post('/children', form)
}
