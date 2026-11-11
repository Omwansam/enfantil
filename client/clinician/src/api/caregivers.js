import { TODAY_ISO } from '../utils/dates'
import { notFound, request } from './client'
import { caregiverView } from './helpers'

/** GET /api/patients/:id/caregivers */
export function getCaregivers(patientId) {
  return request((db) => {
    const p = db.patients.find((x) => x.id === patientId)
    if (!p) throw notFound('This patient')
    return p.caregivers.map(caregiverView)
  })
}

/** POST /api/patients/:id/caregivers/:caregiverId/invite — SMS invite to the family app. */
export function sendFamilyInvite(patientId, caregiverId) {
  return request(
    (db) => {
      const p = db.patients.find((x) => x.id === patientId)
      const c = p?.caregivers.find((x) => x.id === caregiverId)
      if (!c) throw notFound('This caregiver')
      c.invitedAt = TODAY_ISO
      return caregiverView(c)
    },
    { mutates: true },
  )
}
