/** A patient's caregivers and family app invites. */
import { get, post, seg } from './client'

export function getCaregivers(patientId) {
  return get(`/patients/${seg(patientId)}/caregivers`)
}

/** SMS invite to the family app. */
export function sendFamilyInvite(patientId, caregiverId) {
  return post(`/patients/${seg(patientId)}/caregivers/${seg(caregiverId)}/invite`)
}
