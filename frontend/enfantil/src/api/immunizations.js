import { ApiError, notFound, request } from './client'
import { byDateAsc, byDateDesc, childSummary, enrichDose } from './helpers'
import { addDays, toISODate, TODAY } from '../utils/dates'

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
  return request(
    (db) => {
      if (!db.children.some((c) => c.id === childId)) throw new ApiError('Choose a child first.')
      const code = Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()
      const link = {
        url: `https://enfantil.app/v/${code}`,
        createdOn: toISODate(TODAY),
        expiresOn: toISODate(addDays(TODAY, 7)),
      }
      db.shareLinks[childId] = link
      return link
    },
    { mutates: true },
  )
}

export function revokeShareLink(childId) {
  return request(
    (db) => {
      delete db.shareLinks[childId]
      return { ok: true }
    },
    { mutates: true },
  )
}
