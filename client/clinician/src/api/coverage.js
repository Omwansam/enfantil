/** Coverage and defaulter tracing (frame 26). */
import { get } from './client'

export const COVERAGE_TARGET = 90

/** Facility report for the month, compared with the month before. */
export function getCoverage(periodId) {
  return get('/coverage', { period: periodId })
}

/** Authorised children with overdue doses, worked out from their records. */
export function getDefaulters() {
  return get('/coverage/defaulters')
}
