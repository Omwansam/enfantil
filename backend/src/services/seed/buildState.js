/**
 * Builds the demo data for the shared database from the two apps' demo data:
 * the clinician portal's facility records (248 infants, 8 mothers, schedule,
 * requests, messages) plus what only the family app had (the two mothers'
 * accounts, settings, their notifications and threads with other staff,
 * past visits and extra details). Ids from the family data are mapped to
 * the shared ones (Njeri's son is `baraka-m`, Amani's MR visit `a-1109-amani`).
 */
import bcrypt from 'bcryptjs'
import { setToday as setClinicToday } from '../clinic/utils/dates.js'
import { setToday as setFamilyToday } from '../family/utils/dates.js'

const CLINIC_TODAY = new Date(2026, 10, 9, 9, 45) // Monday 9 Nov 2026, the portal design's "today"
const FAMILY_TODAY = new Date(2026, 10, 8, 20, 30) // Sunday evening, the family app design's "now"

const ACCOUNT_MOTHER = { 'cg-wanjiru': 'm-wanjiru', 'cg-njeri': 'm-njeri' }
const CHILD_ID = { amani: 'amani', baraka: 'baraka-m', me: 'me' }
const APPOINTMENT_ID = {
  'appt-a-1109': 'a-1109-amani',
  'appt-a-0209': 'a-0209-amani',
  'appt-n-anc3': 'a-1107-njeri',
  'appt-n-anc4': 'a-1205-njeri',
}
const CONVERSATION_ID = { 'conv-otieno': 'c-wanjiru' }
const STAFF_SEES = { 'achieng-otieno': ['child'], 'grace-wanjala': ['me'], 'joseph-mwangi': ['me', 'child'] }

const childId = (id) => CHILD_ID[id] ?? id
const doseId = (id) => (id?.startsWith('baraka-') ? id.replace(/^baraka-/, 'baraka-m-') : id)

function remapTarget(target) {
  if (!target) return null
  const out = { ...target }
  if (out.appointmentId) out.appointmentId = APPOINTMENT_ID[out.appointmentId] ?? out.appointmentId
  if (out.conversationId) out.conversationId = CONVERSATION_ID[out.conversationId] ?? out.conversationId
  if (out.doseId) out.doseId = doseId(out.doseId)
  return out
}

function roomFrom(location, maternal) {
  const m = /Room \d/.exec(location ?? '')
  if (m) return m[0]
  return maternal ? 'Room 4' : 'Room 2'
}

const appointmentStatus = { scheduled: 'upcoming', completed: 'completed', cancelled: 'cancelled' }

/**
 * Moves every date in the demo data by whole weeks so the design's "today"
 * (Mon 9 Nov 2026) lands in the current week. Weekdays stay the same, so
 * Saturday-morning clinics and closed Sundays still line up.
 */
export function shiftToThisWeek(state, now = new Date()) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const weeks = Math.round((day(now) - day(CLINIC_TODAY)) / (7 * 86_400_000))
  if (!weeks) return 0
  const days = weeks * 7
  const pad = (x) => String(x).padStart(2, '0')
  const shift = (value) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value)
    if (!m) return value
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days, Number(m[4] ?? 0), Number(m[5] ?? 0))
    const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
    return m[4] ? `${date}T${pad(dt.getHours())}:${pad(dt.getMinutes())}` : date
  }
  const walk = (node) => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i += 1) node[i] = typeof node[i] === 'string' ? shift(node[i]) : walk(node[i])
      return node
    }
    if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        if (k === 'secrets') continue
        node[k] = typeof node[k] === 'string' ? shift(node[k]) : walk(node[k])
      }
    }
    return node
  }
  walk(state)
  return weeks
}

export async function buildDemoState() {
  // The demo files work out ages, due dates and "given until today" from TODAY.
  setClinicToday(CLINIC_TODAY)
  setFamilyToday(FAMILY_TODAY)
  const clinic = await import('../clinic/data/demoData.js')
  const family = await import('../family/data/demoData.js')
  const base = clinic.createInitialData()
  const fam = family.createInitialData()

  const state = {
    facility: { ...base.facility, county: 'Kiambu' },
    rooms: base.rooms,
    staff: base.staff.map((s) => ({ ...s, sees: STAFF_SEES[s.id] ?? [] })),
    deskStaff: [{ id: 'tfh-reception', name: 'Tumaini Reception', shortName: 'Reception', title: 'Clinic staff', initials: 'TR', tone: 'slate', sees: [] }],
    accounts: [],
    patients: base.patients,
    doses: base.doses,
    optionalDoses: [],
    measurements: base.measurements.map((m) => ({ ...m, facilityId: 'tfh' })),
    appointments: base.appointments,
    mothers: base.mothers,
    requests: base.requests,
    staffNotifications: base.staffNotifications.map((n) => ({ ...n, readBy: n.read ? [...n.to] : [] })),
    familyNotifications: [],
    visitNotes: base.visitNotes,
    conversations: base.conversations.map((c) => ({ ...c, ownerId: 'achieng-otieno', messages: c.messages.map((m) => ({ ...m, read: true })) })),
    reminders: [],
    remindersSentBeforeToday: base.remindersSentBeforeToday,
    coverage: base.coverage,
    shareLinks: [],
    patientSerial: base.patientSerial,
    secrets: { staff: {}, accounts: {} },
  }
  for (const s of state.staffNotifications) delete s.read

  // ------------------------------------------------------------ logins
  const clinicPassword = await bcrypt.hash('Clinic2026!', 12)
  state.secrets.staff['achieng-otieno'] = clinicPassword
  state.secrets.staff['grace-wanjala'] = clinicPassword

  const P = Object.fromEntries(state.patients.map((p) => [p.id, p]))
  const M = Object.fromEntries(state.mothers.map((m) => [m.id, m]))

  // ------------------------------------------------- patients: ids & details
  for (const p of state.patients) {
    p.allergies = (p.allergies ?? []).map((a, i) => ({ id: a.id ?? `al-${p.id}-${i + 1}`, ...a }))
    p.medicines = (p.medicines ?? []).map((x, i) => ({ id: x.id ?? `med-${p.id}-${i + 1}`, ...x }))
    p.contactLog = (p.contactLog ?? []).map((c, i) => ({ id: c.id ?? `ca-${p.id}-${i + 1}`, ...c }))
    p.recordStatus = 'linked'
    p.bornAt = p.bornAt ?? null
    p.mainClinicianId = p.mainClinicianId ?? null
  }
  Object.assign(P.amani, {
    bornAt: 'Tumaini Family Hospital',
    birthLengthCm: 49,
    mainClinicianId: 'achieng-otieno',
    allergies: [{ id: 'al-egg', substance: 'Egg', reaction: 'mild skin rash', recordedOn: '2026-09-14', by: 'Dr. Achieng Otieno', at: '2026-09-14T11:50', source: 'clinician' }],
    medicines: [{ id: 'med-vitd', name: 'Vitamin D drops', dose: 'Once daily', directions: 'Once daily', since: '2026-03-23' }],
  })
  Object.assign(P['baraka-m'], { bornAt: 'Tumaini Family Hospital', birthLengthCm: 50, mainClinicianId: 'achieng-otieno' })

  // ------------------------------------------------ family accounts & data
  for (const [accountId, acct] of Object.entries(fam.accounts)) {
    const motherId = ACCOUNT_MOTHER[accountId]
    const c = acct.caregiver
    const cred = fam.credentials.find((x) => x.userId === accountId)
    state.secrets.accounts[accountId] = await bcrypt.hash(cred.password, 12)
    state.accounts.push({
      id: accountId,
      motherId,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: c.fullName,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email,
      county: c.county,
      memberSince: c.memberSince,
      avatarTone: c.avatarTone,
      tracking: acct.mother.tracking,
      settings: structuredClone(acct.settings),
      consent: structuredClone(acct.consent),
    })

    // The mother's record: keep the portal's clinical record, add what the app shows her.
    const m = M[motherId]
    const famPreg = acct.pregnancy
    for (const v of m.pregnancy?.ancVisits ?? []) {
      const fv = famPreg?.ancVisits.find((x) => x.contact === v.contact && x.date === v.date)
      if (fv?.noteForMother) v.noteForMother = fv.noteForMother
    }
    if (m.pregnancy?.delivery && acct.delivery) m.pregnancy.delivery.place = acct.delivery.place
    for (const v of m.pregnancy?.pncVisits ?? []) {
      const fv = acct.postnatalVisits.find((x) => x.key === v.key)
      if (!fv) continue
      Object.assign(v, {
        time: fv.date.slice(11, 16) || null,
        uterus: fv.mother.uterus,
        bleeding: fv.mother.bleeding,
        perineum: fv.mother.perineum,
        breasts: fv.mother.breasts,
        mood: fv.mother.mood,
        babyDetails: { ...fv.baby },
        familyPlanning: fv.familyPlanning ?? '',
        note: fv.note,
      })
    }
    for (const x of m.td) {
      const fx = acct.maternalVaccines.find((y) => y.dose === x.dose)
      if (fx?.note) x.note = fx.note
    }
    for (const h of m.history) {
      const fh = acct.mother.pregnancyHistory.find((y) => y.year === h.year)
      Object.assign(h, { place: fh?.place ?? 'Tumaini Family Hospital', by: fh?.updatedBy ?? null, at: fh?.updatedAt ?? null })
    }

    // Visits only the family app had (past visits, postnatal checks, earlier ANC visits).
    for (const a of acct.appointments) {
      if (a.status === 'requested' || a.status === 'declined') continue
      const id = APPOINTMENT_ID[a.id]
      const shared = id ? state.appointments.find((x) => x.id === id) : null
      if (shared) {
        Object.assign(shared, { ref: a.ref, location: a.location, ...(a.summary ? { summary: a.summary } : {}) })
        continue
      }
      const maternal = a.childId === 'me'
      const pid = maternal ? motherId : childId(a.childId)
      state.appointments.push({
        id: a.id,
        patientId: pid,
        start: a.start,
        durationMin: maternal ? 20 : 15,
        reason: a.title,
        reasonLong: a.title,
        clinicianId: a.clinicianId,
        room: roomFrom(a.location, maternal),
        status: appointmentStatus[a.status] ?? 'completed',
        visitType: a.visitType,
        doseKeys: (a.doseIds ?? []).map((d) => d.replace(`${a.childId}-`, '')),
        noteForCaregiver: a.note ?? '',
        clinicalNote: '',
        cancelReason: a.status === 'cancelled' ? 'Caregiver asked to cancel' : '',
        history: [],
        createdAt: a.start,
        ref: a.ref,
        location: a.location,
        ...(a.summary ? { summary: a.summary } : {}),
      })
    }

    // Requests: add the family's titles, refs and the declined Sunday request.
    for (const a of acct.appointments) {
      if (a.status !== 'requested' && a.status !== 'declined') continue
      let r = state.requests.find((x) => x.id === a.id)
      if (!r) {
        const pid = a.childId === 'me' ? motherId : childId(a.childId)
        r = {
          id: a.id,
          patientId: pid,
          forLabel: a.childId === 'me' ? `${c.fullName} (herself)` : `${P[pid].firstName} ${P[pid].lastName}`,
          requestedBy: { name: c.fullName, relationship: a.childId === 'me' ? 'Patient' : c.relationship, phone: c.phone, motherId },
          visitType: a.visitType,
          preferredStart: a.start,
          clinicianId: a.clinicianId,
          note: a.note,
          requestedAt: a.requestedAt,
          status: a.status === 'declined' ? 'declined' : 'pending',
          ...(a.status === 'declined'
            ? { declineReason: 'The clinic is closed at that time', declineNote: a.summary, respondedAt: '2026-10-30T16:00' }
            : {}),
        }
        state.requests.push(r)
      }
      Object.assign(r, { accountId, ref: a.ref, title: a.title, ...(a.summary ? { summary: a.summary } : {}) })
    }

    // Notifications in the app.
    for (const n of acct.notifications) {
      state.familyNotifications.push({
        id: n.id,
        accountId,
        type: n.type,
        childId: childId(n.childId),
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        read: n.read,
        target: remapTarget(n.target),
      })
    }

    // Message threads: the portal's thread with Dr. Otieno, plus the ones with other staff.
    for (const conv of acct.conversations) {
      const sharedId = CONVERSATION_ID[conv.id]
      if (sharedId) {
        const shared = state.conversations.find((x) => x.id === sharedId)
        shared.accountId = accountId
        for (const msg of shared.messages) {
          const twin = conv.messages.find((y) => y.sentAt === msg.sentAt && y.body === msg.body)
          msg.read = msg.from === 'me' ? (twin?.read ?? false) : true
        }
        continue
      }
      const maternal = conv.childId === 'me'
      state.conversations.push({
        id: conv.id,
        type: maternal ? 'mother' : 'caregiver',
        ownerId: conv.clinicianId,
        accountId,
        ...(maternal ? { motherId } : { patientId: childId(conv.childId), caregiverId: accountId }),
        unread: 0,
        messages: conv.messages.map((y) => ({
          id: `${conv.id}-${y.id}`,
          from: y.from === 'clinician' ? 'me' : 'them',
          sentAt: y.sentAt,
          body: y.body,
          read: y.from === 'clinician' ? y.read : true,
        })),
      })
    }
  }

  // Requests from parents without an account still show in the portal.
  for (const r of state.requests) {
    r.accountId ??= state.accounts.find((a) => a.motherId && a.motherId === r.requestedBy?.motherId)?.id ?? null
    r.ref ??= `TFH-R-${20400 + state.requests.indexOf(r)}`
  }

  // Appointment references shown to families.
  let ref = 12000
  for (const a of state.appointments) a.ref ??= `TFH-A-${(ref += 1)}`

  return state
}
