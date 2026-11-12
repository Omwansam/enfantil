/** Shared lookups and derived fields used by several API modules. */
import { vaccines } from '../data/reference'
import { daysBetween, daysOverdue, formatAge, startOfDay, toDate, TODAY } from '../utils/dates'
import { initials } from '../utils/format'
import { gestationalAge, postnatalLabel } from '../utils/pregnancy'

export const VISIT_TYPES = {
  antenatal: { label: 'Antenatal', description: 'Pregnancy check-up', for: 'me' },
  postnatal: { label: 'Postnatal', description: 'Your check after birth, family planning', for: 'me' },
  vaccination: { label: 'Baby vaccination', description: 'KEPI or optional vaccines', for: 'child' },
  growth: { label: 'Growth check', description: 'Weight, height and development', for: 'child' },
  sick: { label: 'Sick visit', description: 'Fever, cough, diarrhoea or other illness', for: 'any' },
  general: { label: 'General consultation', description: 'Anything else', for: 'any' },
}

export function findFacility(db, id) {
  return db.facilities.find((f) => f.id === id) ?? db.facilities[0] ?? null
}

export function findClinician(db, id) {
  const c = db.clinicians.find((x) => x.id === id)
  return c ? { ...c, initials: c.initials ?? initials(c.name), facility: findFacility(db, c.facilityId) } : null
}

export function enrichChild(db, child) {
  const facility = child.facilityId ? findFacility(db, child.facilityId) : null
  return {
    ...child,
    fullName: `${child.firstName} ${child.lastName}`,
    initials: initials(`${child.firstName} ${child.lastName}`),
    sexLabel: child.sex === 'female' ? 'Girl' : 'Boy',
    sexFormal: child.sex === 'female' ? 'Female' : 'Male',
    pronoun: child.sex === 'female' ? 'her' : 'his',
    age: formatAge(child.dob),
    ageShort: formatAge(child.dob, TODAY, { short: true }),
    facility,
    isMe: false,
  }
}

export function childSummary(db, childId) {
  const child = db.children.find((c) => c.id === childId)
  return child ? enrichChild(db, child) : null
}

/** Where the mother is: '26 weeks pregnant', 'Postnatal · day 5', or just her name. */
export function motherStatus(db) {
  if (db.pregnancy?.status === 'pregnant') {
    const ga = gestationalAge(db.pregnancy.lmp)
    return { kind: 'pregnant', label: `${ga.weeks} weeks pregnant`, ga }
  }
  if (db.delivery) return { kind: 'postnatal', label: postnatalLabel(db.delivery.date) }
  return { kind: 'none', label: 'My health' }
}

/** The mother as a profile, so 'Me' works anywhere a child summary does. */
export function meSummary(db) {
  const c = db.caregiver
  const status = motherStatus(db)
  const years = db.mother?.dob ? Math.floor(daysBetween(db.mother.dob, TODAY) / 365.25) : null
  return {
    id: 'me',
    isMe: true,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName: c.fullName,
    initials: initials(c.fullName),
    tone: c.avatarTone ?? 'pink',
    age: years ? `${years} years` : '',
    ageShort: 'Me',
    statusKind: status.kind,
    statusLabel: status.label,
    pronoun: 'your',
    facility: findFacility(db, 'tfh'),
  }
}

export function profileSummary(db, id) {
  if (id === 'me') return meSummary(db)
  return childSummary(db, id)
}

/** Adds status ('Given' | 'Planned' | 'Overdue') and days late, calculated against today. */
export function enrichDose(db, dose) {
  const status = dose.givenOn ? 'Given' : daysBetween(dose.dueOn, TODAY) > 0 ? 'Overdue' : 'Planned'
  const appointment = dose.appointmentId ? db.appointments.find((a) => a.id === dose.appointmentId) : null
  return {
    ...dose,
    seq: db.doses.findIndex((d) => d.id === dose.id),
    status,
    daysLate: status === 'Overdue' ? daysOverdue(dose.dueOn) : 0,
    vaccine: vaccines[dose.vaccineId],
    appointment: appointment ? enrichAppointment(db, appointment, { withDoses: false }) : null,
  }
}

export function appointmentStatus(appointment) {
  if (appointment.status === 'requested') return 'Pending'
  if (appointment.status === 'declined') return 'Declined'
  if (appointment.status === 'cancelled') return 'Cancelled'
  if (appointment.status === 'completed') return 'Completed'
  return toDate(appointment.start) >= startOfDay(TODAY) ? 'Upcoming' : 'Completed'
}

export function isUpcoming(appointment) {
  const status = appointmentStatus(appointment)
  return status === 'Upcoming' || status === 'Pending'
}

export function enrichAppointment(db, appointment, { withDoses = true } = {}) {
  const enriched = {
    ...appointment,
    displayStatus: appointmentStatus(appointment),
    upcoming: isUpcoming(appointment),
    child: profileSummary(db, appointment.childId),
    clinician: appointment.clinicianId ? findClinician(db, appointment.clinicianId) : null,
    facility: findFacility(db, appointment.facilityId),
    visitTypeLabel: VISIT_TYPES[appointment.visitType]?.label ?? null,
    proposal: appointment.proposal ? { ...appointment.proposal, clinician: findClinician(db, appointment.proposal.clinicianId) } : null,
  }
  if (withDoses) {
    enriched.doses = (appointment.doseIds ?? [])
      .map((id) => db.doses.find((d) => d.id === id))
      .filter(Boolean)
      .map((d) => enrichDose(db, { ...d, appointmentId: null }))
  }
  return enriched
}

export const byDateAsc = (key) => (a, b) => toDate(a[key]) - toDate(b[key])
export const byDateDesc = (key) => (a, b) => toDate(b[key]) - toDate(a[key])
