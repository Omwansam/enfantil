/**
 * The mother's own records (M2–M9): overview, health record, pregnancy,
 * antenatal care, progress, maternal vaccines and postnatal care.
 * Statuses are worked out from dates against TODAY.
 */
import { ApiError, nextId, notFound, request, write } from './client'
import { notifyStaff } from '../../notify.js'
import { byDateAsc, enrichAppointment, findClinician, isUpcoming, meSummary, motherStatus, profileSummary } from './helpers'
import { maternalVaccineInfo } from '../data/reference'
import { daysBetween, isValidISODate, now, TODAY, toISODate, toISODateTime } from '../utils/dates'
import {
  ancContactStatus,
  ANC_CONTACTS,
  babySize,
  dateAtWeek,
  DANGER_SIGNS,
  gestationalAge,
  POSTNATAL_DANGER_SIGNS,
  postnatalStatus,
  POSTNATAL_VISITS,
  trimester,
  weeklyGuidance,
} from '../utils/pregnancy'

function clinicianByName(db, name) {
  const c = db.clinicians.find((x) => x.name === name)
  return c ? findClinician(db, c.id) : { name, initials: name.replace(/^(Dr|Nurse)\.?\s+/, '').split(' ').map((p) => p[0]).join('').slice(0, 2), tone: 'slate', role: '' }
}

function pregnancySummary(db) {
  const p = db.pregnancy
  if (!p) return null
  const delivered = p.status !== 'pregnant'
  const ga = gestationalAge(p.lmp, delivered && db.delivery ? db.delivery.date : TODAY)
  return {
    ...p,
    delivered,
    ga,
    trimester: trimester(ga.weeks),
    progress: Math.min(100, Math.round((ga.total / 280) * 100)),
    daysToGo: delivered ? 0 : Math.max(0, daysBetween(TODAY, p.edd)),
  }
}

function ancContacts(db) {
  const p = db.pregnancy
  if (!p) return []
  return ANC_CONTACTS.map((contact) => {
    const visit = p.ancVisits.find((v) => v.contact === contact.n) ?? null
    const { status, dueOn } = ancContactStatus(contact, { lmp: p.lmp, visit, deliveredOn: db.delivery?.date })
    const booked = !visit
      ? db.appointments.find((a) => a.childId === 'me' && a.visitType === 'antenatal' && isUpcoming(a) && Math.abs(daysBetween(dueOn, a.start)) <= 14)
      : null
    return {
      ...contact,
      dueOn,
      status,
      visit: visit ? { ...visit, clinician: clinicianByName(db, visit.clinician) } : null,
      appointment: booked ? enrichAppointment(db, booked, { withDoses: false }) : null,
    }
  })
}

function tdStatus(dose, db) {
  if (dose.givenOn) return 'Given'
  const pregnant = db.pregnancy?.status === 'pregnant'
  if (pregnant && dose.latestOn && daysBetween(dose.latestOn, TODAY) > 0) return 'Overdue'
  return 'Planned'
}

function maternalVaccines(db) {
  return db.maternalVaccines.map((d) => ({
    ...d,
    name: `${maternalVaccineInfo[d.vaccine].short} ${d.dose}`,
    title: `${maternalVaccineInfo[d.vaccine].name} · Dose ${d.dose}`,
    status: tdStatus(d, db),
    canGiveNow: !d.givenOn && d.earliestOn ? d.earliestOn <= toISODate(TODAY) : false,
  }))
}

function latestVitals(db) {
  const readings = [
    ...(db.pregnancy?.ancVisits ?? []).map((v) => ({ date: v.date, bp: `${v.bpSystolic}/${v.bpDiastolic}`, systolic: v.bpSystolic, diastolic: v.bpDiastolic, weightKg: v.weightKg, where: `Antenatal visit ${v.contact}` })),
    ...db.postnatalVisits.map((v) => {
      const [systolic, diastolic] = v.mother.bp.split('/').map(Number)
      return { date: v.date.slice(0, 10), bp: v.mother.bp, systolic, diastolic, weightKg: v.mother.weightKg, where: 'Postnatal check' }
    }),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))
  return readings[0] ?? null
}

/** M2 — the "Me" overview. */
export function getMeOverview() {
  return request((db) => {
    const me = meSummary(db)
    const status = motherStatus(db)
    const pregnancy = pregnancySummary(db)
    const contacts = ancContacts(db)
    const nextAppointment =
      db.appointments
        .filter((a) => a.childId === 'me' && isUpcoming(a))
        .sort(byDateAsc('start'))
        .map((a) => enrichAppointment(db, a))[0] ?? null
    const nextContact = status.kind === 'pregnant' ? contacts.find((c) => c.status === 'Upcoming' || c.status === 'Overdue') ?? null : null
    const vaccines = maternalVaccines(db)
    const vaccineDue = vaccines.find((v) => v.status !== 'Given') ?? null
    let postnatal = null
    if (db.delivery) {
      const visits = POSTNATAL_VISITS.map((def) => {
        const visit = db.postnatalVisits.find((v) => v.key === def.key)
        return { ...def, ...postnatalStatus(def, { deliveredOn: db.delivery.date, visit }) }
      })
      postnatal = { delivery: db.delivery, visits, completed: visits.filter((v) => v.status === 'Completed').length, child: profileSummary(db, db.delivery.childId) }
    }
    return {
      me,
      status,
      pregnancy,
      nextContact,
      nextAppointment,
      vaccineDue,
      vitals: latestVitals(db),
      postnatal,
      bloodGroup: db.mother?.bloodGroup ?? null,
      children: db.children.map((c) => profileSummary(db, c.id)),
      dangerSigns: status.kind === 'pregnant' ? DANGER_SIGNS : POSTNATAL_DANGER_SIGNS,
    }
  })
}

/** M3 — my health record. Items the doctor added are read-only for the mother. */
export function getMyHealthRecord() {
  return request((db) => {
    const m = db.mother
    return {
      me: meSummary(db),
      caregiver: db.caregiver,
      dob: m.dob,
      bloodGroup: m.bloodGroup,
      patientId: m.patientId,
      nkda: m.nkda,
      allergies: m.allergies,
      conditions: m.conditions,
      medicines: m.medicines,
      pregnancyHistory: m.pregnancyHistory.map((h) => ({ ...h, child: h.childId ? profileSummary(db, h.childId) : null })),
      current: pregnancySummary(db),
    }
  })
}

const KINDS = { allergies: 'allergy', conditions: 'condition', medicines: 'medicine' }

export function validateHealthItem(kind, fields) {
  const errors = {}
  if (kind === 'allergies' && !fields.substance?.trim()) errors.substance = 'What are you allergic to?'
  if (kind === 'conditions' && !fields.name?.trim()) errors.name = 'Name the condition'
  if (kind === 'medicines' && !fields.name?.trim()) errors.name = 'Name the medicine'
  return errors
}

/** Adds something the mother reports herself. The care team checks it at the next visit. */
export function addHealthItem(kind, fields = {}) {
  return write((state, account, view) => {
    if (!KINDS[kind]) throw new ApiError('Unknown item.')
    const errors = validateHealthItem(kind, fields)
    const first = Object.keys(errors)[0]
    if (first) throw new ApiError(errors[first], { field: first })
    const m = state.mothers.find((x) => x.id === account.motherId)
    if (!m) throw new ApiError('Your own health record is kept for mothers. Add this to your child’s record at the next visit instead.', { status: 409 })
    const at = toISODateTime(now())
    const base = { id: nextId(KINDS[kind]), by: account.fullName, at, source: 'mother' }
    const item =
      kind === 'allergies'
        ? { ...base, substance: fields.substance.trim(), reaction: fields.reaction?.trim() ?? '' }
        : kind === 'conditions'
          ? { ...base, name: fields.name.trim(), detail: fields.detail?.trim() ?? '', status: 'Active' }
          : { ...base, name: fields.name.trim(), directions: fields.directions?.trim() ?? '' }
    m[kind].push(item)
    if (kind === 'allergies') m.nkda = null
    notifyStaff(state, {
      to: state.staff.filter((s) => (s.sees ?? []).includes('me')).map((s) => s.id),
      type: 'record',
      title: `${account.fullName} added ${kind === 'allergies' ? 'an allergy' : `a ${KINDS[kind]}`} in the app`,
      body: `${item.substance ?? item.name}. Check it at her next visit.`,
      link: `/clinic/mothers/${m.id}`,
    })
    return view().mother[kind].find((x) => x.id === item.id)
  })
}

export function removeHealthItem(kind, id) {
  return write((state, account) => {
    const m = state.mothers.find((x) => x.id === account.motherId)
    const list = m?.[kind]
    const item = list?.find((x) => x.id === id)
    if (!item) throw notFound('This item')
    if (item.source !== 'mother') throw new ApiError('Only your care team can change this. Message them if it is wrong.', { status: 403 })
    m[kind] = list.filter((x) => x.id !== id)
    return { ok: true }
  })
}

export function updatePersonalDetails({ dob, bloodGroup } = {}) {
  return write((state, account) => {
    if (dob && !isValidISODate(dob)) throw new ApiError('Enter a real date.', { field: 'dob' })
    const m = state.mothers.find((x) => x.id === account.motherId)
    if (!m) throw new ApiError('Your own health record is kept for mothers.', { status: 409 })
    m.dob = dob || m.dob
    m.bloodGroup = bloodGroup === 'unknown' ? null : bloodGroup || m.bloodGroup
    return { dob: m.dob, bloodGroup: m.bloodGroup }
  })
}

/** M4 — the pregnancy tracker. */
export function getPregnancy() {
  return request((db) => {
    const pregnancy = pregnancySummary(db)
    if (!pregnancy || pregnancy.delivered) return null
    const contacts = ancContacts(db)
    const nextContact = contacts.find((c) => c.status === 'Upcoming' || c.status === 'Overdue') ?? null
    const lastVisit = pregnancy.ancVisits[pregnancy.ancVisits.length - 1] ?? null
    return {
      ...pregnancy,
      size: babySize(pregnancy.ga.weeks),
      guidance: weeklyGuidance(pregnancy.ga.weeks),
      dangerSigns: DANGER_SIGNS,
      nextContact,
      lastVisit,
      trimesterStarts: [pregnancy.lmp, dateAtWeek(pregnancy.lmp, 14), dateAtWeek(pregnancy.lmp, 28)],
    }
  })
}

/** M5 — the 8-contact antenatal schedule for the current (or most recent) pregnancy. */
export function getAncSchedule() {
  return request((db) => {
    const pregnancy = pregnancySummary(db)
    if (!pregnancy) return null
    return { pregnancy, contacts: ancContacts(db) }
  })
}

/** M6 — one antenatal visit. */
export function getAncVisit(id) {
  return request((db) => {
    const visits = db.pregnancy?.ancVisits ?? []
    const index = visits.findIndex((v) => v.id === id)
    if (index === -1) throw notFound('This antenatal visit')
    const visit = visits[index]
    const contact = ANC_CONTACTS.find((c) => c.n === visit.contact)
    const booking = visits[0]
    const nextAppointment =
      db.appointments.filter((a) => a.childId === 'me' && a.visitType === 'antenatal' && a.start.slice(0, 10) === visit.nextVisitOn).map((a) => enrichAppointment(db, a))[0] ?? null
    return {
      visit: { ...visit, clinician: clinicianByName(db, visit.clinician) },
      contact,
      previous: visits[index - 1] ?? null,
      weightGain: booking ? Math.round((visit.weightKg - booking.weightKg) * 10) / 10 : null,
      nextAppointment,
      delivered: db.pregnancy.status !== 'pregnant',
    }
  })
}

/** M7 — weight and blood pressure across antenatal visits. */
export function getMaternalProgress() {
  return request((db) => {
    const visits = db.pregnancy?.ancVisits ?? []
    if (!visits.length) return { rows: [], booking: null }
    const booking = visits[0].weightKg
    return {
      booking,
      pregnant: db.pregnancy.status === 'pregnant',
      rows: visits.map((v) => ({
        id: v.id,
        date: v.date,
        ga: v.ga,
        weeks: Number(v.ga.split('+')[0]),
        weightKg: v.weightKg,
        gain: Math.round((v.weightKg - booking) * 10) / 10,
        systolic: v.bpSystolic,
        diastolic: v.bpDiastolic,
      })),
    }
  })
}

/** M8 — Td doses, planned vs given. */
export function getMaternalVaccines() {
  return request((db) => ({ info: maternalVaccineInfo.td, doses: maternalVaccines(db), pregnant: db.pregnancy?.status === 'pregnant' }))
}

/** M9 — delivery summary and postnatal visits. */
export function getPostnatalCare() {
  return request((db) => {
    if (!db.delivery) return null
    const visits = POSTNATAL_VISITS.map((def) => {
      const visit = db.postnatalVisits.find((v) => v.key === def.key) ?? null
      const { status, dueOn } = postnatalStatus(def, { deliveredOn: db.delivery.date, visit })
      return { ...def, status, dueOn, visit: visit ? { ...visit, clinician: clinicianByName(db, visit.clinician) } : null }
    })
    const familyPlanning = [...db.postnatalVisits].reverse().find((v) => v.familyPlanning) ?? null
    return {
      delivery: db.delivery,
      child: profileSummary(db, db.delivery.childId),
      visits,
      familyPlanning: familyPlanning ? { note: familyPlanning.familyPlanning, date: familyPlanning.date, clinician: familyPlanning.clinician } : null,
      dangerSigns: POSTNATAL_DANGER_SIGNS,
    }
  })
}
