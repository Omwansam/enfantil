/**
 * Maps the in-memory state (the shape the portal and family services work
 * on) to database rows and back.
 *
 *   flatten(state, previousRows) → { table: Map(id → row) }
 *   inflate(rowsByTable)         → state
 *
 * Dates travel as strings in the state ('2026-11-09', '2026-11-09T10:00',
 * hospital wall-clock time) and as DATE / TIMESTAMP(0) columns in Postgres.
 */
import { Prisma } from '../../../generated/prisma/client'

/** Tables in foreign-key order: parents before children. Deletes run in reverse. */
export const TABLES = [
  'facility',
  'room',
  'staff',
  'mother',
  'account',
  'pregnancy',
  'ancVisit',
  'delivery',
  'postnatalVisit',
  'tdDose',
  'pregnancyHistory',
  'patient',
  'caregiver',
  'healthItem',
  'auditEntry',
  'contactAttempt',
  'dose',
  'optionalDose',
  'measurement',
  'shareLink',
  'appointment',
  'visitNote',
  'request',
  'conversation',
  'message',
  'staffNotification',
  'staffNotificationRecipient',
  'familyNotification',
  'reminder',
  'coverageReport',
  'coverageDose',
  'appSetting',
]

/** Json columns need Prisma.DbNull instead of null. */
const JSON_COLUMNS = { appointment: ['history'], visitNote: ['measurements'], familyNotification: ['target'], appSetting: ['value'] }

// ---------------------------------------------------------------- date codecs

const D = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00Z`) : null)
const T = (v) => {
  if (!v) return null
  const s = String(v)
  return new Date(`${s.length <= 10 ? `${s.slice(0, 10)}T00:00` : s.slice(0, 16)}:00Z`)
}
const d = (v) => (v ? v.toISOString().slice(0, 10) : null)
const t = (v) => (v ? v.toISOString().slice(0, 16) : null)

const n = (v) => (v === undefined || v === '' ? null : v)
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
const str = (v) => (v === undefined || v === null ? null : String(v))

/** Copies the non-null fields of a row into an object (keeps state objects free of empty columns). */
function compact(row, fields) {
  const out = {}
  for (const f of fields) if (row[f] !== null && row[f] !== undefined) out[f] = row[f]
  return out
}

// ------------------------------------------------------------ order (sortKey)

/**
 * Keeps each row's sortKey stable: rows that are still in order keep their key
 * (longest increasing run), new or moved rows get a key between neighbours.
 */
function sortKeys(ids, prev) {
  const known = ids.map((id) => prev.get(id))
  // Longest increasing subsequence of the known keys (patience sorting).
  const tails = []
  const tailIdx = []
  const parent = new Array(ids.length).fill(-1)
  for (let i = 0; i < ids.length; i += 1) {
    const k = known[i]
    if (k === undefined) continue
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < k) lo = mid + 1
      else hi = mid
    }
    tails[lo] = k
    tailIdx[lo] = i
    parent[i] = lo > 0 ? tailIdx[lo - 1] : -1
  }
  const keep = new Set()
  for (let i = tailIdx[tails.length - 1] ?? -1; i !== -1; i = parent[i]) keep.add(i)

  const out = new Array(ids.length)
  for (const i of keep) out[i] = known[i]
  let i = 0
  while (i < ids.length) {
    if (keep.has(i)) {
      i += 1
      continue
    }
    let j = i
    while (j < ids.length && !keep.has(j)) j += 1
    const before = i > 0 ? out[i - 1] : undefined
    const after = j < ids.length ? out[j] : undefined
    const count = j - i
    for (let k = 0; k < count; k += 1) {
      if (before === undefined && after === undefined) out[i + k] = k
      else if (before === undefined) out[i + k] = after - (count - k)
      else if (after === undefined) out[i + k] = before + k + 1
      else out[i + k] = before + ((after - before) * (k + 1)) / (count + 1)
    }
    i = j
  }
  // Gaps can only shrink so far; renumber the list if two keys get too close.
  for (let k = 1; k < out.length; k += 1) {
    if (!(out[k] - out[k - 1] > 1e-6)) return ids.map((_, x) => x)
  }
  return out
}

// ---------------------------------------------------------------- flatten

/**
 * State → rows. `prev` holds the rows last written (for stable sort keys) and
 * `secrets` the password hashes, which never live in the state itself.
 */
export function flatten(state, prev = {}) {
  const out = Object.fromEntries(TABLES.map((tbl) => [tbl, new Map()]))
  const prevKeys = (tbl) => {
    const m = new Map()
    for (const [id, row] of prev[tbl] ?? []) m.set(id, row.sortKey)
    return m
  }
  const keyCache = Object.fromEntries(TABLES.map((tbl) => [tbl, prevKeys(tbl)]))
  /** Adds rows for one ordered list (one parent's children) with stable sort keys. */
  const addList = (tbl, rows) => {
    const keys = sortKeys(
      rows.map((r) => r.id),
      keyCache[tbl],
    )
    rows.forEach((r, i) => out[tbl].set(r.id, { ...r, sortKey: keys[i] }))
  }
  const add = (tbl, row) => out[tbl].set(row.id, row)

  const secrets = state.secrets ?? { staff: {}, accounts: {} }
  const motherIds = new Set(state.mothers.map((m) => m.id))
  const subject = (id) => (motherIds.has(id) ? { patientId: null, motherId: id } : { patientId: id ?? null, motherId: null })

  const f = state.facility
  add('facility', {
    id: f.id,
    name: f.name,
    shortName: f.shortName,
    department: n(f.department),
    clinic: n(f.clinic),
    address: n(f.address),
    county: n(f.county),
    phone: n(f.phone),
    code: n(f.code),
  })
  addList(
    'room',
    state.rooms.map((r) => ({ id: r.id, label: r.label })),
  )

  const staffRow = (s, kind) => ({
    id: s.id,
    kind,
    name: s.name,
    shortName: s.shortName ?? s.name,
    title: s.title ?? '',
    staffNumber: n(s.staffId),
    email: n(s.email),
    initials: n(s.initials),
    tone: n(s.tone),
    sees: s.sees ?? [],
    passwordHash: secrets.staff[s.id] ?? null,
    active: s.active ?? true,
  })
  addList('staff', [...state.staff.map((s) => staffRow(s, 'clinician')), ...state.deskStaff.map((s) => staffRow(s, 'desk'))])

  // ------------------------------------------------------------- mothers
  const items = (list, owner, ownerId, arr) =>
    (arr ?? []).map((it, i) => ({
      id: it.id ?? `${ownerId}#${list}#${i}`,
      list,
      motherId: owner === 'mother' ? ownerId : null,
      patientId: owner === 'patient' ? ownerId : null,
      substance: n(it.substance),
      reaction: n(it.reaction) ?? (it.reaction === '' ? '' : null),
      name: n(it.name),
      detail: it.detail ?? null,
      status: n(it.status),
      directions: it.directions ?? null,
      dose: it.dose ?? null,
      code: it.code ?? null,
      recordedOn: D(it.recordedOn),
      since: D(it.since),
      by: n(it.by),
      at: T(it.at),
      source: n(it.source),
    }))
  const audit = (owner, ownerId, arr) =>
    (arr ?? []).map((a, i) => ({
      id: a.id ?? `${ownerId}#au#${i}`,
      motherId: owner === 'mother' ? ownerId : null,
      patientId: owner === 'patient' ? ownerId : null,
      at: T(a.at),
      by: a.by ?? '',
      action: a.action ?? '',
      reason: n(a.reason),
    }))

  addList(
    'mother',
    state.mothers.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      dob: D(m.dob),
      phone: m.phone,
      patientNumber: n(m.patientId),
      tone: n(m.tone),
      bloodGroup: n(m.bloodGroup),
      hasApp: Boolean(m.hasApp),
      registeredOn: D(m.registeredOn),
      nkdaBy: n(m.nkda?.by),
      nkdaAt: T(m.nkda?.at),
    })),
  )
  for (const m of state.mothers) {
    for (const list of ['allergies', 'conditions', 'medicines', 'diagnoses']) addList('healthItem', items(list, 'mother', m.id, m[list]))
    addList('auditEntry', audit('mother', m.id, m.audit))
    addList(
      'tdDose',
      (m.td ?? []).map((x) => ({
        id: x.id,
        motherId: m.id,
        dose: x.dose,
        givenOn: D(x.givenOn),
        batch: n(x.batch),
        givenBy: n(x.givenBy),
        dueOn: D(x.dueOn),
        earliestOn: D(x.earliestOn),
        latestOn: D(x.latestOn),
        note: n(x.note),
      })),
    )
    addList(
      'pregnancyHistory',
      (m.history ?? []).map((h) => ({
        id: h.id,
        motherId: m.id,
        year: h.year ?? null,
        outcome: n(h.outcome),
        delivery: n(h.delivery),
        babyWeightKg: num(h.babyWeightKg),
        gestation: n(h.gestation),
        childId: n(h.childId),
        place: n(h.place),
        by: n(h.by),
        at: T(h.at),
      })),
    )
    const p = m.pregnancy
    if (p) {
      add('pregnancy', { id: p.id, motherId: m.id, lmp: D(p.lmp), edd: D(p.edd), gravida: p.gravida ?? null, para: p.para ?? null, status: p.status })
      addList(
        'ancVisit',
        (p.ancVisits ?? []).map((v) => ({
          id: v.id,
          pregnancyId: p.id,
          contact: v.contact ?? null,
          kind: v.kind ?? (v.contact ? 'contact' : 'extra'),
          date: D(v.date),
          clinicianId: n(v.clinicianId),
          bpSystolic: num(v.bpSystolic),
          bpDiastolic: num(v.bpDiastolic),
          weightKg: num(v.weightKg),
          fundalHeightCm: num(v.fundalHeightCm),
          fetalHeartRate: num(v.fetalHeartRate),
          hb: num(v.hb),
          urineProtein: n(v.urineProtein),
          urineGlucose: n(v.urineGlucose),
          supplements: v.supplements ?? [],
          tdGiven: n(v.tdGiven),
          clinicalNote: v.clinicalNote ?? null,
          noteForMother: v.noteForMother ?? null,
          nextVisitOn: D(v.nextVisitOn),
          recordedAt: T(v.recordedAt),
        })),
      )
      if (p.delivery) {
        const x = p.delivery
        add('delivery', {
          id: p.id,
          pregnancyId: p.id,
          date: D(x.date),
          time: n(x.time),
          mode: x.mode,
          gestation: n(x.gestation),
          outcome: x.outcome,
          babySex: n(x.babySex),
          babyWeightKg: num(x.babyWeightKg),
          babyLengthCm: num(x.babyLengthCm),
          apgar: n(x.apgar),
          bloodLoss: n(x.bloodLoss),
          attendedBy: n(x.attendedBy),
          childId: n(x.childId),
          place: n(x.place),
          notes: n(x.notes),
        })
      }
      addList(
        'postnatalVisit',
        (p.pncVisits ?? []).map((v) => ({
          id: v.id,
          pregnancyId: p.id,
          key: v.key,
          date: D(v.date),
          time: n(v.time),
          clinicianId: n(v.clinicianId),
          bpSystolic: num(v.bp?.[0]),
          bpDiastolic: num(v.bp?.[1]),
          tempC: num(v.tempC),
          weightKg: num(v.weightKg),
          uterus: n(v.uterus),
          bleeding: n(v.bleeding),
          perineum: n(v.perineum),
          breasts: n(v.breasts),
          epds: num(v.epds),
          hb: num(v.hb),
          mood: n(v.mood),
          baby: v.baby ?? null,
          babyWeightKg: num(v.babyDetails?.weightKg),
          babyFeeding: n(v.babyDetails?.feeding),
          babyCord: n(v.babyDetails?.cord),
          babyJaundice: n(v.babyDetails?.jaundice),
          babyTempC: num(v.babyDetails?.tempC),
          familyPlanning: v.familyPlanning ?? null,
          note: v.note ?? null,
          nextVisitOn: D(v.nextVisitOn),
        })),
      )
    }
  }

  addList(
    'account',
    state.accounts.map((a) => ({
      id: a.id,
      motherId: n(a.motherId),
      firstName: a.firstName,
      lastName: a.lastName ?? '',
      fullName: a.fullName,
      relationship: a.relationship ?? 'Mother',
      phone: a.phone,
      email: n(a.email),
      county: n(a.county),
      memberSince: D(a.memberSince),
      avatarTone: n(a.avatarTone),
      passwordHash: secrets.accounts[a.id] ?? '',
      tracking: a.tracking ?? 'baby',
      language: a.settings?.language ?? 'en',
      remindersSms: a.settings?.reminders?.sms ?? true,
      remindersPush: a.settings?.reminders?.push ?? true,
      remindersWeeklyEmail: a.settings?.reminders?.weeklyEmail ?? false,
      remindersTiming: a.settings?.reminders?.timing ?? '1 day before',
      consentSince: D(a.consent?.since),
      consentRecordedBy: n(a.consent?.recordedBy),
      consentLastViewed: T(a.consent?.lastViewed),
    })),
  )

  // ------------------------------------------------------------ patients
  addList(
    'patient',
    state.patients.map((p) => ({
      id: p.id,
      facilityId: p.facilityId ?? 'tfh',
      firstName: p.firstName,
      lastName: p.lastName,
      sex: p.sex,
      dob: D(p.dob),
      patientNumber: n(p.patientId),
      tone: n(p.tone),
      birthWeightKg: num(p.birthWeightKg),
      birthLengthCm: num(p.birthLengthCm),
      birthNotificationNo: p.birthNotificationNo ?? null,
      registeredOn: D(p.registeredOn),
      bornAt: n(p.bornAt),
      mainClinicianId: n(p.mainClinicianId),
      recordStatus: p.recordStatus ?? 'linked',
      consentVerbal: p.consent ? Boolean(p.consent.verbal) : null,
      consentRecordedAt: D(p.consent?.recordedAt),
      pastVisits: p.pastVisits ?? [],
    })),
  )
  for (const p of state.patients) {
    addList(
      'caregiver',
      (p.caregivers ?? []).map((c) => ({
        id: `${p.id}:${c.id}`,
        caregiverId: c.id,
        patientId: p.id,
        name: c.name,
        relationship: c.relationship ?? '',
        phone: c.phone ?? '',
        email: n(c.email),
        primary: Boolean(c.primary),
        hasApp: Boolean(c.hasApp),
        motherId: n(c.motherId),
        invitedAt: D(c.invitedAt),
        tone: n(c.tone),
      })),
    )
    for (const list of ['allergies', 'conditions', 'medicines', 'diagnoses']) addList('healthItem', items(list, 'patient', p.id, p[list]))
    addList('auditEntry', audit('patient', p.id, p.audit))
    addList(
      'contactAttempt',
      (p.contactLog ?? []).map((c, i) => ({
        id: c.id ?? `${p.id}#ca#${i}`,
        patientId: p.id,
        type: c.type,
        at: T(c.at),
        replied: c.replied ?? null,
        note: n(c.note),
      })),
    )
  }

  addList(
    'dose',
    state.doses.map((x) => ({
      id: x.id,
      patientId: x.patientId,
      key: x.key,
      givenOn: D(x.givenOn),
      batch: n(x.batch),
      site: n(x.site),
      route: n(x.route),
      givenBy: n(x.givenBy),
      givenById: n(x.givenById),
      doseNumber: str(x.doseNumber),
      facility: n(x.facility),
      notes: x.notes ?? null,
      seq: x.seq ?? null,
      recordedAt: T(x.recordedAt),
    })),
  )
  addList(
    'optionalDose',
    state.optionalDoses.map((x) => ({
      id: x.id,
      patientId: x.patientId,
      vaccineId: x.vaccineId,
      doseNumber: x.doseNumber ?? null,
      ageLabel: n(x.ageLabel),
      dueOn: D(x.dueOn),
      givenOn: D(x.givenOn),
      batch: n(x.batch),
      givenBy: n(x.givenBy),
      facilityLabel: n(x.facilityLabel),
      addedAt: T(x.addedAt),
    })),
  )
  addList(
    'measurement',
    state.measurements.map((m) => ({
      id: m.id,
      patientId: m.patientId,
      date: D(m.date),
      weightKg: num(m.weightKg),
      heightCm: num(m.heightCm),
      muacCm: num(m.muacCm),
      tempC: num(m.tempC),
      by: n(m.by),
      facilityId: n(m.facilityId),
    })),
  )
  for (const s of state.shareLinks) {
    add('shareLink', {
      id: `${s.accountId}:${s.patientId}`,
      accountId: s.accountId,
      patientId: s.patientId,
      url: s.url,
      createdOn: D(s.createdOn),
      expiresOn: D(s.expiresOn),
    })
  }

  // -------------------------------------------------------- appointments
  addList(
    'appointment',
    state.appointments.map((a) => ({
      id: a.id,
      ...subject(a.patientId),
      start: T(a.start),
      durationMin: a.durationMin ?? 15,
      reason: a.reason ?? '',
      reasonLong: n(a.reasonLong),
      clinicianId: n(a.clinicianId),
      room: n(a.room),
      status: a.status,
      visitType: n(a.visitType),
      doseKeys: a.doseKeys ?? [],
      noteForCaregiver: a.noteForCaregiver ?? null,
      clinicalNote: a.clinicalNote ?? null,
      cancelReason: a.cancelReason ?? null,
      history: a.history ?? [],
      ref: n(a.ref),
      location: n(a.location),
      summary: n(a.summary),
      createdAt: T(a.createdAt),
    })),
  )
  addList(
    'visitNote',
    state.visitNotes.map((v) => ({
      id: v.id,
      appointmentId: v.appointmentId,
      patientId: v.patientId,
      authorId: v.authorId,
      status: v.status,
      savedAt: T(v.savedAt),
      signedAt: T(v.signedAt),
      measurements: v.measurements ?? null,
      history: v.history ?? null,
      nutritionStatus: v.nutritionStatus ?? null,
      plan: v.plan ?? null,
      followUpOn: D(v.followUpOn),
      diagnosis: v.diagnosis ?? null,
      summary: v.summary ?? null,
      caregiverSummary: v.caregiverSummary ?? null,
      shareWithCaregiver: v.shareWithCaregiver ?? true,
    })),
  )
  addList(
    'request',
    state.requests.map((r) => ({
      id: r.id,
      ...subject(r.patientId),
      accountId: n(r.accountId),
      forLabel: n(r.forLabel),
      requestedByName: r.requestedBy?.name ?? '',
      requestedByRelationship: n(r.requestedBy?.relationship),
      requestedByPhone: n(r.requestedBy?.phone),
      requestedByMotherId: n(r.requestedBy?.motherId),
      visitType: r.visitType,
      title: n(r.title),
      preferredStart: T(r.preferredStart),
      clinicianId: n(r.clinicianId),
      note: n(r.note),
      requestedAt: T(r.requestedAt),
      status: r.status,
      proposalStart: T(r.proposal?.start),
      proposalClinicianId: n(r.proposal?.clinicianId),
      proposalNote: r.proposal ? (r.proposal.note ?? '') : null,
      proposalAt: T(r.proposal?.at),
      proposalBy: n(r.proposal?.by),
      confirmedStart: T(r.confirmedStart),
      confirmedClinicianId: n(r.confirmedClinicianId),
      appointmentId: n(r.appointmentId),
      respondedAt: T(r.respondedAt),
      declineReason: n(r.declineReason),
      declineNote: n(r.declineNote),
      ref: n(r.ref),
      rescheduleOf: n(r.rescheduleOf),
      summary: n(r.summary),
    })),
  )

  // ------------------------------------------------------------ messages
  addList(
    'conversation',
    state.conversations.map((c) => ({
      id: c.id,
      type: c.type,
      ownerId: c.ownerId,
      accountId: n(c.accountId),
      patientId: n(c.patientId),
      caregiverId: n(c.caregiverId),
      motherId: n(c.motherId),
      staffId: n(c.staffId),
      staffName: n(c.staffName),
      staffRole: n(c.staffRole),
      initials: n(c.initials),
      tone: n(c.tone),
      unread: c.unread ?? 0,
    })),
  )
  for (const c of state.conversations) {
    addList(
      'message',
      c.messages.map((m) => ({
        id: m.id,
        conversationId: c.id,
        from: m.from,
        sentAt: T(m.sentAt),
        body: m.body ?? '',
        read: m.read ?? true,
        attachmentName: n(m.attachmentName),
      })),
    )
  }

  // ------------------------------------------------------- notifications
  addList(
    'staffNotification',
    state.staffNotifications.map((x) => ({ id: x.id, type: x.type, title: x.title, body: x.body ?? '', at: T(x.at), link: n(x.link) })),
  )
  for (const x of state.staffNotifications) {
    for (const staffId of x.to ?? []) {
      add('staffNotificationRecipient', {
        id: `${x.id}:${staffId}`,
        notificationId: x.id,
        staffId,
        read: (x.readBy ?? []).includes(staffId),
      })
    }
  }
  addList(
    'familyNotification',
    state.familyNotifications.map((x) => ({
      id: x.id,
      accountId: x.accountId,
      type: x.type,
      childId: x.childId ?? 'me',
      title: x.title,
      body: x.body ?? '',
      createdAt: T(x.createdAt),
      read: Boolean(x.read),
      target: x.target ?? null,
    })),
  )

  // ------------------------------------------------------- outreach etc.
  addList(
    'reminder',
    state.reminders.map((r) => ({ id: r.id, patientId: r.patientId, caregiverId: n(r.caregiverId), channel: r.channel, sentAt: T(r.sentAt) })),
  )
  addList(
    'coverageReport',
    state.coverage.map((r) => ({
      id: r.id,
      label: r.label,
      registeredUnder2: r.registeredUnder2,
      authorised: r.authorised,
      fullyImmunized12m: r.fullyImmunized12m,
      overdueChildren: r.overdueChildren,
      overdueOver30: r.overdueOver30,
    })),
  )
  for (const r of state.coverage) {
    addList(
      'coverageDose',
      r.doses.map((x, i) => ({ id: `${r.id}:${i}`, reportId: r.id, name: x.name, value: x.value })),
    )
  }
  add('appSetting', { id: 'patientSerial', value: state.patientSerial })
  add('appSetting', { id: 'remindersSentBeforeToday', value: state.remindersSentBeforeToday })
  return out
}

// ---------------------------------------------------------------- inflate

const bySort = (a, b) => a.sortKey - b.sortKey
function groupBy(rows, key) {
  const m = new Map()
  for (const r of rows) {
    const k = r[key]
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  for (const list of m.values()) list.sort(bySort)
  return m
}

function item(row) {
  const it = compact(row, ['id', 'substance', 'reaction', 'name', 'detail', 'status', 'directions', 'dose', 'code', 'by', 'source'])
  if (row.recordedOn) it.recordedOn = d(row.recordedOn)
  if (row.since) it.since = d(row.since)
  if (row.at) it.at = t(row.at)
  return it
}

function auditItem(row) {
  return { id: row.id, at: t(row.at), by: row.by, action: row.action, reason: row.reason ?? '' }
}

/** Rows → state. `rows` maps each table name to its array of rows. */
export function inflate(rows) {
  const s = {}
  const f = rows.facility[0]
  s.facility = compact(f, ['id', 'name', 'shortName', 'department', 'clinic', 'address', 'county', 'phone', 'code'])
  s.rooms = [...rows.room].sort(bySort).map((r) => ({ id: r.id, label: r.label }))
  s.secrets = { staff: {}, accounts: {} }

  const staff = [...rows.staff].sort(bySort)
  const staffObj = (r) => {
    if (r.passwordHash) s.secrets.staff[r.id] = r.passwordHash
    return {
      id: r.id,
      name: r.name,
      shortName: r.shortName,
      title: r.title,
      staffId: r.staffNumber,
      email: r.email,
      initials: r.initials,
      tone: r.tone,
      sees: r.sees,
    }
  }
  s.staff = staff.filter((r) => r.kind === 'clinician').map(staffObj)
  s.deskStaff = staff.filter((r) => r.kind === 'desk').map(staffObj)

  const itemsBy = { mother: groupBy(rows.healthItem.filter((r) => r.motherId), 'motherId'), patient: groupBy(rows.healthItem.filter((r) => r.patientId), 'patientId') }
  const auditBy = { mother: groupBy(rows.auditEntry.filter((r) => r.motherId), 'motherId'), patient: groupBy(rows.auditEntry.filter((r) => r.patientId), 'patientId') }
  const lists = (owner, id) => {
    const all = itemsBy[owner].get(id) ?? []
    return Object.fromEntries(['allergies', 'conditions', 'medicines', 'diagnoses'].map((l) => [l, all.filter((r) => r.list === l).map(item)]))
  }

  const pregByMother = new Map(rows.pregnancy.map((p) => [p.motherId, p]))
  const ancBy = groupBy(rows.ancVisit, 'pregnancyId')
  const pncBy = groupBy(rows.postnatalVisit, 'pregnancyId')
  const deliveryBy = new Map(rows.delivery.map((x) => [x.pregnancyId, x]))
  const tdBy = groupBy(rows.tdDose, 'motherId')
  const historyBy = groupBy(rows.pregnancyHistory, 'motherId')

  s.mothers = [...rows.mother].sort(bySort).map((m) => {
    const p = pregByMother.get(m.id)
    const x = p ? deliveryBy.get(p.id) : null
    return {
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      dob: d(m.dob),
      phone: m.phone,
      patientId: m.patientNumber,
      tone: m.tone,
      bloodGroup: m.bloodGroup,
      hasApp: m.hasApp,
      registeredOn: d(m.registeredOn),
      nkda: m.nkdaBy || m.nkdaAt ? { by: m.nkdaBy, at: t(m.nkdaAt) } : null,
      ...lists('mother', m.id),
      history: (historyBy.get(m.id) ?? []).map((h) => ({
        id: h.id,
        year: h.year,
        outcome: h.outcome,
        delivery: h.delivery,
        babyWeightKg: h.babyWeightKg,
        gestation: h.gestation,
        childId: h.childId,
        ...compact(h, ['place', 'by']),
        ...(h.at ? { at: t(h.at) } : {}),
      })),
      pregnancy: p
        ? {
            id: p.id,
            lmp: d(p.lmp),
            edd: d(p.edd),
            gravida: p.gravida,
            para: p.para,
            status: p.status,
            ancVisits: (ancBy.get(p.id) ?? []).map((v) => ({
              id: v.id,
              contact: v.contact,
              kind: v.kind,
              date: d(v.date),
              clinicianId: v.clinicianId,
              bpSystolic: v.bpSystolic,
              bpDiastolic: v.bpDiastolic,
              weightKg: v.weightKg,
              fundalHeightCm: v.fundalHeightCm,
              fetalHeartRate: v.fetalHeartRate,
              hb: v.hb,
              urineProtein: v.urineProtein,
              urineGlucose: v.urineGlucose,
              supplements: v.supplements,
              tdGiven: v.tdGiven,
              clinicalNote: v.clinicalNote ?? '',
              noteForMother: v.noteForMother ?? '',
              nextVisitOn: d(v.nextVisitOn),
              ...(v.recordedAt ? { recordedAt: t(v.recordedAt) } : {}),
            })),
            delivery: x
              ? {
                  date: d(x.date),
                  time: x.time,
                  mode: x.mode,
                  gestation: x.gestation,
                  outcome: x.outcome,
                  babySex: x.babySex,
                  babyWeightKg: x.babyWeightKg,
                  babyLengthCm: x.babyLengthCm,
                  apgar: x.apgar,
                  bloodLoss: x.bloodLoss,
                  attendedBy: x.attendedBy,
                  childId: x.childId,
                  ...compact(x, ['place', 'notes']),
                }
              : null,
            pncVisits: (pncBy.get(p.id) ?? []).map((v) => {
              const babyDetails =
                v.babyWeightKg !== null || v.babyFeeding || v.babyCord || v.babyJaundice || v.babyTempC !== null
                  ? { weightKg: v.babyWeightKg, feeding: v.babyFeeding, cord: v.babyCord, jaundice: v.babyJaundice, tempC: v.babyTempC }
                  : null
              return {
                id: v.id,
                key: v.key,
                date: d(v.date),
                clinicianId: v.clinicianId,
                bp: [v.bpSystolic, v.bpDiastolic],
                tempC: v.tempC,
                weightKg: v.weightKg,
                uterus: v.uterus,
                bleeding: v.bleeding,
                perineum: v.perineum,
                breasts: v.breasts,
                epds: v.epds,
                hb: v.hb,
                baby: v.baby ?? '',
                familyPlanning: v.familyPlanning ?? '',
                note: v.note ?? '',
                ...compact(v, ['time', 'mood']),
                ...(v.nextVisitOn ? { nextVisitOn: d(v.nextVisitOn) } : {}),
                ...(babyDetails ? { babyDetails } : {}),
              }
            }),
          }
        : null,
      td: (tdBy.get(m.id) ?? []).map((x) => ({
        id: x.id,
        dose: x.dose,
        givenOn: d(x.givenOn),
        batch: x.batch,
        givenBy: x.givenBy,
        dueOn: d(x.dueOn),
        earliestOn: d(x.earliestOn),
        latestOn: d(x.latestOn),
        ...compact(x, ['note']),
      })),
      audit: (auditBy.mother.get(m.id) ?? []).map(auditItem),
    }
  })

  s.accounts = [...rows.account].sort(bySort).map((a) => {
    s.secrets.accounts[a.id] = a.passwordHash
    return {
      id: a.id,
      motherId: a.motherId,
      firstName: a.firstName,
      lastName: a.lastName,
      fullName: a.fullName,
      relationship: a.relationship,
      phone: a.phone,
      email: a.email ?? '',
      county: a.county,
      memberSince: d(a.memberSince),
      avatarTone: a.avatarTone,
      tracking: a.tracking,
      settings: {
        reminders: { sms: a.remindersSms, push: a.remindersPush, weeklyEmail: a.remindersWeeklyEmail, timing: a.remindersTiming },
        language: a.language,
      },
      consent: { since: d(a.consentSince), recordedBy: a.consentRecordedBy, lastViewed: t(a.consentLastViewed) },
    }
  })

  const carersBy = groupBy(rows.caregiver, 'patientId')
  const contactBy = groupBy(rows.contactAttempt, 'patientId')
  s.patients = [...rows.patient].sort(bySort).map((p) => ({
    id: p.id,
    facilityId: p.facilityId,
    firstName: p.firstName,
    lastName: p.lastName,
    sex: p.sex,
    dob: d(p.dob),
    patientId: p.patientNumber,
    tone: p.tone,
    birthWeightKg: p.birthWeightKg,
    birthLengthCm: p.birthLengthCm,
    birthNotificationNo: p.birthNotificationNo ?? '',
    registeredOn: d(p.registeredOn),
    bornAt: p.bornAt,
    mainClinicianId: p.mainClinicianId,
    recordStatus: p.recordStatus,
    ...(p.consentVerbal !== null ? { consent: { verbal: p.consentVerbal, recordedAt: d(p.consentRecordedAt) } } : {}),
    pastVisits: p.pastVisits,
    caregivers: (carersBy.get(p.id) ?? []).map((c) => ({
      id: c.caregiverId,
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      primary: c.primary,
      hasApp: c.hasApp,
      email: c.email ?? '',
      ...compact(c, ['motherId', 'tone']),
      ...(c.invitedAt ? { invitedAt: d(c.invitedAt) } : {}),
    })),
    ...lists('patient', p.id),
    audit: (auditBy.patient.get(p.id) ?? []).map(auditItem),
    contactLog: (contactBy.get(p.id) ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      at: t(c.at),
      ...(c.replied !== null ? { replied: c.replied } : {}),
      ...compact(c, ['note']),
    })),
  }))

  s.doses = [...rows.dose].sort(bySort).map((x) => ({
    id: x.id,
    patientId: x.patientId,
    key: x.key,
    givenOn: d(x.givenOn),
    batch: x.batch,
    site: x.site,
    route: x.route,
    givenBy: x.givenBy,
    facility: x.facility,
    notes: x.notes ?? '',
    seq: x.seq,
    ...compact(x, ['givenById', 'doseNumber']),
    ...(x.recordedAt ? { recordedAt: t(x.recordedAt) } : {}),
  }))
  s.optionalDoses = [...rows.optionalDose].sort(bySort).map((x) => ({
    id: x.id,
    patientId: x.patientId,
    vaccineId: x.vaccineId,
    doseNumber: x.doseNumber,
    ageLabel: x.ageLabel,
    dueOn: d(x.dueOn),
    givenOn: d(x.givenOn),
    batch: x.batch,
    givenBy: x.givenBy,
    facilityLabel: x.facilityLabel,
    addedAt: t(x.addedAt),
  }))
  s.measurements = [...rows.measurement].sort(bySort).map((m) => ({
    id: m.id,
    patientId: m.patientId,
    date: d(m.date),
    weightKg: m.weightKg,
    heightCm: m.heightCm,
    muacCm: m.muacCm,
    tempC: m.tempC,
    by: m.by,
    ...compact(m, ['facilityId']),
  }))
  s.shareLinks = rows.shareLink.map((x) => ({ accountId: x.accountId, patientId: x.patientId, url: x.url, createdOn: d(x.createdOn), expiresOn: d(x.expiresOn) }))

  s.appointments = [...rows.appointment].sort(bySort).map((a) => ({
    id: a.id,
    patientId: a.patientId ?? a.motherId,
    start: t(a.start),
    durationMin: a.durationMin,
    reason: a.reason,
    reasonLong: a.reasonLong ?? a.reason,
    clinicianId: a.clinicianId,
    room: a.room,
    status: a.status,
    ...compact(a, ['visitType', 'ref', 'location', 'summary']),
    doseKeys: a.doseKeys,
    noteForCaregiver: a.noteForCaregiver ?? '',
    clinicalNote: a.clinicalNote ?? '',
    cancelReason: a.cancelReason ?? '',
    history: Array.isArray(a.history) ? a.history : [],
    createdAt: t(a.createdAt),
  }))
  s.visitNotes = [...rows.visitNote].sort(bySort).map((v) => ({
    id: v.id,
    appointmentId: v.appointmentId,
    patientId: v.patientId,
    authorId: v.authorId,
    status: v.status,
    savedAt: t(v.savedAt),
    signedAt: t(v.signedAt),
    measurements: v.measurements ?? { weightKg: '', heightCm: '', muacCm: '', tempC: '' },
    history: v.history ?? '',
    nutritionStatus: v.nutritionStatus ?? '',
    plan: v.plan ?? '',
    followUpOn: d(v.followUpOn) ?? '',
    diagnosis: v.diagnosis ?? '',
    summary: v.summary ?? '',
    caregiverSummary: v.caregiverSummary ?? '',
    shareWithCaregiver: v.shareWithCaregiver,
  }))
  s.requests = [...rows.request].sort(bySort).map((r) => ({
    id: r.id,
    patientId: r.patientId ?? r.motherId,
    accountId: r.accountId,
    forLabel: r.forLabel,
    requestedBy: {
      name: r.requestedByName,
      relationship: r.requestedByRelationship,
      phone: r.requestedByPhone,
      ...(r.requestedByMotherId ? { motherId: r.requestedByMotherId } : {}),
    },
    visitType: r.visitType,
    preferredStart: t(r.preferredStart),
    clinicianId: r.clinicianId,
    note: r.note,
    requestedAt: t(r.requestedAt),
    status: r.status,
    ...(r.proposalStart
      ? {
          proposal: {
            start: t(r.proposalStart),
            clinicianId: r.proposalClinicianId,
            note: r.proposalNote ?? '',
            at: t(r.proposalAt),
            ...(r.proposalBy ? { by: r.proposalBy } : {}),
          },
        }
      : {}),
    ...compact(r, ['title', 'confirmedClinicianId', 'appointmentId', 'declineReason', 'declineNote', 'ref', 'rescheduleOf', 'summary']),
    ...(r.confirmedStart ? { confirmedStart: t(r.confirmedStart) } : {}),
    ...(r.respondedAt ? { respondedAt: t(r.respondedAt) } : {}),
  }))

  const messagesBy = groupBy(rows.message, 'conversationId')
  s.conversations = [...rows.conversation].sort(bySort).map((c) => ({
    id: c.id,
    type: c.type,
    ownerId: c.ownerId,
    ...compact(c, ['accountId', 'patientId', 'caregiverId', 'motherId', 'staffId', 'staffName', 'staffRole', 'initials', 'tone']),
    unread: c.unread,
    messages: (messagesBy.get(c.id) ?? []).map((m) => ({
      id: m.id,
      from: m.from,
      sentAt: t(m.sentAt),
      body: m.body,
      read: m.read,
      ...compact(m, ['attachmentName']),
    })),
  }))

  const recipientsBy = groupBy(rows.staffNotificationRecipient, 'notificationId')
  s.staffNotifications = [...rows.staffNotification].sort(bySort).map((x) => {
    const rec = recipientsBy.get(x.id) ?? []
    return {
      id: x.id,
      type: x.type,
      to: rec.map((r) => r.staffId),
      readBy: rec.filter((r) => r.read).map((r) => r.staffId),
      title: x.title,
      body: x.body,
      at: t(x.at),
      link: x.link,
    }
  })
  s.familyNotifications = [...rows.familyNotification].sort(bySort).map((x) => ({
    id: x.id,
    accountId: x.accountId,
    type: x.type,
    childId: x.childId,
    title: x.title,
    body: x.body,
    createdAt: t(x.createdAt),
    read: x.read,
    target: x.target ?? null,
  }))
  s.reminders = [...rows.reminder].sort(bySort).map((r) => ({ id: r.id, patientId: r.patientId, caregiverId: r.caregiverId, channel: r.channel, sentAt: t(r.sentAt) }))
  const covDoses = groupBy(rows.coverageDose, 'reportId')
  s.coverage = [...rows.coverageReport].sort(bySort).map((r) => ({
    id: r.id,
    label: r.label,
    registeredUnder2: r.registeredUnder2,
    authorised: r.authorised,
    fullyImmunized12m: r.fullyImmunized12m,
    overdueChildren: r.overdueChildren,
    overdueOver30: r.overdueOver30,
    doses: (covDoses.get(r.id) ?? []).map((x) => ({ name: x.name, value: x.value })),
  }))
  const setting = (id, fallback) => rows.appSetting.find((x) => x.id === id)?.value ?? fallback
  s.patientSerial = setting('patientSerial', 300)
  s.remindersSentBeforeToday = setting('remindersSentBeforeToday', 0)
  deriveLinks(s)
  return s
}

/** Derived fields that are not stored: each mother's children (from her caregiver links). */
export function deriveLinks(state) {
  for (const m of state.mothers) {
    m.childIds = state.patients.filter((p) => p.caregivers.some((c) => c.motherId === m.id)).map((p) => p.id)
  }
  return state
}

// ---------------------------------------------------------------- diff

function same(a, b) {
  if (a === b) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (a === null || b === null || a === undefined || b === undefined) return a == b // eslint-disable-line eqeqeq
  if (typeof a === 'object' || typeof b === 'object') return JSON.stringify(a) === JSON.stringify(b)
  return false
}

/** What to write: per table, rows to create, fields to update and ids to delete. */
export function diff(prev, next) {
  const ops = []
  for (const tbl of TABLES) {
    const before = prev[tbl] ?? new Map()
    const after = next[tbl] ?? new Map()
    const creates = []
    const updates = []
    const deletes = []
    for (const [id, row] of after) {
      const old = before.get(id)
      if (!old) {
        creates.push(row)
        continue
      }
      const changed = {}
      for (const k of Object.keys(row)) if (!same(row[k], old[k])) changed[k] = row[k]
      if (Object.keys(changed).length) updates.push({ id, data: changed })
    }
    for (const id of before.keys()) if (!after.has(id)) deletes.push(id)
    if (creates.length || updates.length || deletes.length) ops.push({ tbl, creates, updates, deletes })
  }
  return ops
}

/** Prisma needs DbNull for empty Json columns. */
export function forPrisma(tbl, data) {
  const cols = JSON_COLUMNS[tbl]
  if (!cols) return data
  const out = { ...data }
  for (const c of cols) if (c in out && (out[c] === null || out[c] === undefined)) out[c] = Prisma.DbNull
  return out
}

/** Applies diff() operations inside a transaction: creates and updates parent-first, deletes child-first. */
export async function apply(tx, ops) {
  const byTable = new Map(ops.map((o) => [o.tbl, o]))
  for (const tbl of TABLES) {
    const o = byTable.get(tbl)
    if (!o?.creates.length) continue
    for (let i = 0; i < o.creates.length; i += 1000) {
      await tx[tbl].createMany({ data: o.creates.slice(i, i + 1000).map((r) => forPrisma(tbl, r)) })
    }
  }
  for (const tbl of TABLES) {
    const o = byTable.get(tbl)
    if (!o?.updates.length) continue
    for (const u of o.updates) await tx[tbl].update({ where: { id: u.id }, data: forPrisma(tbl, u.data) })
  }
  for (const tbl of [...TABLES].reverse()) {
    const o = byTable.get(tbl)
    if (!o?.deletes.length) continue
    await tx[tbl].deleteMany({ where: { id: { in: o.deletes } } })
  }
}

/** Reads every table (used at start-up and after another process changed the data). */
export async function readAll(db) {
  const entries = await Promise.all(TABLES.map(async (tbl) => [tbl, await db[tbl].findMany()]))
  return Object.fromEntries(entries)
}

/** Rows (as read from Prisma) → the Map form flatten() returns, for diffing. */
export function rowsToMaps(rows) {
  return Object.fromEntries(TABLES.map((tbl) => [tbl, new Map((rows[tbl] ?? []).map((r) => [r.id, r]))]))
}
