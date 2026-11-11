import { VACCINE_STOCK } from '../data/mockData'
import { daysBetween, isValidISODate, TODAY, TODAY_ISO } from '../utils/dates'
import { administeredName, doseNumber, plannedDoses, plannedLabel, ROUTES, SCHEDULE_BY_KEY, SITES, VACCINES } from '../utils/kepi'
import { invalid, notFound, request } from './client'
import { administeredFor, context, nowISO, patientBasics, plannedFor, scheduleFor, staffSummary } from './helpers'

/** GET /api/patients/:id/immunizations/form — everything the record form needs (frame 15). */
export function getRecordForm(patientId) {
  return request((db) => {
    const ctx = context(db)
    const p = ctx.patientsById[patientId]
    if (!p) throw notFound('This patient')
    // The planned doses: overdue or due today first, then the next dose of each vaccine.
    const options = plannedDoses(scheduleFor(ctx, p)).map((d) => {
      const v = VACCINES[d.vaccineId]
      return {
        key: d.key,
        label: plannedLabel(d.key),
        doseNumber: doseNumber(d.key),
        dueOn: d.dueOn,
        status: d.status,
        dueNow: d.dueOn <= TODAY_ISO,
        site: v.site,
        route: v.route,
        stock: VACCINE_STOCK[d.vaccineId] ?? [],
      }
    })
    return {
      patient: { ...patientBasics(p), patientId: p.patientId },
      options,
      planned: plannedFor(ctx, p),
      administered: administeredFor(ctx, p),
      staff: db.staff.map((s) => staffSummary(db, s.id)),
      sites: SITES,
      routes: Object.entries(ROUTES).map(([value, label]) => ({ value, label })),
    }
  })
}

export function validateRecord(form, { dob } = {}) {
  const errors = {}
  if (!form.doseKey) errors.doseKey = 'Choose the vaccine you gave.'
  if (!String(form.doseNumber).trim()) errors.doseNumber = 'Enter the dose number.'
  if (!form.givenOn) errors.givenOn = 'Enter the date the dose was given.'
  else if (!isValidISODate(form.givenOn)) errors.givenOn = 'Enter a real date.'
  else if (form.givenOn > TODAY_ISO) errors.givenOn = 'The date can’t be in the future.'
  else if (dob && form.givenOn < dob) errors.givenOn = 'The date can’t be before the date of birth.'
  else if (daysBetween(form.givenOn, TODAY) > 365 * 5) errors.givenOn = 'Check the year.'
  if (!form.batch.trim()) errors.batch = 'Enter the batch number printed on the vial.'
  else if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,}$/.test(form.batch.trim()))
    errors.batch = 'Use the letters, numbers and dashes printed on the vial, for example MR-26A0457.'
  if (!form.givenById) errors.givenById = 'Choose who gave the dose.'
  if ((form.notes ?? '').length > 500) errors.notes = 'Keep notes to 500 characters.'
  return errors
}

/** POST /api/patients/:id/immunizations — move a dose from Planned to Administered. */
export function recordImmunization(patientId, form) {
  return request(
    (db) => {
      const p = db.patients.find((x) => x.id === patientId)
      if (!p) throw notFound('This patient')
      const errors = validateRecord(form, { dob: p.dob })
      if (Object.keys(errors).length) throw invalid(errors)
      if (db.doses.some((d) => d.patientId === patientId && d.key === form.doseKey)) {
        throw invalid({ doseKey: 'This dose is already recorded. Choose another vaccine.' })
      }
      const giver = db.staff.find((s) => s.id === form.givenById)
      const sameDay = db.doses.filter((d) => d.patientId === patientId && d.givenOn === form.givenOn)
      const dose = {
        id: `dose-${patientId}-${form.doseKey}`,
        patientId,
        key: form.doseKey,
        givenOn: form.givenOn,
        batch: form.batch.trim().toUpperCase().replace(/^BOPV/, 'bOPV'),
        site: form.site,
        route: form.route,
        givenBy: giver?.name ?? 'Unknown',
        givenById: form.givenById,
        doseNumber: String(form.doseNumber).trim(),
        facility: db.facility.name,
        notes: form.notes.trim(),
        seq: sameDay.length + 1,
        recordedAt: nowISO(),
      }
      db.doses.push(dose)
      if (form.givenOn !== p.dob && !p.pastVisits.includes(form.givenOn)) p.pastVisits.push(form.givenOn)

      // Today's visit is complete once every dose it was booked for is recorded.
      const visit = db.appointments.find(
        (a) => a.patientId === patientId && a.status === 'upcoming' && a.start.slice(0, 10) === form.givenOn && a.doseKeys.includes(form.doseKey),
      )
      let visitCompleted = false
      if (visit) {
        const given = new Set(db.doses.filter((d) => d.patientId === patientId).map((d) => d.key))
        if (visit.doseKeys.every((k) => given.has(k))) {
          visit.status = 'completed'
          visitCompleted = true
        }
      }
      return {
        id: dose.id,
        key: dose.key,
        name: administeredName(dose.key),
        label: plannedLabel(dose.key),
        vaccineName: VACCINES[SCHEDULE_BY_KEY[dose.key].vaccine].name,
        visitCompleted,
      }
    },
    { mutates: true, delay: 650 },
  )
}
