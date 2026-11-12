import { randomBytes } from 'node:crypto'
import { ApiError, notFound, request, write } from './client'
import { byDateAsc, byDateDesc, childSummary, enrichDose } from './helpers'
import { doseRecord, OPTIONAL_VACCINE_IDS, vaccines } from '../data/reference'
import { addDays, addMonths, now, toISODate, toISODateTime, TODAY } from '../utils/dates'

/** All doses for a child with derived status, plus the counts shown on the progress card. */
export function getImmunizations(childId) {
  return request((db) => {
    const child = childSummary(db, childId)
    if (!child) throw notFound('This child')
    const doses = db.doses.filter((d) => d.childId === childId).map((d) => enrichDose(db, d))
    const given = doses.filter((d) => d.status === 'Given').sort((a, b) => byDateDesc('givenOn')(a, b) || a.seq - b.seq)
    const overdue = doses.filter((d) => d.status === 'Overdue').sort(byDateAsc('dueOn'))
    const planned = doses.filter((d) => d.status === 'Planned').sort(byDateAsc('dueOn'))
    const lastPlanned = planned[planned.length - 1] ?? overdue[overdue.length - 1] ?? given[0]
    return {
      child,
      given,
      upcoming: [...overdue, ...planned],
      counts: { given: given.length, planned: planned.length, overdue: overdue.length, total: doses.length },
      scheduleTo: lastPlanned?.ageLabel ?? null,
    }
  })
}

/** One dose with its vaccine information, the child's other doses of that vaccine and the linked visit. */
export function getDose(doseId) {
  return request((db) => {
    const raw = db.doses.find((d) => d.id === doseId)
    if (!raw) throw notFound('This dose')
    const dose = enrichDose(db, raw)
    const child = childSummary(db, raw.childId)
    const series = db.doses
      .filter((d) => d.childId === raw.childId && d.vaccineId === raw.vaccineId)
      .map((d) => enrichDose(db, d))
      .sort(byDateAsc('dueOn'))
    const sameVisit = raw.appointmentId
      ? db.doses
          .filter((d) => d.appointmentId === raw.appointmentId && d.id !== raw.id)
          .map((d) => enrichDose(db, d))
      : []
    return { dose, child, series, sameVisit }
  })
}

export function getShareLink(childId) {
  return request((db) => db.shareLinks[childId] ?? null, { delay: 150 })
}

export function createShareLink(childId) {
  return write((state, account, view) => {
    if (!view().children.some((c) => c.id === childId)) throw new ApiError('Choose a child first.')
    const raw = randomBytes(6).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, 'X')
    const link = {
      url: `https://enfantil.app/v/${raw.slice(0, 4)}-${raw.slice(4, 8)}`,
      createdOn: toISODate(TODAY),
      expiresOn: toISODate(addDays(TODAY, 7)),
    }
    state.shareLinks = [...state.shareLinks.filter((s) => !(s.accountId === account.id && s.patientId === childId)), { accountId: account.id, patientId: childId, ...link }]
    return link
  })
}

export function revokeShareLink(childId) {
  return write((state, account) => {
    state.shareLinks = state.shareLinks.filter((s) => !(s.accountId === account.id && s.patientId === childId))
    return { ok: true }
  })
}

/** Due dates for an optional vaccine: its usual age, but never before the next clinic day. */
function optionalSchedule(child, vaccineId) {
  const v = vaccines[vaccineId]
  const earliest = toISODate(addDays(TODAY, 1))
  const out = []
  for (const entry of v.schedule) {
    let due
    if (entry.after) due = toISODate(addDays(out[out.length - 1].dueOn, entry.after.days))
    else due = toISODate(entry.at.months ? addMonths(child.dob, entry.at.months) : addDays(child.dob, entry.at.days ?? 0))
    if (due < earliest) due = earliest
    out.push({ ...entry, dueOn: due })
  }
  return out
}

/** The optional (paid) vaccines Tumaini Family Hospital offers, and whether each is in the child's plan. */
export function getOptionalVaccines(childId) {
  return request((db) => {
    const child = childSummary(db, childId)
    if (!child) throw notFound('This child')
    return OPTIONAL_VACCINE_IDS.map((id) => {
      const v = vaccines[id]
      const doses = db.doses.filter((d) => d.childId === childId && d.vaccineId === id).map((d) => enrichDose(db, d))
      return {
        id,
        name: v.name,
        price: v.price,
        protects: v.protects,
        how: v.how,
        ageLabel: v.schedule[0].ageLabel,
        inPlan: doses.length > 0,
        given: doses.filter((d) => d.givenOn).length,
        planned: optionalSchedule(child, id).map((e) => e.dueOn),
        doses,
      }
    })
  })
}

/** Adds an optional vaccine to the child's plan (planned doses appear), or takes it out. */
export function setOptionalVaccine(childId, vaccineId, inPlan) {
  return write((state, account, view) => {
    const child = view().children.find((c) => c.id === childId)
    if (!child) throw notFound('This child')
    if (!OPTIONAL_VACCINE_IDS.includes(vaccineId)) throw new ApiError('This vaccine is not offered as an optional vaccine.')
    const mine = (d) => d.patientId === childId && d.vaccineId === vaccineId
    const existing = state.optionalDoses.filter(mine)
    if (inPlan) {
      if (existing.length) return { ok: true }
      for (const entry of optionalSchedule(child, vaccineId)) {
        const rec = doseRecord(childId, vaccineId, entry.dose, entry.ageLabel, { dueOn: entry.dueOn })
        state.optionalDoses.push({
          id: rec.id,
          patientId: childId,
          vaccineId,
          doseNumber: entry.dose,
          ageLabel: entry.ageLabel,
          dueOn: entry.dueOn,
          givenOn: null,
          batch: null,
          givenBy: null,
          facilityLabel: null,
          addedAt: toISODateTime(now()),
        })
      }
    } else {
      state.optionalDoses = state.optionalDoses.filter((d) => !(mine(d) && !d.givenOn))
    }
    return { ok: true }
  })
}
