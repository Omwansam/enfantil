/** Growth measurements. */
import { get, seg } from './client'

/** Growth measurements for a child, newest first, with age at each measurement. */
export function getMeasurements(childId) {
  return get(`/children/${seg(childId)}/measurements`)
}
