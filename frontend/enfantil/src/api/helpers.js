/** Shared lookups and derived fields used by several API modules. */
import { vaccines } from '../data/mockData'
import { daysBetween, daysOverdue, formatAge, startOfDay, toDate, TODAY } from '../utils/dates'
import { initials } from '../utils/format'

export function findFacility(db, id) {
  return db.facilities.find((f) => f.id === id) ?? null
}

export function findClinician(db, id) {
  const c = db.clinicians.find((x) => x.id === id)
  return c ? { ...c, initials: c.initials ?? initials(c.name), facility: findFacility(db, c.facilityId) } : null
}

export function enrichChild(db, child) {
  const facility = findFacility(db, child.facilityId)
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
  }
}

export function childSummary(db, childId) {
  const child = db.children.find((c) => c.id === childId)
  return child ? enrichChild(db, child) : null
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
  if (appointment.status === 'requested') return 'Requested'
  if (appointment.status === 'cancelled') return 'Cancelled'
  if (appointment.status === 'completed') return 'Completed'
  return toDate(appointment.start) >= startOfDay(TODAY) ? 'Upcoming' : 'Completed'
}

export function isUpcoming(appointment) {
  const status = appointmentStatus(appointment)
  return status === 'Upcoming' || status === 'Requested'
}

export function enrichAppointment(db, appointment, { withDoses = true } = {}) {
  const enriched = {
    ...appointment,
    displayStatus: appointmentStatus(appointment),
    upcoming: isUpcoming(appointment),
    child: childSummary(db, appointment.childId),
    clinician: appointment.clinicianId ? findClinician(db, appointment.clinicianId) : null,
    facility: findFacility(db, appointment.facilityId),
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
