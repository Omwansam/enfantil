/** The dashboard (frame 11) and the sidebar badges. */
import { get } from './client'

/** Stat cards, today's schedule, requests, pending notes and overdue alerts. */
export function getDashboard() {
  return get('/dashboard')
}

/** The sidebar badges. */
export function getNavCounts() {
  return get('/nav-counts')
}
