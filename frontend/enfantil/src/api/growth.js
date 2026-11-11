import { request } from './client'
import { byDateDesc, findFacility } from './helpers'
import { ageInMonths, formatAgeAt } from '../utils/dates'

/** Growth measurements for a child, newest first, with age at each measurement. */
export function getMeasurements(childId) {
  return request((db) => {
    const child = db.children.find((c) => c.id === childId)
    return db.measurements
      .filter((m) => m.childId === childId)
      .sort(byDateDesc('date'))
      .map((m) => ({
        ...m,
        ageLabel: child ? formatAgeAt(child.dob, m.date) : '',
        ageMonths: child ? Math.max(0, ageInMonths(child.dob, m.date)) : 0,
        facility: findFacility(db, m.facilityId),
      }))
  })
}
