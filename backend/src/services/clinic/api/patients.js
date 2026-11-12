import { addDays, daysBetween, isValidISODate, TODAY, TODAY_ISO, toISODate } from '../utils/dates'
import { isValidEmail, isValidKenyanMobile, normalizeKenyanPhone, searchable } from '../utils/format'
import { SCHEDULE_BY_KEY, VACCINES } from '../utils/kepi'
import { invalid, notFound, request } from './client'
import {
  administeredFor,
  caregiverView,
  compareRows,
  context,
  enrichAppointment,
  latestMeasurement,
  lastVisitOn,
  patientBasics,
  motherRow,
  patientRow,
  plannedFor,
  primaryCaregiver,
  upcomingAppointments,
} from './helpers'

function matches(p, query) {
  if (!query) return true
  const q = searchable(query)
  const digits = query.replace(/\D/g, '')
  const name = searchable(`${p.firstName} ${p.lastName}`)
  if (name.includes(q)) return true
  if (p.patientId.toLowerCase().includes(query.trim().toLowerCase())) return true
  return p.caregivers.some((c) => {
    if (searchable(c.name).includes(q)) return true
    if (digits.length >= 3) {
      const phone = normalizeKenyanPhone(c.phone)
      const typed = normalizeKenyanPhone(digits)
      return phone.includes(typed) || `0${phone}`.includes(digits)
    }
    return false
  })
}

const TAB_STATUS = { overdue: 'Overdue', due: 'Due', uptodate: 'Up to date' }

function motherMatches(m, query) {
  if (!query) return true
  const q = searchable(query)
  const digits = query.replace(/\D/g, '')
  if (searchable(`${m.firstName} ${m.lastName}`).includes(q)) return true
  if (m.patientId.toLowerCase().includes(query.trim().toLowerCase())) return true
  return digits.length >= 3 && (`0${m.phone}`.includes(digits) || m.phone.includes(normalizeKenyanPhone(digits)))
}

function motherLink(ctx, p) {
  const id = p.caregivers.find((c) => c.motherId)?.motherId
  const m = id ? ctx.mothersById[id] : null
  return m ? { id: m.id, name: `${m.firstName} ${m.lastName}` } : null
}

function filteredRows(db, { q = '', tab = 'all', group = 'all' } = {}) {
  const ctx = context(db)
  const infants =
    group === 'mothers' ? [] : db.patients.filter((p) => matches(p, q)).map((p) => ({ ...patientRow(ctx, p), kind: 'infant', mother: motherLink(ctx, p) }))
  const mothers = group === 'infants' ? [] : (db.mothers ?? []).filter((m) => motherMatches(m, q)).map((m) => ({ ...motherRow(ctx, m), kind: 'mother' }))
  const rows = [...mothers, ...infants]
  rows.sort(compareRows)
  const counts = {
    all: rows.length,
    overdue: rows.filter((r) => r.status === 'Overdue').length,
    due: rows.filter((r) => r.status === 'Due').length,
    uptodate: rows.filter((r) => r.status === 'Up to date').length,
  }
  const visible = tab === 'all' ? rows : rows.filter((r) => r.status === TAB_STATUS[tab])
  return { rows: visible, counts }
}

/** GET /api/patients?group=&q=&tab=&page= — mothers and infants registered at the facility. */
export function listPatients({ q = '', tab = 'all', group = 'all', page = 1, pageSize = 10 } = {}) {
  return request((db) => {
    const { rows, counts } = filteredRows(db, { q, tab, group })
    const groupCounts = { all: db.patients.length + (db.mothers?.length ?? 0), infants: db.patients.length, mothers: db.mothers?.length ?? 0 }
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
    const current = Math.min(Math.max(1, page), pageCount)
    return {
      rows: rows.slice((current - 1) * pageSize, current * pageSize),
      total: rows.length,
      counts,
      groupCounts,
      authorisedTotal: groupCounts.all,
      infantTotal: db.patients.length,
      page: current,
      pageCount,
      pageSize,
    }
  })
}

/** GET /api/patients/export?group=&q=&tab= */
export function exportPatients({ q = '', tab = 'all', group = 'all' } = {}) {
  return request((db) => filteredRows(db, { q, tab, group }).rows, { delay: 400 })
}

/** GET /api/patients/search?q= — the dashboard search box. */
export function searchPatients(q, limit = 6) {
  return request(
    (db) => {
      if (!q.trim()) return []
      const ctx = context(db)
      return db.patients
        .filter((p) => matches(p, q))
        .slice(0, limit)
        .map((p) => {
          const carer = primaryCaregiver(p)
          return {
            ...patientBasics(p),
            caregiverName: carer?.name ?? '',
            caregiverPhone: carer ? caregiverView(carer).phoneLabel : '',
            lastVisitOn: lastVisitOn(ctx, p),
          }
        })
    },
    { delay: 180 },
  )
}

/** GET /api/patients/options — patient picker on the booking form (mothers first, then infants). */
export function getPatientOptions() {
  return request((db) => {
    const ctx = context(db)
    const mothers = (db.mothers ?? [])
      .map((m) => {
        const row = motherRow(ctx, m)
        return {
          id: m.id,
          kind: 'mother',
          label: `${row.fullName} · ${row.statusLabel} · ${m.patientId}`,
          fullName: row.fullName,
          caregiverName: row.fullName,
          caregiverHasApp: m.hasApp,
        }
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
    const infants = db.patients
      .map((p) => {
        const b = patientBasics(p)
        const carer = primaryCaregiver(p)
        return {
          id: p.id,
          kind: 'infant',
          label: `${b.fullName} · ${b.age} · ${p.patientId}`,
          fullName: b.fullName,
          caregiverName: carer?.name ?? '',
          caregiverHasApp: Boolean(carer?.hasApp),
        }
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
    return [...mothers, ...infants]
  })
}

/** GET /api/patients/:id — the patient profile (frame 12). */
export function getPatient(id) {
  return request((db) => {
    const p = db.patients.find((x) => x.id === id)
    if (!p) throw notFound('This patient')
    const ctx = context(db)
    const planned = plannedFor(ctx, p)
    const upcoming = upcomingAppointments(ctx, p.id).map((a) => enrichAppointment(db, ctx, a))
    const today = upcoming.find((a) => a.date === TODAY_ISO) ?? null
    const row = patientRow(ctx, p)
    return {
      ...patientBasics(p),
      birthWeightKg: p.birthWeightKg,
      birthNotificationNo: p.birthNotificationNo,
      registeredOn: p.registeredOn,
      medicines: p.medicines,
      caregivers: p.caregivers.map(caregiverView),
      conditions: p.conditions ?? [],
      diagnoses: p.diagnoses ?? [],
      audit: [...(p.audit ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1)),
      mother: motherLink(ctx, p),
      lastMeasurement: latestMeasurement(ctx, p.id),
      lastVisitOn: lastVisitOn(ctx, p),
      status: row.status,
      overdueCount: row.overdueKeys.length,
      planned,
      administered: administeredFor(ctx, p),
      todayAppointment: today,
      nextAppointment: upcoming[0] ?? null,
      upcoming,
    }
  })
}

/** POST /api/patients/duplicate-check — same date of birth and a matching name. */
export function checkDuplicate({ fullName, dob }) {
  return request(
    (db) => {
      const name = searchable(fullName)
      if (!name || !isValidISODate(dob)) return { checked: false, match: null }
      const parts = name.split(' ')
      const match = db.patients.find((p) => {
        if (p.dob !== dob) return false
        const existing = searchable(`${p.firstName} ${p.lastName}`)
        return existing === name || (parts.length > 1 && parts.every((part) => existing.includes(part)))
      })
      return {
        checked: true,
        match: match ? { id: match.id, fullName: `${match.firstName} ${match.lastName}`, patientId: match.patientId, dob: match.dob } : null,
      }
    },
    { delay: 260 },
  )
}

/** Validation shared by the form and the API. */
export function validateRegistration(form) {
  const errors = {}
  const name = form.fullName.trim()
  if (!name) errors.fullName = 'Enter the child’s full name.'
  else if (name.split(/\s+/).length < 2) errors.fullName = 'Enter the child’s first name and surname.'
  if (!form.dob) errors.dob = 'Enter the date of birth.'
  else if (!isValidISODate(form.dob)) errors.dob = 'Enter a real date.'
  else if (form.dob > TODAY_ISO) errors.dob = 'Date of birth can’t be in the future.'
  else if (daysBetween(form.dob, TODAY) > 5 * 366) errors.dob = 'Enfantil follows children under 5. Check the year.'
  if (!form.sex) errors.sex = 'Choose girl or boy.'
  if (form.birthWeight) {
    const w = Number(String(form.birthWeight).replace(/kg/i, '').trim())
    if (!Number.isFinite(w) || w < 0.4 || w > 6.5) errors.birthWeight = 'Enter a birth weight in kg, for example 3.1.'
  }
  const carers = [form.caregiver, ...(form.secondCaregiver ? [form.secondCaregiver] : [])]
  carers.forEach((c, i) => {
    const prefix = i === 0 ? 'caregiver' : 'secondCaregiver'
    if (!c.fullName.trim()) errors[`${prefix}.fullName`] = 'Enter the caregiver’s full name.'
    if (!c.relationship) errors[`${prefix}.relationship`] = 'Choose the relationship to the child.'
    if (!c.phone.trim()) errors[`${prefix}.phone`] = 'Enter a phone number for SMS reminders.'
    else if (!isValidKenyanMobile(c.phone)) errors[`${prefix}.phone`] = 'Enter a Kenyan mobile number, for example 0712 345 678.'
    if (c.email.trim() && !isValidEmail(c.email)) errors[`${prefix}.email`] = 'Enter an email address like name@example.com, or leave it empty.'
  })
  if (!form.consent) errors.consent = 'Confirm the caregiver gave consent before registering the child.'
  return errors
}

/** POST /api/patients — register a child and link the caregiver (frame 27). */
export function registerPatient(form) {
  return request(
    (db) => {
      const errors = validateRegistration(form)
      if (Object.keys(errors).length) throw invalid(errors)
      const [firstName, ...rest] = form.fullName.trim().split(/\s+/)
      const lastName = rest.join(' ')
      db.patientSerial += 1
      const id = `p-new-${db.patientSerial}`
      const patientId = `TFH-P-${form.dob.slice(2).replace(/-/g, '')}-${String(db.patientSerial).padStart(3, '0')}`
      const tones = ['mint', 'pink', 'blue', 'violet', 'amber', 'sky', 'peach']
      const carers = [form.caregiver, ...(form.secondCaregiver ? [form.secondCaregiver] : [])].map((c, i) => {
        // A caregiver who already uses the family app sees the new child there straight away.
        const account = db.accounts.find((a) => a.phone === normalizeKenyanPhone(c.phone))
        return {
        id: account?.id ?? `cg-${id}-${i + 1}`,
        name: c.fullName.trim(),
        relationship: c.relationship,
        phone: normalizeKenyanPhone(c.phone),
        email: c.email.trim(),
        primary: i === 0,
        hasApp: Boolean(account),
        ...(account?.motherId && c.relationship === 'Mother' ? { motherId: account.motherId } : {}),
        invitedAt: i === 0 && form.sendInvite ? TODAY_ISO : null,
        tone: tones[(db.patientSerial + i) % tones.length],
      }
      })
      const p = {
        id,
        facilityId: db.facility.id,
        firstName,
        lastName,
        sex: form.sex,
        dob: form.dob,
        patientId,
        tone: tones[db.patientSerial % tones.length],
        birthWeightKg: form.birthWeight ? Number(String(form.birthWeight).replace(/kg/i, '').trim()) : null,
        birthNotificationNo: form.birthNotificationNo.trim(),
        registeredOn: TODAY_ISO,
        caregivers: carers,
        allergies: [],
        medicines: [],
        pastVisits: [],
        contactLog: [],
        consent: { verbal: true, recordedAt: TODAY_ISO },
        recordStatus: 'linked',
        bornAt: null,
        birthLengthCm: null,
        mainClinicianId: null,
        conditions: [],
        diagnoses: [],
        audit: [],
      }
      db.patients.push(p)
      for (const c of carers.filter((x) => x.hasApp)) {
        db.familyNotifications.push({
          id: `n-${id}-${c.id}`,
          accountId: c.id,
          type: 'record',
          childId: id,
          title: `${firstName} was added to your account`,
          body: `Tumaini Family Hospital registered ${firstName} ${lastName} (${patientId}). Vaccines and visits now show in the app.`,
          createdAt: `${TODAY_ISO}T${new Date().toTimeString().slice(0, 5)}`,
          read: false,
          target: { page: 'health' },
        })
      }
      if (form.birthDosesGiven) {
        ;['bcg', 'opv-0'].forEach((key, i) => {
          const v = VACCINES[SCHEDULE_BY_KEY[key].vaccine]
          db.doses.push({
            id: `dose-${id}-${key}`,
            patientId: id,
            key,
            givenOn: form.dob,
            batch: 'Not recorded',
            site: v.site,
            route: v.route,
            givenBy: 'Recorded at registration',
            facility: 'Maternity (from birth notification)',
            notes: '',
            seq: i + 1,
          })
        })
      }
      if (form.birthWeight && p.birthWeightKg) {
        db.measurements.push({ id: `m-${id}-birth`, patientId: id, date: form.dob, weightKg: p.birthWeightKg, heightCm: null, by: 'Birth notification' })
      }
      return { id, patientId, fullName: `${firstName} ${lastName}`, inviteSent: Boolean(form.sendInvite), caregiverName: carers[0].name }
    },
    { mutates: true, delay: 700 },
  )
}

/** GET /api/patients/first-visit-suggestion?dob= — first free 09:00 slot with the immunization nurse. */
export function suggestFirstVisit(dob) {
  return request(
    (db) => {
      if (!isValidISODate(dob)) return null
      const sixWeeks = addDays(dob, 42)
      let day = sixWeeks < TODAY ? addDays(TODAY, 1) : sixWeeks
      for (let i = 0; i < 30; i += 1) {
        const iso = toISODate(day)
        const weekend = [0, 6].includes(day.getDay())
        const taken = db.appointments.some((a) => a.clinicianId === 'joseph-mwangi' && a.status !== 'cancelled' && a.start === `${iso}T09:00`)
        if (!weekend && !taken) return { start: `${iso}T09:00`, clinicianName: 'Nurse Joseph Mwangi' }
        day = addDays(day, 1)
      }
      return null
    },
    { delay: 200 },
  )
}
