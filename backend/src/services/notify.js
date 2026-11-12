/**
 * Notifications that cross between the two apps: what a clinician does shows
 * up in the family's app, and what a family sends shows up in the portal.
 * All helpers work on the draft state inside a write.
 */
import { formatDate, formatTime, now, toISODateTime } from './clinic/utils/dates.js'

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const stamp = () => toISODateTime(now())

/** Family accounts that follow a child (their caregiver id is the account id). */
export function accountsForPatient(state, patientId) {
  const p = state.patients.find((x) => x.id === patientId)
  if (!p) return []
  const ids = new Set(p.caregivers.map((c) => c.id))
  return state.accounts.filter((a) => ids.has(a.id))
}

/** The family account of a mother, if she uses the app. */
export function accountForMother(state, motherId) {
  return state.accounts.find((a) => a.motherId === motherId) ?? null
}

/** Accounts to tell about a patient or a mother, with the profile id the app uses ('me' or the child). */
export function audienceFor(state, subjectId) {
  const mother = accountForMother(state, subjectId)
  if (mother) return [{ account: mother, childId: 'me' }]
  return accountsForPatient(state, subjectId).map((account) => ({ account, childId: subjectId }))
}

export function notifyFamily(state, { accountId, type, childId = 'me', title, body, target = null, read = false }) {
  const n = { id: uid('n'), accountId, type, childId, title, body, createdAt: stamp(), read, target }
  state.familyNotifications.push(n)
  return n
}

/** Notifies every app account following this patient or mother. */
export function notifySubject(state, subjectId, fields) {
  for (const { account, childId } of audienceFor(state, subjectId)) {
    notifyFamily(state, { ...fields, accountId: account.id, childId })
  }
}

export function notifyStaff(state, { to, type, title, body, link = null }) {
  const recipients = [...new Set((to ?? state.staff.map((s) => s.id)).filter((id) => state.staff.some((s) => s.id === id)))]
  if (!recipients.length) return null
  const n = { id: uid('sn'), type, to: recipients, readBy: [], title, body, at: stamp(), link }
  state.staffNotifications.unshift(n)
  return n
}

/** 'Tue 10 Nov at 10:30' */
export function when(start) {
  return `${formatDate(start, 'weekday')} at ${formatTime(start)}`
}

export function staffName(state, id) {
  return state.staff.find((s) => s.id === id)?.name ?? state.deskStaff.find((s) => s.id === id)?.name ?? null
}

/** Where a visit happens, in the words the family app uses. */
export function locationFor(room, visitType, maternal) {
  if (!room) return null
  if (maternal || room === 'Room 4') return visitType === 'antenatal' ? `Antenatal clinic, ${room}` : `Maternity clinic, ${room}`
  return `Child Health Clinic, ${room}`
}

let refSeq = 0
export function newRef(kind = 'A') {
  refSeq = (refSeq + 1) % 1000
  return `TFH-${kind}-${String(Date.now()).slice(-5)}${String(refSeq).padStart(3, '0')}`.slice(0, 15)
}
