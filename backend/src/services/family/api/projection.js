/**
 * The family app's view of the shared data: builds, for one account, the
 * object the family services were written against (caregiver, mother,
 * pregnancy, delivery, postnatal visits, Td doses, children, doses,
 * measurements, appointments, conversations, notifications, settings).
 *
 * Nothing here writes: changes go through the write helpers in client.js,
 * which change the shared state directly.
 */
import { buildSchedule, SCHEDULE_BY_KEY } from '../../clinic/utils/kepi.js'
import { formatGA, gestationalAge } from '../utils/pregnancy'
import { doseNames, vaccines } from '../data/reference'

/** The family app has fewer avatar colours than the portal. */
const TONE = { mint: 'teal', sky: 'teal', peach: 'coral', blue: 'indigo', violet: 'indigo' }
const familyTone = (tone) => TONE[tone] ?? tone ?? 'teal'

const FAMILY_TONE_BY_STAFF = { 'achieng-otieno': 'indigo', 'grace-wanjala': 'amber', 'joseph-mwangi': 'teal' }
const STATUS = { upcoming: 'scheduled', completed: 'completed', cancelled: 'cancelled' }
const TITLES = {
  antenatal: 'Antenatal visit',
  postnatal: 'Postnatal check',
  vaccination: 'Vaccination',
  growth: 'Growth check',
  sick: 'Sick visit',
  general: 'General consultation',
}

export function familyFacility(state) {
  const f = state.facility
  return { id: f.id, name: f.name, shortName: f.name, address: f.address, county: f.county, phone: f.phone }
}

export function familyClinicians(state) {
  const facility = state.facility.name
  return [...state.staff, ...state.deskStaff].map((s) => {
    const desk = state.deskStaff.includes(s)
    return {
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      role: s.title,
      subtitle: desk ? `Appointments desk · ${facility}` : `${s.title} · ${facility}`,
      facilityId: state.facility.id,
      tone: FAMILY_TONE_BY_STAFF[s.id] ?? familyTone(s.tone),
      sees: s.sees ?? [],
      ...(desk ? { initials: s.initials } : {}),
    }
  })
}

function staffName(state, id) {
  return state.staff.find((s) => s.id === id)?.name ?? state.deskStaff.find((s) => s.id === id)?.name ?? id ?? ''
}

/** The children an account follows: its id is one of the child's caregivers. */
export function childrenOf(state, accountId) {
  return state.patients.filter((p) => p.caregivers.some((c) => c.id === accountId))
}

const source = (it) => (it.source === 'mother' ? 'self' : 'clinician')
const by = (it) => (it.source === 'mother' ? 'You' : (it.by ?? null))

function motherRecord(state, account, m) {
  if (!m) {
    return { dob: null, tracking: account.tracking, bloodGroup: null, patientId: null, nkda: null, allergies: [], conditions: [], medicines: [], pregnancyHistory: [] }
  }
  return {
    dob: m.dob,
    tracking: account.tracking,
    bloodGroup: m.bloodGroup,
    patientId: m.patientId,
    nkda: m.nkda ? { note: 'No known drug allergies', updatedBy: m.nkda.by, updatedAt: m.nkda.at } : null,
    allergies: m.allergies.map((a) => ({ id: a.id, substance: a.substance, reaction: a.reaction ?? '', source: source(a), updatedBy: by(a), updatedAt: a.at ?? null })),
    conditions: m.conditions.map((c) => ({
      id: c.id,
      name: c.name,
      detail: c.detail ?? '',
      status: c.status ?? 'Active',
      source: source(c),
      updatedBy: by(c),
      updatedAt: c.at ?? null,
    })),
    medicines: m.medicines.map((x) => ({ id: x.id, name: x.name, directions: x.directions ?? x.dose ?? '', source: source(x), updatedBy: by(x), updatedAt: x.at ?? null })),
    pregnancyHistory: m.history.map((h) => ({
      id: h.id,
      year: h.year,
      outcome: h.outcome,
      delivery: h.delivery,
      babyWeightKg: h.babyWeightKg,
      gestation: h.gestation,
      place: h.place ?? state.facility.name,
      childId: h.childId,
      source: 'clinician',
      updatedBy: h.by ?? null,
      updatedAt: h.at ?? null,
    })),
  }
}

function pregnancyView(state, p) {
  if (!p) return null
  return {
    id: p.id,
    lmp: p.lmp,
    edd: p.edd,
    gravida: p.gravida,
    para: p.para,
    status: p.status === 'pregnant' ? 'pregnant' : 'delivered',
    ancVisits: p.ancVisits.map((v) => ({
      id: v.id,
      contact: v.contact,
      date: v.date,
      ga: formatGA(gestationalAge(p.lmp, v.date)),
      clinician: staffName(state, v.clinicianId),
      bpSystolic: v.bpSystolic,
      bpDiastolic: v.bpDiastolic,
      weightKg: v.weightKg,
      fundalHeightCm: v.fundalHeightCm,
      fetalHeartRate: v.fetalHeartRate,
      hb: v.hb,
      urineProtein: v.urineProtein,
      urineGlucose: v.urineGlucose,
      supplements: v.supplements ?? [],
      tdGiven: v.tdGiven,
      noteForMother: v.noteForMother || null,
      nextVisitOn: v.nextVisitOn,
    })),
  }
}

function deliveryView(state, d) {
  if (!d) return null
  return {
    date: d.date,
    time: d.time,
    place: d.place ?? `${state.facility.name} (maternity)`,
    mode: d.mode,
    gestation: d.gestation,
    outcome: d.outcome === 'Live birth' && d.babySex ? `Live birth, ${d.babySex === 'female' ? 'girl' : 'boy'}` : d.outcome,
    babyWeightKg: d.babyWeightKg,
    babyLengthCm: d.babyLengthCm,
    apgar: d.apgar,
    bloodLoss: d.bloodLoss,
    attendedBy: String(d.attendedBy ?? '')
      .split(/,\s*/)
      .filter(Boolean),
    childId: d.childId,
  }
}

function babyFrom(v) {
  if (v.babyDetails) {
    const b = v.babyDetails
    return { weightKg: b.weightKg, feeding: b.feeding ?? '—', cord: b.cord ?? '—', jaundice: b.jaundice ?? '—', tempC: b.tempC }
  }
  const text = v.baby ?? ''
  const weight = /Weight ([\d.]+) kg/i.exec(text)
  const rest = text.replace(/Weight [\d.]+ kg,?\s*/i, '').trim()
  return { weightKg: weight ? Number(weight[1]) : null, feeding: rest ? rest[0].toUpperCase() + rest.slice(1) : '—', cord: '—', jaundice: '—', tempC: null }
}

function postnatalView(state, p) {
  return (p?.pncVisits ?? []).map((v) => ({
    id: v.id,
    key: v.key,
    date: v.time ? `${v.date}T${v.time}` : v.date,
    clinician: staffName(state, v.clinicianId),
    mother: {
      bp: `${v.bp?.[0]}/${v.bp?.[1]}`,
      tempC: v.tempC,
      weightKg: v.weightKg,
      uterus: v.uterus,
      bleeding: v.bleeding,
      perineum: v.perineum,
      breasts: v.breasts,
      mood: v.mood ?? (v.epds !== null && v.epds !== undefined ? `Depression screen (EPDS) ${v.epds}` : '—'),
      hb: v.hb,
    },
    baby: babyFrom(v),
    familyPlanning: v.familyPlanning || null,
    note: v.note,
  }))
}

/** A child's doses as the family app lists them: the KEPI schedule plus any optional vaccines added. */
export function dosesFor(state, p) {
  const records = state.doses.filter((d) => d.patientId === p.id)
  const appts = state.appointments.filter((a) => a.patientId === p.id && a.status !== 'cancelled')
  const kepi = buildSchedule(p.dob, records).map((row) => {
    const e = SCHEDULE_BY_KEY[row.key]
    const r = row.record
    const appt = r
      ? appts.find((a) => a.doseKeys.includes(row.key) && a.start.slice(0, 10) === r.givenOn)
      : appts.find((a) => a.doseKeys.includes(row.key) && a.status === 'upcoming')
    const infantVisit = ['birth', '6w', '10w', '14w'].includes(e.visit)
    const group = r && infantVisit ? `${e.visit}-${r.givenOn}` : null
    return {
      id: `${p.id}-${row.key}`,
      childId: p.id,
      vaccineId: e.vaccine,
      doseNumber: e.dose,
      ageLabel: e.ageLabel === 'At birth' ? 'Birth' : e.ageLabel,
      ...doseNames(e.vaccine, e.dose),
      optional: false,
      dueOn: row.dueOn,
      givenOn: r?.givenOn ?? null,
      batch: r?.batch ?? null,
      givenBy: r?.givenBy ?? null,
      facilityLabel: r?.facility ?? null,
      appointmentId: appt?.id ?? null,
      tableGroup: group,
      cardGroup: group,
    }
  })
  const optional = state.optionalDoses
    .filter((d) => d.patientId === p.id)
    .map((d) => ({
      id: d.id,
      childId: p.id,
      vaccineId: d.vaccineId,
      doseNumber: d.doseNumber,
      ageLabel: d.ageLabel,
      ...doseNames(d.vaccineId, d.doseNumber),
      optional: true,
      dueOn: d.dueOn,
      givenOn: d.givenOn,
      batch: d.batch,
      givenBy: d.givenBy,
      facilityLabel: d.facilityLabel,
      appointmentId: null,
      tableGroup: null,
      cardGroup: null,
    }))
  return [...kepi, ...optional].filter((d) => vaccines[d.vaccineId])
}

function locationFor(a, maternal) {
  if (a.location) return a.location
  if (!a.room) return null
  if (maternal || a.room === 'Room 4') return a.visitType === 'antenatal' ? `Antenatal clinic, ${a.room}` : `Maternity clinic, ${a.room}`
  return `Child Health Clinic, ${a.room}`
}

function visitTypeOf(a, maternal) {
  if (a.visitType) return a.visitType
  if (maternal) return 'antenatal'
  if (a.doseKeys?.length) return 'vaccination'
  return /growth|nutrition|weight/i.test(a.reason) ? 'growth' : /cough|fever|rash|diarrh|review|sick/i.test(a.reason) ? 'sick' : 'general'
}

function appointmentsFor(state, account, childIds, motherId) {
  const mine = new Set(childIds)
  const list = []
  for (const a of state.appointments) {
    const maternal = Boolean(motherId) && a.patientId === motherId
    if (!maternal && !mine.has(a.patientId)) continue
    list.push({
      id: a.id,
      childId: maternal ? 'me' : a.patientId,
      start: a.start,
      title: a.reasonLong || a.reason,
      clinicianId: a.clinicianId,
      visitType: visitTypeOf(a, maternal),
      facilityId: state.facility.id,
      location: locationFor(a, maternal),
      ref: a.ref ?? null,
      note: a.noteForCaregiver || null,
      status: STATUS[a.status] ?? 'scheduled',
      doseIds: (a.doseKeys ?? []).map((k) => `${a.patientId}-${k}`),
      ...(a.summary ? { summary: a.summary } : {}),
    })
  }
  for (const r of state.requests) {
    if (r.accountId !== account.id || r.status === 'confirmed') continue
    const maternal = Boolean(motherId) && r.patientId === motherId
    const base = {
      id: r.id,
      childId: maternal ? 'me' : r.patientId,
      start: r.preferredStart,
      title: r.title ?? TITLES[r.visitType] ?? 'Visit',
      clinicianId: r.clinicianId,
      visitType: r.visitType,
      facilityId: state.facility.id,
      location: null,
      ref: r.ref ?? null,
      note: r.note ?? null,
      requestedAt: r.requestedAt,
      rescheduleOf: r.rescheduleOf ?? null,
      doseIds: [],
    }
    if (r.status === 'pending' || r.status === 'proposed') {
      list.push({
        ...base,
        status: 'requested',
        ...(r.proposal ? { proposal: { start: r.proposal.start, clinicianId: r.proposal.clinicianId, note: r.proposal.note, at: r.proposal.at } } : {}),
      })
    } else {
      list.push({ ...base, status: r.status === 'declined' ? 'declined' : 'cancelled', summary: r.summary ?? r.declineReason ?? null })
    }
  }
  return list
}

function conversationsFor(state, account) {
  return state.conversations
    .filter((c) => c.accountId === account.id)
    .map((c) => ({
      id: c.id,
      clinicianId: c.ownerId,
      childId: c.type === 'mother' ? 'me' : c.patientId,
      messages: c.messages.map((m) => ({
        id: m.id,
        from: m.from === 'me' ? 'clinician' : 'caregiver',
        sentAt: m.sentAt,
        body: m.body,
        read: m.from === 'me' ? Boolean(m.read) : true,
        ...(m.attachmentName ? { attachmentName: m.attachmentName } : {}),
      })),
    }))
}

/** Records the family can link from "Add a child" (patient ID + date of birth). */
function registry(state) {
  const accounts = new Set(state.accounts.map((a) => a.id))
  return state.patients
    .filter((p) => p.patientId)
    .map((p) => {
      const linked = p.caregivers.find((c) => accounts.has(c.id))
      return {
        patientId: p.patientId,
        dob: p.dob,
        firstName: p.firstName,
        lastName: p.lastName,
        sex: p.sex,
        facilityId: p.facilityId ?? state.facility.id,
        birthWeightKg: p.birthWeightKg,
        birthLengthCm: p.birthLengthCm,
        linkedTo: linked ? { accountId: linked.id, childId: p.id } : null,
        _id: p.id,
      }
    })
}

/** Builds the family app's account data for `accountId`. */
export function familyDb(state, accountId) {
  const account = state.accounts.find((a) => a.id === accountId)
  if (!account) return null
  const m = account.motherId ? state.mothers.find((x) => x.id === account.motherId) : null
  const kids = childrenOf(state, account.id)
  const p = m?.pregnancy ?? null
  const shareLinks = {}
  for (const s of state.shareLinks) if (s.accountId === account.id) shareLinks[s.patientId] = { url: s.url, createdOn: s.createdOn, expiresOn: s.expiresOn }
  const db = {
    caregiver: {
      id: account.id,
      firstName: account.firstName,
      lastName: account.lastName,
      fullName: account.fullName,
      relationship: account.relationship,
      phone: account.phone,
      email: account.email ?? '',
      county: account.county,
      memberSince: account.memberSince,
      avatarTone: account.avatarTone,
    },
    mother: motherRecord(state, account, m),
    pregnancy: pregnancyView(state, p),
    delivery: deliveryView(state, p?.delivery),
    postnatalVisits: postnatalView(state, p),
    maternalVaccines: (m?.td ?? []).map((x) => ({
      id: x.id,
      vaccine: 'td',
      dose: x.dose,
      givenOn: x.givenOn,
      batch: x.batch,
      givenBy: x.givenBy,
      note: x.note ?? '',
      earliestOn: x.earliestOn,
      dueOn: x.dueOn,
      latestOn: x.latestOn,
    })),
    children: kids.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      sex: c.sex,
      dob: c.dob,
      patientId: c.patientId,
      facilityId: c.facilityId ?? state.facility.id,
      bornAt: c.bornAt ?? '',
      birthWeightKg: c.birthWeightKg,
      birthLengthCm: c.birthLengthCm ?? null,
      mainClinicianId: c.mainClinicianId ?? null,
      tone: familyTone(c.tone),
      recordStatus: c.recordStatus ?? 'linked',
      allergies: (c.allergies ?? []).map((a) => ({ id: a.id, substance: a.substance, reaction: a.reaction ?? '', recordedOn: a.recordedOn ?? null })),
      medicines: (c.medicines ?? []).map((x) => ({ id: x.id, name: x.name, directions: x.directions ?? x.dose ?? '', since: x.since ?? null })),
    })),
    doses: kids.flatMap((c) => dosesFor(state, c)),
    measurements: state.measurements
      .filter((x) => kids.some((c) => c.id === x.patientId))
      .map((x) => ({
        id: x.id,
        childId: x.patientId,
        date: x.date,
        weightKg: x.weightKg,
        heightCm: x.heightCm,
        measuredBy: x.by,
        facilityId: x.by === 'Entered by you' ? null : (x.facilityId ?? state.facility.id),
      })),
    appointments: appointmentsFor(
      state,
      account,
      kids.map((c) => c.id),
      m?.id,
    ),
    conversations: conversationsFor(state, account),
    notifications: state.familyNotifications.filter((n) => n.accountId === account.id).map(({ accountId: _a, ...n }) => n),
    settings: structuredClone(account.settings),
    consent: { ...account.consent },
    shareLinks,
    facilities: [familyFacility(state)],
    clinicians: familyClinicians(state),
  }
  Object.defineProperty(db, 'clinicRegistry', { get: () => registry(state), enumerable: false })
  Object.defineProperty(db, 'clinicAppointments', { value: state.appointments, enumerable: false })
  return db
}
