/**
 * Kenya Expanded Programme on Immunization (KEPI) schedule.
 *
 * - Birth: BCG, OPV 0
 * - 6, 10 and 14 weeks: OPV, Pentavalent, PCV; Rotavirus at 6 and 10 weeks; IPV at 14 weeks
 * - Vitamin A at 6 months, then every 6 months up to 54 months
 * - Measles-Rubella at 9 and 18 months
 *
 * Due dates follow the clinic rule for the infant series: a 10- or 14-week
 * visit is due at that age, or 4 weeks after the previous visit, whichever is
 * later. So a baby whose 10-week doses were late is due for the 14-week doses
 * 4 weeks after them, not on the 14-week birthday.
 */
import { addDays, addMonths, daysBetween, formatDate, startOfWeek, toDate, toISODate, TODAY } from './dates'

export const ROUTES = {
  Oral: 'Oral',
  IM: 'Intramuscular (IM)',
  SC: 'Subcutaneous (SC)',
  ID: 'Intradermal (ID)',
}

export const SITES = ['Mouth', 'Left thigh', 'Right thigh', 'Left upper arm', 'Right upper arm', 'Left forearm']

export const VACCINES = {
  bcg: { id: 'bcg', name: 'BCG', short: 'BCG', site: 'Left forearm', route: 'ID', batchPrefix: 'BCG' },
  opv: { id: 'opv', name: 'OPV', short: 'OPV', numbered: true, site: 'Mouth', route: 'Oral', batchPrefix: 'bOPV' },
  penta: { id: 'penta', name: 'Pentavalent', short: 'Penta', numbered: true, site: 'Left thigh', route: 'IM', batchPrefix: 'PNT' },
  pcv: { id: 'pcv', name: 'PCV', short: 'PCV', numbered: true, site: 'Right thigh', route: 'IM', batchPrefix: 'PCV10' },
  rota: { id: 'rota', name: 'Rotavirus', short: 'Rota', numbered: true, site: 'Mouth', route: 'Oral', batchPrefix: 'ROTA' },
  ipv: { id: 'ipv', name: 'IPV', short: 'IPV', site: 'Right thigh', route: 'IM', batchPrefix: 'IPV' },
  vita: { id: 'vita', name: 'Vitamin A', short: 'Vitamin A', supplement: true, site: 'Mouth', route: 'Oral', batchPrefix: 'VITA' },
  mr: { id: 'mr', name: 'Measles-Rubella', short: 'Measles-Rubella', numbered: true, site: 'Left upper arm', route: 'SC', batchPrefix: 'MR' },
}

const VISIT_LABELS = { birth: 'At birth', '6w': '6 weeks', '10w': '10 weeks', '14w': '14 weeks' }
const PREVIOUS_VISIT = { '10w': '6w', '14w': '10w' }

function entry(vaccine, dose, at, visit, ageLabel) {
  const key = dose === null ? vaccine : `${vaccine}-${dose}`
  return { key, vaccine, dose, at, visit, ageLabel }
}

export const KEPI_SCHEDULE = [
  entry('bcg', null, { days: 0 }, 'birth', 'At birth'),
  entry('opv', 0, { days: 0 }, 'birth', 'At birth'),
  ...['opv', 'penta', 'pcv', 'rota'].map((v) => entry(v, 1, { weeks: 6 }, '6w', '6 weeks')),
  ...['opv', 'penta', 'pcv', 'rota'].map((v) => entry(v, 2, { weeks: 10 }, '10w', '10 weeks')),
  ...['opv', 'penta', 'pcv'].map((v) => entry(v, 3, { weeks: 14 }, '14w', '14 weeks')),
  entry('ipv', null, { weeks: 14 }, '14w', '14 weeks'),
  entry('vita', 6, { months: 6 }, 'vita-6', '6 months'),
  entry('mr', 1, { months: 9 }, 'mr-1', '9 months'),
  entry('vita', 12, { months: 12 }, 'vita-12', '12 months'),
  entry('vita', 18, { months: 18 }, 'vita-18', '18 months'),
  entry('mr', 2, { months: 18 }, 'mr-2', '18 months'),
  ...[24, 30, 36, 42, 48, 54].map((m) => entry('vita', m, { months: m }, `vita-${m}`, `${m} months`)),
]

export const SCHEDULE_BY_KEY = Object.fromEntries(KEPI_SCHEDULE.map((e) => [e.key, e]))

function scheduledDate(dob, at) {
  if (at.months) return addMonths(dob, at.months)
  if (at.weeks) return addDays(dob, at.weeks * 7)
  return addDays(dob, at.days ?? 0)
}

/** Vaccine names as clinics write them. */
export function doseName(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement) return `${v.name} · ${e.ageLabel}`
  if (e.dose === null) return v.name
  return `${v.name} ${e.dose}`
}

/** 'Pentavalent 3', 'OPV 3', 'IPV', 'Vitamin A' — the Administered table. */
export function administeredName(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement || e.dose === null) return v.name
  return `${v.name} ${e.dose}`
}

/** 'OPV 1', 'Penta 1', 'Measles-Rubella 2', 'Vitamin A · 6 months' — defaulter lists. */
export function shortDoseName(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement) return `${v.name} · ${e.ageLabel}`
  if (e.dose === null) return v.short
  return `${v.short} ${e.dose}`
}

/** 'Dose 1', '6 months', 'Single dose' — the DOSE column. */
export function doseColumn(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement) return e.ageLabel
  if (e.dose === null) return 'Single dose'
  return `Dose ${e.dose}`
}

/** 'Measles-Rubella · Dose 1', 'Vitamin A · 6 months' — pickers and side panels. */
export function plannedLabel(key) {
  const e = SCHEDULE_BY_KEY[key]
  return `${VACCINES[e.vaccine].name} · ${doseColumn(key)}`
}

/** Dose number field value: 1, 2, 3 for numbered series; the position in the series otherwise. */
export function doseNumber(key) {
  const e = SCHEDULE_BY_KEY[key]
  if (e.dose !== null && !VACCINES[e.vaccine].supplement) return String(e.dose)
  const series = KEPI_SCHEDULE.filter((s) => s.vaccine === e.vaccine)
  return String(series.findIndex((s) => s.key === key) + 1)
}

/**
 * The child's full schedule: one row per KEPI dose with its due date, the
 * matching given record (if any), status ('Given' | 'Overdue' | 'Planned') and days late.
 */
export function buildSchedule(dob, givenRecords = [], ref = TODAY) {
  const given = Object.fromEntries(givenRecords.map((r) => [r.key, r]))
  const rows = []
  const anchorByVisit = {}

  for (const e of KEPI_SCHEDULE) {
    let due = scheduledDate(dob, e.at)
    const prevVisit = PREVIOUS_VISIT[e.visit]
    if (prevVisit && anchorByVisit[prevVisit]) {
      const minimum = addDays(anchorByVisit[prevVisit], 28)
      if (minimum > due) due = minimum
    }
    if (e.key === 'mr-2') {
      const mr1 = rows.find((r) => r.key === 'mr-1')
      const minimum = addDays(mr1.givenOn ?? mr1.dueOn, 28)
      if (minimum > due) due = minimum
    }
    rows.push({ key: e.key, dueOn: toISODate(due), givenOn: given[e.key]?.givenOn ?? null })
    // Visit-level due dates: every dose in an infant visit shares the latest due date.
    if (VISIT_LABELS[e.visit]) {
      const visitRows = rows.filter((r) => SCHEDULE_BY_KEY[r.key].visit === e.visit)
      const latestDue = visitRows.reduce((max, r) => (r.dueOn > max ? r.dueOn : max), visitRows[0].dueOn)
      visitRows.forEach((r) => {
        r.dueOn = latestDue
      })
      const anchors = visitRows.map((r) => r.givenOn ?? r.dueOn)
      anchorByVisit[e.visit] = anchors.reduce((max, d) => (d > max ? d : max), anchors[0])
    }
  }

  return rows.map((row) => {
    const e = SCHEDULE_BY_KEY[row.key]
    const record = given[row.key] ?? null
    const late = daysBetween(row.dueOn, ref)
    const status = record ? 'Given' : late > 0 ? 'Overdue' : 'Planned'
    return {
      ...row,
      vaccineId: e.vaccine,
      dose: e.dose,
      visit: e.visit,
      ageLabel: e.ageLabel,
      record,
      status,
      daysLate: status === 'Overdue' ? late : 0,
    }
  })
}

/** Doses still to give. Children past 5 years have finished the schedule. */
export function pendingDoses(schedule) {
  return schedule.filter((d) => !d.record).sort((a, b) => (a.dueOn === b.dueOn ? 0 : a.dueOn < b.dueOn ? -1 : 1))
}

/** The next two doses of each vaccine still to give — the "Planned doses" table. */
export function plannedDoses(schedule) {
  const perVaccine = {}
  return pendingDoses(schedule).filter((d) => {
    perVaccine[d.vaccineId] = (perVaccine[d.vaccineId] ?? 0) + 1
    return perVaccine[d.vaccineId] <= 2
  })
}

const GROUP_VISITS = { '6w': '6-week doses', '10w': '10-week doses', '14w': '14-week doses' }

/**
 * Immunization summary for lists:
 * status 'Overdue' | 'Due' (due this week) | 'Up to date', the next dose label
 * ('OPV 1', '14-week doses', 'Measles-Rubella 2', 'Vitamin A') and its date.
 */
export function immunizationSummary(schedule, ref = TODAY) {
  const pending = pendingDoses(schedule)
  const overdue = pending.filter((d) => d.status === 'Overdue')
  if (overdue.length) {
    const first = overdue[0]
    return {
      status: 'Overdue',
      nextKey: first.key,
      nextLabel: listLabel(first.key),
      nextOn: first.dueOn,
      overdue,
      daysLate: Math.max(...overdue.map((d) => d.daysLate)),
    }
  }
  if (!pending.length) return { status: 'Up to date', nextKey: null, nextLabel: 'Schedule complete', nextOn: null, overdue: [], daysLate: 0 }
  const nextOn = pending[0].dueOn
  const sameDay = pending.filter((d) => d.dueOn === nextOn)
  const groupVisit = sameDay.length > 1 && GROUP_VISITS[sameDay[0].visit] && sameDay.every((d) => d.visit === sameDay[0].visit)
  const preferred = sameDay.find((d) => !VACCINES[d.vaccineId].supplement) ?? sameDay[0]
  const endOfWeek = addDays(startOfWeek(ref), 6)
  return {
    status: toDate(nextOn) <= endOfWeek ? 'Due' : 'Up to date',
    nextKey: preferred.key,
    nextKeys: sameDay.map((d) => d.key),
    nextLabel: groupVisit ? GROUP_VISITS[sameDay[0].visit] : listLabel(preferred.key),
    nextOn,
    overdue: [],
    daysLate: 0,
  }
}

/** 'OPV 1', 'Measles-Rubella 1', 'Vitamin A' */
export function listLabel(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement || e.dose === null) return v.short
  return `${v.short} ${e.dose}`
}

/** 'Vitamin A, 6 months' or 'OPV 1' — the dashboard's overdue alert. */
export function alertLabel(key) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  if (v.supplement) return `${v.name}, ${e.ageLabel}`
  return listLabel(key)
}

/**
 * The KEPI preview on the registration form: one row per primary-series visit
 * (birth, 6/10/14 weeks, Vitamin A 6 months, MR 9 and 18 months).
 */
export function schedulePreview(dob) {
  const schedule = buildSchedule(dob)
  const pick = (keys) => schedule.filter((d) => keys.includes(d.key))
  const groups = [
    { id: 'birth', title: 'BCG · OPV 0', keys: ['bcg', 'opv-0'], subtitle: (date) => `At birth · ${formatDate(date)}` },
    { id: '6w', title: '6-week doses', keys: ['opv-1', 'penta-1', 'pcv-1', 'rota-1'], subtitle: () => 'OPV 1 · Penta 1 · PCV 1 · Rota 1' },
    { id: '10w', title: '10-week doses', keys: ['opv-2', 'penta-2', 'pcv-2', 'rota-2'], subtitle: () => 'OPV 2 · Penta 2 · PCV 2 · Rota 2' },
    { id: '14w', title: '14-week doses', keys: ['opv-3', 'penta-3', 'pcv-3', 'ipv'], subtitle: () => 'OPV 3 · Penta 3 · PCV 3 · IPV' },
    { id: 'vita-6', title: 'Vitamin A', keys: ['vita-6'], subtitle: () => '6 months' },
    { id: 'mr-1', title: 'Measles-Rubella 1', keys: ['mr-1'], subtitle: () => '9 months' },
    { id: 'mr-2', title: 'Measles-Rubella 2', keys: ['mr-2'], subtitle: () => '18 months' },
  ]
  return groups.map((g) => {
    const doses = pick(g.keys)
    const dueOn = doses[0].dueOn
    return { id: g.id, title: g.title, subtitle: g.subtitle(dueOn), dueOn, keys: g.keys }
  })
}
