/**
 * Shapes raw mock records into what screens need. A real Express API would do
 * the same work on the server and return these shapes as JSON.
 */
import { addDays, daysBetween, formatAge, formatDate, formatTime, isSameDay, now, toDate, toISODate, TODAY, TODAY_ISO } from '../utils/dates'
import { formatLocalPhone, initials } from '../utils/format'
import { administeredName, buildSchedule, doseColumn, immunizationSummary, plannedDoses, plannedLabel, SCHEDULE_BY_KEY, VACCINES } from '../utils/kepi'

export function groupBy(list, key) {
  const out = {}
  for (const item of list) (out[item[key]] ??= []).push(item)
  return out
}

/** Lookups built once per request so list screens stay fast with 248 patients. */
export function context(db) {
  return {
    dosesByPatient: groupBy(db.doses, 'patientId'),
    apptsByPatient: groupBy(db.appointments, 'patientId'),
    measurementsByPatient: groupBy(db.measurements, 'patientId'),
    patientsById: Object.fromEntries(db.patients.map((p) => [p.id, p])),
  }
}

export function staffSummary(db, id) {
  const s = db.staff.find((x) => x.id === id)
  if (!s) return null
  return { id: s.id, name: s.name, shortName: s.shortName, title: s.title, initials: s.initials, tone: s.tone, staffId: s.staffId }
}

export function primaryCaregiver(p) {
  return p.caregivers.find((c) => c.primary) ?? p.caregivers[0] ?? null
}

export function caregiverView(c) {
  return { ...c, initials: initials(c.name), phoneLabel: formatLocalPhone(c.phone) }
}

export function patientBasics(p, at = TODAY) {
  return {
    id: p.id,
    patientId: p.patientId,
    firstName: p.firstName,
    lastName: p.lastName,
    fullName: `${p.firstName} ${p.lastName}`,
    initials: initials(`${p.firstName} ${p.lastName}`),
    tone: p.tone,
    sex: p.sex,
    sexLabel: p.sex === 'female' ? 'Girl' : 'Boy',
    dob: p.dob,
    age: formatAge(p.dob, at),
    ageShort: formatAge(p.dob, at, { short: true }),
    allergies: p.allergies,
  }
}

export function scheduleFor(ctx, p) {
  return buildSchedule(p.dob, ctx.dosesByPatient[p.id] ?? [])
}

export function lastVisitOn(ctx, p) {
  const completed = (ctx.apptsByPatient[p.id] ?? [])
    .filter((a) => a.status === 'completed' && a.start.slice(0, 10) <= TODAY_ISO)
    .map((a) => a.start.slice(0, 10))
  const all = [...p.pastVisits, ...completed].sort()
  return all[all.length - 1] ?? null
}

export function upcomingAppointments(ctx, patientId) {
  return (ctx.apptsByPatient[patientId] ?? [])
    .filter((a) => a.status === 'upcoming' && a.start.slice(0, 10) >= TODAY_ISO)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
}

/** 'today', 'Wed 11 Nov' (this week), '7 Dec', '2 May 2027' */
export function dayText(value) {
  const diff = daysBetween(TODAY, value)
  if (diff === 0) return 'today'
  if (diff > 0 && diff < 7) return formatDate(value, 'weekday')
  return formatDate(value, 'auto')
}

/** One row of the patient list (frame 24). */
export function patientRow(ctx, p) {
  const schedule = scheduleFor(ctx, p)
  const summary = immunizationSummary(schedule)
  const booked = summary.nextKey ? upcomingAppointments(ctx, p.id).find((a) => a.doseKeys.includes(summary.nextKey)) : null
  let nextDueText = summary.nextLabel
  if (summary.status === 'Overdue') nextDueText = `${summary.nextLabel} · since ${formatDate(summary.nextOn, 'short')}`
  else if (summary.nextOn) nextDueText = `${summary.nextLabel} · ${dayText(booked ? booked.start : summary.nextOn)}`
  const carer = primaryCaregiver(p)
  return {
    ...patientBasics(p),
    caregiver: carer ? caregiverView(carer) : null,
    lastVisitOn: lastVisitOn(ctx, p),
    status: summary.status,
    nextLabel: summary.nextLabel,
    nextOn: summary.nextOn,
    nextDueText,
    daysLate: summary.daysLate,
    overdueKeys: summary.overdue.map((d) => d.key),
    registeredOn: p.registeredOn,
    bookedAt: booked?.start ?? null,
  }
}

export const STATUS_ORDER = { Overdue: 0, Due: 1, 'Up to date': 2 }

/** "Sorted by next due date": overdue first (most recently due first), then due, then up to date. */
export function compareRows(a, b) {
  if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  if (a.status === 'Overdue' && a.daysLate !== b.daysLate) return a.daysLate - b.daysLate
  const aDay = (a.bookedAt ?? a.nextOn ?? '9999').slice(0, 10)
  const bDay = (b.bookedAt ?? b.nextOn ?? '9999').slice(0, 10)
  if (aDay !== bDay) return aDay < bDay ? -1 : 1
  // Same day: children with a booked visit first, in appointment order.
  if (Boolean(a.bookedAt) !== Boolean(b.bookedAt)) return a.bookedAt ? -1 : 1
  if (a.bookedAt && b.bookedAt && a.bookedAt !== b.bookedAt) return a.bookedAt < b.bookedAt ? -1 : 1
  return a.fullName.localeCompare(b.fullName)
}

export function displayStatus(a) {
  return { upcoming: 'Upcoming', completed: 'Completed', cancelled: 'Cancelled' }[a.status]
}

export function enrichAppointment(db, ctx, a) {
  const p = ctx.patientsById[a.patientId]
  const carer = p ? primaryCaregiver(p) : null
  return {
    ...a,
    date: a.start.slice(0, 10),
    time: formatTime(a.start),
    displayStatus: displayStatus(a),
    patient: p ? { ...patientBasics(p, toDate(a.start) > TODAY ? toDate(a.start) : TODAY) } : null,
    caregiver: carer ? caregiverView(carer) : null,
    clinician: staffSummary(db, a.clinicianId),
  }
}

/** Planned-dose row with its linked appointment (frame 12, 15). */
export function plannedRow(ctx, patientId, dose) {
  const appt = upcomingAppointments(ctx, patientId).find((a) => a.doseKeys.includes(dose.key))
  return {
    key: dose.key,
    vaccine: VACCINES[dose.vaccineId].name,
    doseLabel: doseColumn(dose.key),
    label: plannedLabel(dose.key),
    dueOn: dose.dueOn,
    status: dose.status,
    daysLate: dose.daysLate,
    appointment: appt ? { id: appt.id, start: appt.start } : null,
  }
}

export function plannedFor(ctx, p) {
  return plannedDoses(scheduleFor(ctx, p)).map((d) => plannedRow(ctx, p.id, d))
}

export function administeredFor(ctx, p) {
  return (ctx.dosesByPatient[p.id] ?? [])
    .map((r) => ({
      id: r.id,
      key: r.key,
      name: administeredName(r.key),
      givenOn: r.givenOn,
      batch: r.batch,
      site: r.site,
      route: r.route,
      givenBy: r.givenBy,
      facility: r.facility,
      notes: r.notes,
      seq: r.seq,
      recordedAt: r.recordedAt ?? null,
    }))
    .sort((a, b) => (a.givenOn !== b.givenOn ? (a.givenOn < b.givenOn ? 1 : -1) : (b.recordedAt ?? '').localeCompare(a.recordedAt ?? '') || a.seq - b.seq))
}

export function latestMeasurement(ctx, patientId, before) {
  const list = (ctx.measurementsByPatient[patientId] ?? []).filter((m) => !before || m.date < before).sort((a, b) => (a.date < b.date ? 1 : -1))
  return list[0] ?? null
}

/** Message, reminder and booking history shown as "last contact" for defaulters. */
export function lastContact(db, ctx, p) {
  const sentToday = db.reminders.filter((r) => r.patientId === p.id).sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))[0]
  if (sentToday) return { text: `SMS sent today ${formatTime(sentToday.sentAt)}`, tone: 'success' }
  const booked = upcomingAppointments(ctx, p.id)[0]
  if (booked) {
    const when = isSameDay(booked.start, TODAY) ? `today ${formatTime(booked.start)}` : `${formatDate(booked.start, 'weekday')} ${formatTime(booked.start)}`
    return { text: `Visit booked ${when}`, tone: 'muted' }
  }
  const log = [...p.contactLog].sort((a, b) => (a.at < b.at ? 1 : -1))
  if (!log.length) return { text: 'Not contacted yet', tone: 'alert' }
  const latest = log[0]
  if (latest.type === 'call') return { text: `${latest.note ? `${latest.note} ` : ''}Called ${formatDate(latest.at, 'short')}`, tone: 'muted' }
  const unanswered = log.filter((l) => l.type === 'sms' && !l.replied)
  if (unanswered.length >= 2) return { text: `No reply to ${unanswered.length} SMS`, tone: 'alert' }
  return { text: `SMS sent ${formatDate(latest.at, 'short')}`, tone: 'muted' }
}

export function reminderSentToday(db, patientId) {
  return db.reminders.some((r) => r.patientId === patientId && r.sentAt.slice(0, 10) === TODAY_ISO)
}

export function shortName(key) {
  const e = SCHEDULE_BY_KEY[key]
  return e ? plannedLabel(key) : key
}

export function nowISO() {
  const d = now()
  return `${toISODate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function weekRange(monday) {
  return { from: toISODate(monday), to: toISODate(addDays(monday, 6)) }
}
