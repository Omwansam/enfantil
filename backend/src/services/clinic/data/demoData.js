/**
 * Demo data (used only by `npm run db:seed`). Copied from the clinician
 * portal's mock data, plus Jabari Kamau, the record the family app's
 * "Link a hospital record" demo finds. The seed pins "today" to Monday
 * 9 November 2026, 09:45 while this file runs.
 *
 * Original notes: Mock data for the clinician portal. Names, dates and values follow the
 * "Enfantil — UI/UX Design" frames 10–16 and 24–27. Everything else is
 * derived: dose due dates and overdue status come from the KEPI schedule in
 * utils/kepi.js, ages and "last visit" from dates.
 *
 * The facility has 248 authorised patients: the 15 named in the design plus
 * 233 generated (deterministically, so every reload is identical) so search,
 * tabs and pagination work on real records.
 */
import { addDays, daysBetween, toDate, toISODate, TODAY, TODAY_ISO } from '../utils/dates'
import { buildSchedule, KEPI_SCHEDULE, SCHEDULE_BY_KEY, VACCINES } from '../utils/kepi'
import { maternalAppointments, mothers, requests, staffNotifications } from './maternalData'

export const FACILITY = {
  id: 'tfh',
  name: 'Tumaini Family Hospital',
  shortName: 'Tumaini',
  department: 'Kiambu Road, Kiambu',
  clinic: 'Mother & child clinic',
  address: 'Kiambu Road, Kiambu',
  phone: '0709 600 400',
  code: 'TFH',
}

export const ROOMS = [
  { id: 'Room 1', label: 'Room 1 · Immunization' },
  { id: 'Room 2', label: 'Room 2 · Paediatrics' },
  { id: 'Room 3', label: 'Room 3 · Growth & nutrition' },
  { id: 'Room 4', label: 'Room 4 · Antenatal & postnatal' },
]

export const STAFF = [
  {
    id: 'achieng-otieno',
    name: 'Dr. Achieng Otieno',
    shortName: 'Dr. Otieno',
    title: 'Paediatrician',
    staffId: 'TFH-PAED-0217',
    email: 'achieng.otieno@example.co.ke',
    initials: 'AO',
    tone: 'indigo',
  },
  {
    id: 'joseph-mwangi',
    name: 'Nurse Joseph Mwangi',
    shortName: 'Nurse Mwangi',
    title: 'Nurse-Midwife',
    staffId: 'TFH-NUR-0142',
    email: 'joseph.mwangi@example.co.ke',
    initials: 'JM',
    tone: 'mint',
  },
  {
    id: 'grace-wanjala',
    name: 'Dr. Grace Wanjala',
    shortName: 'Dr. Wanjala',
    title: 'Obstetrician-Gynaecologist',
    staffId: 'TFH-OBG-0105',
    email: 'grace.wanjala@example.co.ke',
    initials: 'GW',
    tone: 'pink',
  },
]

/** Demo logins. The caregiver one shows the redirect to the family sign-in. */
export const CREDENTIALS = [
  { identifiers: ['tfh-paed-0217', 'achieng.otieno@example.co.ke'], password: 'Clinic2026!', role: 'clinician', staffId: 'achieng-otieno' },
  { identifiers: ['tfh-obg-0105', 'grace.wanjala@example.co.ke'], password: 'Clinic2026!', role: 'clinician', staffId: 'grace-wanjala' },
  { identifiers: ['0712345678', '712345678', '254712345678', 'wanjiru.kamau@example.co.ke'], password: 'Amani2026!', role: 'caregiver' },
  { identifiers: ['0723118406', '723118406', '254723118406', 'njeri.mwangi@example.co.ke'], password: 'Njeri2026!', role: 'caregiver' },
]

/** Batches in the vaccine fridge, offered as suggestions on the record form. Older vials first. */
export const VACCINE_STOCK = {
  bcg: ['BCG-26B204'],
  opv: ['bOPV-1026-M3'],
  penta: ['PNT-26A0518'],
  pcv: ['PCV10-90215'],
  rota: ['ROTA-6021B'],
  ipv: ['IPV-25A0377'],
  vita: ['VA-2609-14'],
  mr: ['MR-25K0381', 'MR-26A0457'],
}

const MWANGI = 'Nurse Joseph Mwangi'
const OTIENO = 'Dr. Achieng Otieno'
const MATERNITY_NURSE = 'Nurse Joseph Mwangi'

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)]
const int = (rand, min, max) => min + Math.floor(rand() * (max - min + 1))
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

function makeBatch(rand, vaccineId, givenOn) {
  const d = toDate(givenOn)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const letter = pick(rand, LETTERS)
  switch (vaccineId) {
    case 'bcg':
      return `BCG-${yy}${letter}${int(rand, 100, 999)}`
    case 'opv':
      return `bOPV-${mm}${yy}-${letter}${int(rand, 1, 9)}`
    case 'penta':
      return `PNT-${yy}${letter}${int(rand, 1000, 9999)}`
    case 'pcv':
      return `PCV10-${int(rand, 80000, 92000)}`
    case 'rota':
      return `ROTA-${int(rand, 5000, 6200)}${letter}`
    case 'ipv':
      return `IPV-${yy}${letter}0${int(rand, 100, 999)}`
    case 'vita':
      return `VA-${yy}${mm}-${int(rand, 10, 40)}`
    case 'mr':
    default:
      return `MR-${yy}${letter}0${int(rand, 100, 999)}`
  }
}

let doseSeq = 0

function record(patientId, key, givenOn, extra = {}) {
  const e = SCHEDULE_BY_KEY[key]
  const v = VACCINES[e.vaccine]
  doseSeq += 1
  return {
    id: `dose-${patientId}-${key}`,
    patientId,
    key,
    givenOn,
    batch: extra.batch,
    site: extra.site ?? v.site,
    route: extra.route ?? v.route,
    givenBy: extra.givenBy ?? (e.visit === 'birth' ? MATERNITY_NURSE : MWANGI),
    facility: extra.facility ?? FACILITY.name,
    notes: extra.notes ?? '',
    seq: extra.seq ?? doseSeq,
  }
}

/**
 * Gives every dose that falls due before `until`, on its due date (plus
 * `jitter` random days, never after yesterday). `dates` sets exact dates and
 * `skip` leaves doses pending (the defaulters).
 */
function autoRecords(patientId, dob, { until = TODAY_ISO, skip = [], dates = {}, rand, jitter = 0, givenBy } = {}) {
  const r = rand ?? mulberry32(patientId.length * 7919)
  const records = []
  for (const e of KEPI_SCHEDULE) {
    if (skip.includes(e.key)) continue
    const schedule = buildSchedule(dob, records)
    const due = schedule.find((d) => d.key === e.key).dueOn
    let givenOn = dates[e.key]
    if (!givenOn) {
      if (due >= until) continue
      givenOn = toISODate(addDays(due, e.visit === 'birth' ? 0 : int(r, 0, jitter)))
      if (givenOn >= TODAY_ISO) givenOn = due
    }
    records.push(
      record(patientId, e.key, givenOn, {
        batch: makeBatch(r, e.vaccine, givenOn),
        givenBy: e.visit === 'birth' ? MATERNITY_NURSE : (givenBy ?? MWANGI),
      }),
    )
  }
  return records
}

function approxWeight(months) {
  if (months < 6) return 3.3 + 0.75 * months
  if (months < 12) return 7.8 + 0.3 * (months - 6)
  if (months < 24) return 9.6 + 0.2 * (months - 12)
  return 12 + 0.17 * (months - 24)
}

function approxHeight(months) {
  if (months < 3) return 50 + 3.5 * months
  if (months < 6) return 60.5 + 2.2 * (months - 3)
  if (months < 12) return 67 + 1.4 * (months - 6)
  if (months < 24) return 75.4 + (months - 12)
  return 87.4 + 0.6 * (months - 24)
}

function monthsOld(dob, at) {
  return daysBetween(dob, at) / 30.44
}

function measurement(patientId, date, weightKg, heightCm, extra = {}) {
  return { id: `m-${patientId}-${date}`, patientId, date, weightKg, heightCm, muacCm: extra.muacCm ?? null, tempC: extra.tempC ?? null, by: extra.by ?? MWANGI }
}

// ---------------------------------------------------------------------------
// Patients named in the design
// ---------------------------------------------------------------------------

function caregiver(id, name, relationship, phone, extra = {}) {
  return { id, name, relationship, phone, primary: false, hasApp: false, email: '', ...extra }
}

function patient(id, fields) {
  return {
    id,
    facilityId: FACILITY.id,
    allergies: [],
    medicines: [],
    pastVisits: [],
    contactLog: [],
    birthWeightKg: null,
    birthNotificationNo: '',
    registeredOn: fields.dob,
    ...fields,
  }
}

const designPatients = [
  patient('amani', {
    firstName: 'Amani',
    lastName: 'Kamau',
    sex: 'female',
    dob: '2026-02-09',
    patientId: 'TFH-P-260209-014',
    tone: 'mint',
    birthWeightKg: 3.2,
    birthNotificationNo: 'BN-KBU-2026-104417',
    caregivers: [
      caregiver('cg-wanjiru', 'Wanjiru Kamau', 'Mother', '712345678', {
        motherId: 'm-wanjiru',
        primary: true,
        hasApp: true,
        email: 'wanjiru.kamau@example.co.ke',
        tone: 'pink',
      }),
      caregiver('cg-david', 'David Kamau', 'Father', '722987654', { tone: 'sky' }),
    ],
    allergies: [{ substance: 'Egg', reaction: 'mild skin rash', recordedOn: '2026-09-14' }],
    medicines: [{ name: 'Vitamin D drops', dose: 'Once daily' }],
    pastVisits: ['2026-03-23', '2026-04-20', '2026-05-18', '2026-09-14', '2026-10-12'],
  }),
  patient('imani', {
    firstName: 'Imani',
    lastName: 'Mutua',
    sex: 'female',
    dob: '2023-05-12',
    patientId: 'TFH-P-230512-008',
    tone: 'slate',
    birthWeightKg: 2.9,
    caregivers: [caregiver('cg-joseph-mutua', 'Joseph Mutua', 'Father', '790331640', { primary: true, tone: 'slate' })],
    pastVisits: ['2025-11-12', '2026-06-02'],
    contactLog: [
      { type: 'sms', at: '2026-10-20T10:05', replied: false },
      { type: 'sms', at: '2026-11-02T10:10', replied: false },
    ],
  }),
  patient('liam', {
    firstName: 'Liam',
    lastName: 'Odhiambo',
    sex: 'male',
    dob: '2026-08-31',
    patientId: 'TFH-P-260831-040',
    tone: 'peach',
    birthWeightKg: 3.4,
    caregivers: [caregiver('cg-brenda', 'Brenda Odhiambo', 'Mother', '745902118', { primary: true, hasApp: true, tone: 'peach' })],
  }),
  patient('brian', {
    firstName: 'Brian',
    lastName: 'Kiprotich',
    sex: 'male',
    dob: '2026-08-03',
    patientId: 'TFH-P-260803-022',
    tone: 'blue',
    birthWeightKg: 3.5,
    caregivers: [caregiver('cg-peter', 'Peter Kiprotich', 'Father', '733210554', { primary: true, hasApp: true, tone: 'blue' })],
  }),
  patient('neema', {
    firstName: 'Neema',
    lastName: 'Wafula',
    sex: 'female',
    dob: '2026-02-09',
    patientId: 'TFH-P-260202-006',
    tone: 'violet',
    birthWeightKg: 3.0,
    caregivers: [caregiver('cg-grace', 'Grace Wafula', 'Mother', '701448902', { motherId: 'm-grace', primary: true, hasApp: true, tone: 'violet' })],
    pastVisits: ['2026-08-04'],
  }),
  patient('kevin', {
    firstName: 'Kevin',
    lastName: 'Otieno',
    sex: 'male',
    dob: '2025-05-11',
    patientId: 'TFH-P-250511-019',
    tone: 'blue',
    birthWeightKg: 3.6,
    caregivers: [caregiver('cg-susan', 'Susan Otieno', 'Mother', '722870431', { primary: true, hasApp: true, tone: 'pink' })],
  }),
  patient('faith', {
    firstName: 'Faith',
    lastName: 'Njeri',
    sex: 'female',
    dob: '2026-09-28',
    patientId: 'TFH-P-260928-047',
    tone: 'pink',
    birthWeightKg: 3.1,
    caregivers: [caregiver('cg-lucy', 'Lucy Njeri', 'Mother', '711554209', { motherId: 'm-lucy', primary: true, hasApp: true, tone: 'pink' })],
  }),
  patient('baraka', {
    firstName: 'Baraka',
    lastName: 'Ochieng',
    sex: 'male',
    dob: '2024-11-02',
    patientId: 'TFH-P-241102-003',
    tone: 'amber',
    birthWeightKg: 2.8,
    caregivers: [caregiver('cg-mary', 'Mary Ochieng', 'Mother', '720615337', { primary: true, hasApp: true, tone: 'amber' })],
    pastVisits: ['2026-07-06', '2026-09-07'],
  }),
  patient('tumaini', {
    firstName: 'Tumaini',
    lastName: 'Chebet',
    sex: 'male',
    dob: '2025-10-20',
    patientId: 'TFH-P-251020-027',
    tone: 'sky',
    birthWeightKg: 3.3,
    caregivers: [caregiver('cg-ruth', 'Ruth Chebet', 'Mother', '768112905', { primary: true, hasApp: true, tone: 'sky' })],
  }),
  patient('halima', {
    firstName: 'Halima',
    lastName: 'Yusuf',
    sex: 'female',
    dob: '2024-09-18',
    patientId: 'TFH-P-240918-011',
    tone: 'amber',
    birthWeightKg: 3.0,
    caregivers: [caregiver('cg-amina', 'Amina Yusuf', 'Mother', '705228774', { motherId: 'm-amina', primary: true, hasApp: true, tone: 'amber' })],
  }),
  patient('jabali', {
    firstName: 'Jabali',
    lastName: 'Kariuki',
    sex: 'male',
    dob: '2025-12-09',
    patientId: 'TFH-P-251209-031',
    tone: 'blue',
    birthWeightKg: 3.2,
    caregivers: [caregiver('cg-esther', 'Esther Kariuki', 'Mother', '727640115', { primary: true, tone: 'pink' })],
    contactLog: [{ type: 'call', at: '2026-11-02T11:20', note: 'Moved to Thika?' }],
  }),
  patient('sifa', {
    firstName: 'Sifa',
    lastName: 'Nyambura',
    sex: 'female',
    dob: '2026-06-09',
    patientId: 'TFH-P-260609-029',
    tone: 'pink',
    birthWeightKg: 2.7,
    caregivers: [caregiver('cg-mercy', 'Mercy Nyambura', 'Mother', '718205990', { primary: true, hasApp: true, tone: 'pink' })],
  }),
  patient('daudi', {
    firstName: 'Daudi',
    lastName: 'Mwangi',
    sex: 'male',
    dob: '2025-03-06',
    patientId: 'TFH-P-250306-012',
    tone: 'amber',
    birthWeightKg: 3.4,
    caregivers: [caregiver('cg-paul', 'Paul Mwangi', 'Father', '734118602', { primary: true, tone: 'blue' })],
    contactLog: [{ type: 'sms', at: '2026-11-01T09:00', replied: false }],
  }),
  patient('wanjiku', {
    firstName: 'Wanjiku',
    lastName: 'Mbugua',
    sex: 'female',
    dob: '2026-09-29',
    patientId: 'TFH-P-260929-048',
    tone: 'pink',
    birthWeightKg: 3.3,
    caregivers: [caregiver('cg-catherine', 'Catherine Mbugua', 'Mother', '712908331', { motherId: 'm-catherine', primary: true, hasApp: true, tone: 'pink' })],
  }),
  patient('baraka-m', {
    firstName: 'Baraka',
    lastName: 'Mwangi',
    sex: 'male',
    dob: '2023-07-21',
    patientId: 'TFH-P-230721-019',
    tone: 'indigo',
    birthWeightKg: 3.1,
    caregivers: [
      caregiver('cg-njeri', 'Njeri Mwangi', 'Mother', '723118406', {
        motherId: 'm-njeri',
        primary: true,
        hasApp: true,
        email: 'njeri.mwangi@example.co.ke',
        tone: 'amber',
      }),
    ],
  }),
  // Not linked to a family account yet: the family app's "Link a hospital record" demo finds him.
  patient('jabari', {
    firstName: 'Jabari',
    lastName: 'Kamau',
    sex: 'male',
    dob: '2025-01-18',
    patientId: 'TFH-P-250118-007',
    tone: 'blue',
    birthWeightKg: 3.4,
    birthLengthCm: 50,
    bornAt: 'Tumaini Family Hospital',
    caregivers: [caregiver('cg-david-j', 'David Kamau', 'Father', '722987654', { primary: true, tone: 'sky' })],
  }),
  patient('joy', {
    firstName: 'Joy',
    lastName: 'Akinyi',
    sex: 'female',
    dob: '2026-09-04',
    patientId: 'TFH-P-260904-044',
    tone: 'violet',
    birthWeightKg: 3.0,
    caregivers: [caregiver('cg-pauline', 'Pauline Akinyi', 'Mother', '746201876', { primary: true, hasApp: true, tone: 'violet' })],
  }),
]

// Amani's record exactly as in frames 12 and 15 (same batches as the family app).
const amaniDoses = [
  record('amani', 'bcg', '2026-02-09', { batch: 'BCG-24K117', givenBy: MATERNITY_NURSE, seq: 1 }),
  record('amani', 'opv-0', '2026-02-09', { batch: 'bOPV-0126-J9', givenBy: MATERNITY_NURSE, seq: 2 }),
  record('amani', 'opv-1', '2026-03-23', { batch: 'bOPV-0226-J4', seq: 1 }),
  record('amani', 'penta-1', '2026-03-23', { batch: 'PNT-25A1187', seq: 2 }),
  record('amani', 'pcv-1', '2026-03-23', { batch: 'PCV10-85520', seq: 3 }),
  record('amani', 'rota-1', '2026-03-23', { batch: 'ROTA-5390C', seq: 4 }),
  record('amani', 'penta-2', '2026-04-20', { batch: 'PNT-25B2870', seq: 1 }),
  record('amani', 'rota-2', '2026-04-20', { batch: 'ROTA-5514A', seq: 2 }),
  record('amani', 'opv-2', '2026-04-20', { batch: 'bOPV-0326-K2', seq: 3 }),
  record('amani', 'pcv-2', '2026-04-20', { batch: 'PCV10-87106', seq: 4 }),
  record('amani', 'opv-3', '2026-05-18', { batch: 'bOPV-0426-K7', seq: 1 }),
  record('amani', 'penta-3', '2026-05-18', { batch: 'PNT-25B3391', seq: 2 }),
  record('amani', 'pcv-3', '2026-05-18', { batch: 'PCV10-88412', seq: 3 }),
  record('amani', 'ipv', '2026-05-18', { batch: 'IPV-24C0193', seq: 4 }),
]

const rng = mulberry32(20261109)
const P = Object.fromEntries(designPatients.map((p) => [p.id, p]))
const designDoses = [
  ...amaniDoses,
  ...autoRecords('liam', P.liam.dob, { rand: rng, skip: ['opv-1', 'penta-1', 'pcv-1', 'rota-1'] }),
  ...autoRecords('imani', P.imani.dob, { rand: rng, skip: ['vita-36'] }),
  ...autoRecords('brian', P.brian.dob, { rand: rng }),
  ...autoRecords('neema', P.neema.dob, { rand: rng, dates: { 'vita-6': '2026-08-04' } }),
  ...autoRecords('kevin', P.kevin.dob, { rand: rng }),
  ...autoRecords('faith', P.faith.dob, {
    rand: rng,
    dates: { 'opv-1': TODAY_ISO, 'penta-1': TODAY_ISO, 'pcv-1': TODAY_ISO, 'rota-1': TODAY_ISO },
  }),
  ...autoRecords('baraka', P.baraka.dob, { rand: rng, dates: { 'vita-24': '2026-11-02' }, until: '2026-11-02' }),
  ...autoRecords('tumaini', P.tumaini.dob, { rand: rng, until: '2026-10-21' }),
  ...autoRecords('halima', P.halima.dob, { rand: rng, dates: { 'vita-24': '2026-09-09' }, until: '2026-09-09' }),
  ...autoRecords('jabali', P.jabali.dob, { rand: rng, skip: ['mr-1'] }),
  ...autoRecords('sifa', P.sifa.dob, {
    rand: rng,
    dates: { 'opv-2': '2026-09-23', 'penta-2': '2026-09-23', 'pcv-2': '2026-09-23', 'rota-2': '2026-09-23' },
    skip: ['opv-3', 'penta-3', 'pcv-3', 'ipv'],
  }),
  ...autoRecords('daudi', P.daudi.dob, { rand: rng, dates: { 'vita-18': '2026-09-02' }, skip: ['mr-2'] }),
  ...autoRecords('wanjiku', P.wanjiku.dob, { rand: rng }),
  ...autoRecords('joy', P.joy.dob, { rand: rng }),
  ...autoRecords('baraka-m', P['baraka-m'].dob, { rand: rng }),
  ...autoRecords('jabari', P.jabari.dob, { rand: rng }),
]

// Visits implied by the doses (birth doses are given at the maternity, not a clinic visit).
function visitsFromDoses(doses) {
  const byPatient = {}
  for (const d of doses) {
    if (SCHEDULE_BY_KEY[d.key].visit === 'birth') continue
    ;(byPatient[d.patientId] ??= new Set()).add(d.givenOn)
  }
  return byPatient
}

const designVisits = visitsFromDoses(designDoses)
for (const p of designPatients) {
  if (p.id === 'amani') continue
  const fromDoses = [...(designVisits[p.id] ?? [])].filter((d) => d < TODAY_ISO)
  p.pastVisits = [...new Set([...p.pastVisits, ...fromDoses])].sort()
}
// Last visits as shown on the patient list.
P.neema.pastVisits = P.neema.pastVisits.filter((d) => d <= '2026-08-04')
P.kevin.pastVisits = P.kevin.pastVisits.filter((d) => d <= '2026-05-11')
P.tumaini.pastVisits = [...P.tumaini.pastVisits.filter((d) => d < '2026-11-01')]
P.halima.pastVisits = P.halima.pastVisits.filter((d) => d <= '2026-09-09')
P.imani.pastVisits = ['2025-11-12', '2026-06-02']

const designMeasurements = [
  measurement('amani', '2026-02-09', 3.2, 49.0, { by: MATERNITY_NURSE }),
  measurement('amani', '2026-03-23', 4.7, 55.0),
  measurement('amani', '2026-04-20', 5.6, 58.5),
  measurement('amani', '2026-05-18', 6.4, 61.5),
  measurement('amani', '2026-09-14', 7.8, 67.0, { by: OTIENO }),
  measurement('amani', '2026-10-12', 8.2, 69.0, { by: OTIENO }),
  measurement('baraka', '2026-07-06', 10.6, 82.5, { by: OTIENO }),
  measurement('baraka', '2026-09-07', 10.8, 84.0, { by: OTIENO, muacCm: 13.4 }),
  measurement('liam', '2026-08-31', 3.4, 50.0, { by: MATERNITY_NURSE }),
  measurement('imani', '2026-06-02', 13.1, 94.0, { by: OTIENO }),
  measurement('brian', '2026-10-12', 5.9, 59.5),
  measurement('neema', '2026-08-04', 7.0, 65.5),
  measurement('kevin', '2026-05-11', 9.4, 74.5),
  measurement('faith', TODAY_ISO, 4.6, 54.5),
  measurement('tumaini', '2026-11-06', 9.6, 75.0, { by: OTIENO, tempC: 38.4 }),
  measurement('halima', '2026-09-09', 11.8, 86.0),
  measurement('jabali', '2026-06-09', 7.9, 66.0),
  measurement('sifa', '2026-09-23', 5.4, 59.0),
  measurement('daudi', '2026-09-02', 10.4, 80.5),
  measurement('wanjiku', '2026-09-29', 3.3, 49.5, { by: MATERNITY_NURSE }),
  measurement('joy', '2026-10-16', 4.9, 55.5),
  measurement('baraka-m', '2023-07-21', 3.1, 50.0, { by: MWANGI }),
  measurement('baraka-m', '2024-07-22', 10.2, 76.0, { by: OTIENO }),
  measurement('baraka-m', '2025-07-21', 12.6, 88.0, { by: OTIENO }),
  measurement('baraka-m', '2026-07-21', 14.3, 96.0, { by: MWANGI }),
  measurement('baraka-m', '2024-01-22', 7.9, 67.5, { by: MWANGI }),
  measurement('jabari', '2025-01-18', 3.4, 50.0, { by: MATERNITY_NURSE }),
  measurement('jabari', '2026-07-20', 10.9, 80.5),
]

// ---------------------------------------------------------------------------
// Generated patients (to reach the 248 authorised patients in the design)
// ---------------------------------------------------------------------------

const GIRLS = [
  'Achieng',
  'Akinyi',
  'Atieno',
  'Awino',
  'Adhiambo',
  'Wairimu',
  'Nyambura',
  'Wambui',
  'Waithera',
  'Mumbi',
  'Nekesa',
  'Nafula',
  'Chepkoech',
  'Jepkosgei',
  'Jeptoo',
  'Kemunto',
  'Moraa',
  'Kerubo',
  'Mwende',
  'Mutheu',
  'Ndinda',
  'Zawadi',
  'Fatuma',
  'Aisha',
  'Zuri',
  'Makena',
  'Shiru',
  'Wangari',
  'Mercy',
  'Hope',
  'Precious',
  'Blessing',
  'Esther',
  'Ruth',
  'Abigail',
  'Hawi',
  'Malaika',
  'Nanjala',
  'Wanza',
  'Kawira',
  'Nkatha',
  'Gakii',
  'Tabitha',
  'Rehema',
  'Furaha',
  'Amina',
  'Leah',
  'Pendo',
]
const BOYS = [
  'Otieno',
  'Ochieng',
  'Omondi',
  'Onyango',
  'Kipchoge',
  'Kiprono',
  'Cheruiyot',
  'Kimani',
  'Njoroge',
  'Musyoka',
  'Kioko',
  'Wekesa',
  'Barasa',
  'Juma',
  'Hassan',
  'Abdi',
  'Ian',
  'Ethan',
  'Daniel',
  'Samuel',
  'Mark',
  'Felix',
  'Victor',
  'Dennis',
  'Allan',
  'Collins',
  'Jayden',
  'Ryan',
  'Jamal',
  'Bakari',
  'Riziki',
  'Neville',
  'Elijah',
  'Gideon',
  'Caleb',
  'Joshua',
  'Kibet',
  'Mutuma',
  'Kirimi',
  'Munene',
  'Ouma',
  'Okoth',
  'Wanyama',
  'Simiyu',
  'Rashid',
  'Salim',
  'Tevin',
  'Nathan',
]
const SURNAMES = [
  'Omondi',
  'Onyango',
  'Kiprono',
  'Cheruiyot',
  'Kosgei',
  'Kimani',
  'Njoroge',
  'Kariuki',
  'Wambua',
  'Musyoka',
  'Kioko',
  'Wekesa',
  'Barasa',
  'Juma',
  'Hassan',
  'Abdi',
  'Mohamed',
  'Gitau',
  'Macharia',
  'Ndungu',
  'Muriuki',
  'Githinji',
  'Kinyua',
  'Maina',
  'Kibet',
  'Langat',
  'Rotich',
  'Nyaga',
  'Ouma',
  'Okoth',
  'Oduor',
  'Owino',
  'Simiyu',
  'Makokha',
  'Wanyama',
  'Koech',
  'Mutiso',
  'Ndegwa',
  'Waweru',
  'Kamande',
  'Ngugi',
  'Kirui',
  'Biwott',
  'Achola',
  'Oloo',
  'Murimi',
  'Kahiga',
  'Mbugua',
]
const MOTHERS = [
  'Jane',
  'Grace',
  'Esther',
  'Lucy',
  'Susan',
  'Agnes',
  'Mercy',
  'Faith',
  'Caroline',
  'Beatrice',
  'Purity',
  'Winnie',
  'Joyce',
  'Lilian',
  'Rose',
  'Ann',
  'Eunice',
  'Judith',
  'Diana',
  'Brenda',
  'Naomi',
  'Pauline',
  'Florence',
  'Catherine',
  'Margaret',
  'Hellen',
  'Doris',
  'Irene',
  'Sarah',
  'Damaris',
  'Phyllis',
  'Janet',
  'Monica',
  'Gladys',
  'Veronica',
  'Salome',
]
const FATHERS = [
  'John',
  'Peter',
  'James',
  'Paul',
  'David',
  'Stephen',
  'Francis',
  'Patrick',
  'George',
  'Charles',
  'Michael',
  'Moses',
  'Simon',
  'Kennedy',
  'Geoffrey',
  'Isaac',
]
const TONES = ['mint', 'pink', 'blue', 'violet', 'amber', 'sky', 'peach', 'slate']

function generatePatients(count) {
  const rand = mulberry32(248)
  const taken = new Set(designPatients.map((p) => `${p.firstName} ${p.lastName}`))
  const patients = []
  const doses = []
  const measurements = []
  const earliest = toDate('2021-12-01')
  const span = daysBetween(earliest, '2026-10-20')
  let serial = 50

  while (patients.length < count) {
    const sex = rand() < 0.5 ? 'female' : 'male'
    const firstName = pick(rand, sex === 'female' ? GIRLS : BOYS)
    const lastName = pick(rand, SURNAMES)
    if (firstName === lastName || taken.has(`${firstName} ${lastName}`)) continue
    taken.add(`${firstName} ${lastName}`)

    const dob = toISODate(addDays(earliest, int(rand, 0, span)))
    const index = patients.length
    const id = `p-${String(index + 1).padStart(3, '0')}`
    serial += 1
    const ymd = dob.slice(2).replace(/-/g, '')
    const relation = rand() < 0.82 ? 'Mother' : rand() < 0.8 ? 'Father' : 'Grandmother'
    const carerFirst = relation === 'Father' ? pick(rand, FATHERS) : pick(rand, MOTHERS)
    const phone = `7${int(rand, 0, 9)}${String(int(rand, 0, 9999999)).padStart(7, '0')}`
    // The six most recent registrations are transfers into the clinic this week.
    const registeredOn = index >= count - 6 ? toISODate(addDays(TODAY, -int(rand, 1, 6))) : toISODate(addDays(dob, int(rand, 0, 20)))

    const p = patient(id, {
      firstName,
      lastName,
      sex,
      dob,
      patientId: `TFH-P-${ymd}-${String(serial).padStart(3, '0')}`,
      tone: pick(rand, TONES),
      birthWeightKg: Math.round((2.6 + rand() * 1.4) * 10) / 10,
      registeredOn,
      caregivers: [
        caregiver(`cg-${id}`, `${carerFirst} ${lastName}`, relation, phone, {
          primary: true,
          hasApp: rand() < 0.6,
          tone: pick(rand, TONES),
        }),
      ],
    })
    const given = autoRecords(id, dob, { rand, jitter: 4 })
    doses.push(...given)
    const visits = [...new Set(given.filter((d) => SCHEDULE_BY_KEY[d.key].visit !== 'birth').map((d) => d.givenOn))].sort()
    p.pastVisits = visits
    const last = visits[visits.length - 1]
    if (last) {
      const m = monthsOld(dob, last)
      measurements.push(
        measurement(id, last, Math.round(approxWeight(m) * (0.92 + rand() * 0.16) * 10) / 10, Math.round(approxHeight(m) * (0.97 + rand() * 0.06) * 10) / 10),
      )
    }
    patients.push(p)
  }
  return { patients, doses, measurements }
}

// ---------------------------------------------------------------------------
// Appointments (frame 13), visit notes (frame 25), conversations (frame 14)
// ---------------------------------------------------------------------------

function appt(id, patientId, start, reason, clinicianId, room, status = 'upcoming', extra = {}) {
  return {
    id,
    patientId,
    start,
    durationMin: 15,
    reason,
    reasonLong: extra.reasonLong ?? reason,
    clinicianId,
    room,
    status,
    doseKeys: extra.doseKeys ?? [],
    noteForCaregiver: extra.noteForCaregiver ?? '',
    clinicalNote: extra.clinicalNote ?? '',
    cancelReason: extra.cancelReason ?? '',
    history: [],
    createdAt: extra.createdAt ?? '2026-10-12T09:00',
  }
}

const SIX_WEEK = ['opv-1', 'penta-1', 'pcv-1', 'rota-1']
const TEN_WEEK = ['opv-2', 'penta-2', 'pcv-2', 'rota-2']
const FOURTEEN_WEEK = ['opv-3', 'penta-3', 'pcv-3', 'ipv']

function designAppointments() {
  return [
    // Previous visits
    appt('a-0907-baraka', 'baraka', '2026-09-07T09:00', 'Growth follow-up', 'achieng-otieno', 'Room 3', 'completed'),
    appt('a-1106-tumaini', 'tumaini', '2026-11-06T10:30', 'Fever review', 'achieng-otieno', 'Room 2', 'completed'),
    // Monday 9 November (today)
    appt('a-1109-baraka', 'baraka', '2026-11-09T08:30', 'Growth follow-up', 'achieng-otieno', 'Room 3', 'completed'),
    appt('a-1109-faith', 'faith', '2026-11-09T09:15', '6-week immunizations', 'joseph-mwangi', 'Room 1', 'completed', { doseKeys: SIX_WEEK }),
    appt('a-1109-brian', 'brian', '2026-11-09T10:00', '14-week immunizations', 'joseph-mwangi', 'Room 1', 'upcoming', {
      doseKeys: FOURTEEN_WEEK,
      noteForCaregiver: '14-week vaccines. Please bring the MCH handbook.',
    }),
    appt('a-1109-amani', 'amani', '2026-11-09T10:00', 'Measles-Rubella 1 · Vit A catch-up', 'achieng-otieno', 'Room 2', 'upcoming', {
      reasonLong: 'Measles-Rubella 1 + Vitamin A catch-up',
      doseKeys: ['vita-6', 'mr-1'],
      noteForCaregiver: 'Measles-Rubella dose and the missed Vitamin A dose. Please bring the MCH handbook.',
      clinicalNote: 'Mother reported mild fever 37.9°C last night; 37.4°C this morning.',
      createdAt: '2026-10-12T10:20',
    }),
    appt('a-1109-neema', 'neema', '2026-11-09T10:45', 'Measles-Rubella 1', 'achieng-otieno', 'Room 2', 'upcoming', { doseKeys: ['mr-1'] }),
    appt('a-1109-imani', 'imani', '2026-11-09T11:30', 'Cough review', 'achieng-otieno', 'Room 3', 'cancelled', {
      cancelReason: 'Caregiver asked to cancel',
    }),
    appt('a-1109-liam', 'liam', '2026-11-09T14:00', '10-week immunizations', 'joseph-mwangi', 'Room 1', 'upcoming', {
      doseKeys: SIX_WEEK,
      clinicalNote: 'Missed the 6-week visit. Give 6-week doses today; 10-week doses 4 weeks later.',
    }),
    // Rest of the week
    appt('a-1110-tumaini', 'tumaini', '2026-11-10T09:00', 'Fever follow-up', 'achieng-otieno', 'Room 2'),
    appt('a-1110-wanjiku', 'wanjiku', '2026-11-10T11:00', '6-week immunizations', 'joseph-mwangi', 'Room 1', 'upcoming', { doseKeys: SIX_WEEK }),
    appt('a-1111-kevin', 'kevin', '2026-11-11T08:30', 'Measles-Rubella 2', 'joseph-mwangi', 'Room 1', 'upcoming', { doseKeys: ['mr-2', 'vita-18'] }),
    appt('a-1111-halima', 'halima', '2026-11-11T10:15', 'Growth check', 'achieng-otieno', 'Room 3'),
    appt('a-1112-baraka', 'baraka', '2026-11-12T09:30', 'Nutrition review', 'achieng-otieno', 'Room 3'),
    appt('a-1113-joy', 'joy', '2026-11-13T10:00', '10-week immunizations', 'joseph-mwangi', 'Room 1', 'upcoming', { doseKeys: TEN_WEEK }),
    // Amani's 12-month Vitamin A visit (frame 12)
    appt('a-0209-amani', 'amani', '2027-02-09T09:30', 'Vitamin A 12 months', 'achieng-otieno', 'Room 2', 'upcoming', {
      reasonLong: '12-month Vitamin A dose and growth check',
      doseKeys: ['vita-12'],
      noteForCaregiver: '12-month Vitamin A dose and growth check. Please bring the MCH handbook.',
    }),
  ]
}

const SLOT_TIMES = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00']
const OTHER_REASONS = ['Growth check', 'Nutrition review', 'Cough review', 'Skin rash review', 'Diarrhoea follow-up', 'Well-child check']

/** A few visits from generated patients for the previous and next weeks, so week navigation has data. */
function extraAppointments(patients) {
  const rand = mulberry32(1109)
  const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']
  const clinicians = ['achieng-otieno', 'joseph-mwangi', 'achieng-otieno']
  const list = []
  let n = 0
  for (const day of days) {
    const count = int(rand, 2, 4)
    const times = [...SLOT_TIMES]
      .sort(() => rand() - 0.5)
      .slice(0, count)
      .sort()
    for (const time of times) {
      const p = patients[int(rand, 0, patients.length - 1)]
      const clinicianId = pick(rand, clinicians)
      const past = day < TODAY_ISO
      const reason = clinicianId === 'joseph-mwangi' ? 'Immunization catch-up check' : pick(rand, OTHER_REASONS)
      const status = past ? (rand() < 0.12 ? 'cancelled' : 'completed') : 'upcoming'
      const room = clinicianId === 'joseph-mwangi' ? 'Room 1' : pick(rand, ['Room 2', 'Room 3'])
      n += 1
      list.push(
        appt(`a-x-${n}`, p.id, `${day}T${time}`, reason, clinicianId, room, status, {
          cancelReason: status === 'cancelled' ? 'Caregiver asked to cancel' : '',
        }),
      )
    }
  }
  return list
}

function visitNotes() {
  return [
    {
      id: 'a-0907-baraka',
      appointmentId: 'a-0907-baraka',
      patientId: 'baraka',
      authorId: 'achieng-otieno',
      status: 'signed',
      savedAt: '2026-09-07T09:40',
      signedAt: '2026-09-07T09:42',
      measurements: { weightKg: '10.8', heightCm: '84.0', muacCm: '13.4', tempC: '36.6' },
      history: 'Poor appetite for two months. No diarrhoea. Active.',
      nutritionStatus: 'at-risk',
      plan: 'Fortified porridge twice daily. Review in 2 months.',
      followUpOn: '2026-11-09',
      diagnosis: 'Growth faltering',
      summary: 'Weight 10.8 kg, below expected gain. Started fortified porridge; mother counselled on feeding frequency.',
      caregiverSummary: 'Baraka needs to gain a little more weight. Give fortified porridge twice a day. Next check on 9 Nov.',
      shareWithCaregiver: true,
    },
    {
      id: 'a-1109-baraka',
      appointmentId: 'a-1109-baraka',
      patientId: 'baraka',
      authorId: 'achieng-otieno',
      status: 'draft',
      savedAt: '2026-11-09T08:52',
      signedAt: null,
      measurements: { weightKg: '11.4', heightCm: '85.0', muacCm: '14.2', tempC: '36.7' },
      history: 'Mother reports good appetite on fortified porridge twice daily. No diarrhoea or fever in the past month. Active and playful. No oedema.',
      nutritionStatus: 'normal',
      plan: 'Continue fortified porridge. Vitamin A due at 30 months. Review growth in 3 months.',
      followUpOn: '2027-02-08',
      diagnosis: 'Growth monitoring — normal',
      summary: '',
      caregiverSummary: 'Baraka is growing well. Keep giving the fortified porridge. Next check on Mon 8 Feb 2027.',
      shareWithCaregiver: true,
    },
    {
      id: 'a-1109-faith',
      appointmentId: 'a-1109-faith',
      patientId: 'faith',
      authorId: 'achieng-otieno',
      status: 'draft',
      savedAt: '2026-11-09T09:34',
      signedAt: null,
      measurements: { weightKg: '4.6', heightCm: '54.5', muacCm: '', tempC: '36.8' },
      history: 'Exclusively breastfed. Feeding and sleeping well. 6-week doses given by Nurse Mwangi, no immediate reaction.',
      nutritionStatus: 'normal',
      plan: '',
      followUpOn: '2026-12-07',
      diagnosis: '',
      summary: '',
      caregiverSummary: '',
      shareWithCaregiver: true,
    },
    {
      id: 'a-1106-tumaini',
      appointmentId: 'a-1106-tumaini',
      patientId: 'tumaini',
      authorId: 'achieng-otieno',
      status: 'not-started',
      savedAt: null,
      signedAt: null,
      measurements: { weightKg: '9.6', heightCm: '75.0', muacCm: '', tempC: '38.4' },
      history: '',
      nutritionStatus: '',
      plan: '',
      followUpOn: '2026-11-10',
      diagnosis: '',
      summary: '',
      caregiverSummary: '',
      shareWithCaregiver: true,
    },
  ]
}

function msg(id, from, sentAt, body) {
  return { id, from, sentAt, body }
}

function conversations() {
  return [
    {
      id: 'c-wanjiru',
      type: 'caregiver',
      patientId: 'amani',
      caregiverId: 'cg-wanjiru',
      unread: 1,
      messages: [
        msg('m-w-1', 'me', '2026-11-06T10:24', 'Hello Wanjiru, a reminder that Amani’s Measles-Rubella dose is due on Monday. Please bring her MCH handbook.'),
        msg('m-w-2', 'them', '2026-11-06T10:31', 'Thank you daktari, we’ll be there at 10.'),
        msg('m-w-3', 'them', '2026-11-08T19:42', 'Amani has had a mild fever since this afternoon (37.9°C). Should we still come tomorrow?'),
        msg(
          'm-w-4',
          'me',
          '2026-11-08T20:05',
          'A mild fever below 38.5°C is usually no reason to delay. Give plenty of fluids and come at 10:00 — I’ll check her before the vaccine.',
        ),
        msg('m-w-5', 'them', '2026-11-09T07:15', 'Her temperature is 37.4°C this morning. See you at 10.'),
      ],
    },
    {
      id: 'c-peter',
      type: 'caregiver',
      patientId: 'brian',
      caregiverId: 'cg-peter',
      unread: 1,
      messages: [
        msg('m-p-1', 'me', '2026-11-06T11:02', 'Hello Peter, Brian’s 14-week vaccines are on Monday at 10:00 in Room 1.'),
        msg('m-p-2', 'them', '2026-11-06T11:15', 'Asante, we will come.'),
        msg('m-p-3', 'them', '2026-11-09T09:40', 'Good morning doctor, we are on our way. About 10 minutes late because of traffic on Thika Road.'),
      ],
    },
    {
      id: 'c-grace',
      type: 'caregiver',
      patientId: 'neema',
      caregiverId: 'cg-grace',
      unread: 1,
      messages: [msg('m-g-1', 'them', '2026-11-09T08:30', 'Can Neema still have her MR dose if she has a runny nose?')],
    },
    {
      id: 'c-mary',
      type: 'caregiver',
      patientId: 'baraka',
      caregiverId: 'cg-mary',
      unread: 2,
      messages: [
        msg('m-m-1', 'me', '2026-09-07T09:45', 'Hello Mary, start the fortified porridge twice a day as we discussed. See you on 9 Nov.'),
        msg('m-m-2', 'them', '2026-09-07T10:02', 'Thank you daktari.'),
        msg('m-m-3', 'them', '2026-11-08T20:40', 'Good evening daktari. Baraka has finished the flour you recommended.'),
        msg('m-m-4', 'them', '2026-11-09T06:50', 'Should we keep giving the fortified porridge you suggested?'),
      ],
    },
    {
      id: 'c-joseph',
      type: 'staff',
      staffId: 'joseph-mwangi',
      unread: 1,
      messages: [
        msg('m-j-1', 'me', '2026-11-08T14:10', 'Joseph, can you check the MR stock before Monday? We have three MR 1 doses booked.'),
        msg('m-j-2', 'them', '2026-11-08T16:55', 'New Measles-Rubella batch MR-26A0457 is in the vaccine fridge. Please use the older vials first.'),
      ],
    },
    {
      id: 'c-lab',
      type: 'staff',
      staffName: 'Tumaini Laboratory',
      staffRole: 'Clinic staff',
      initials: 'LB',
      tone: 'slate',
      unread: 0,
      messages: [msg('m-l-1', 'them', '2026-11-08T15:20', 'Haemoglobin result for Tumaini Chebet is ready in the lab system.')],
    },
  ]
}

/**
 * Coverage by period (frame 26). These are facility report figures (marked
 * "sample data" on screen); the defaulter list underneath is live.
 */
export const COVERAGE_REPORTS = [
  {
    id: '2026-10',
    label: 'October 2026',
    registeredUnder2: 142,
    authorised: 248,
    fullyImmunized12m: 86,
    overdueChildren: 17,
    overdueOver30: 3,
    doses: [
      { name: 'BCG', value: 98 },
      { name: 'Pentavalent 3', value: 92 },
      { name: 'PCV 3', value: 91 },
      { name: 'IPV', value: 88 },
      { name: 'Measles-Rubella 1', value: 84 },
      { name: 'Measles-Rubella 2', value: 71 },
    ],
  },
  {
    id: '2026-09',
    label: 'September 2026',
    registeredUnder2: 139,
    authorised: 242,
    fullyImmunized12m: 83,
    overdueChildren: 19,
    overdueOver30: 5,
    doses: [
      { name: 'BCG', value: 97 },
      { name: 'Pentavalent 3', value: 90 },
      { name: 'PCV 3', value: 90 },
      { name: 'IPV', value: 86 },
      { name: 'Measles-Rubella 1', value: 82 },
      { name: 'Measles-Rubella 2', value: 68 },
    ],
  },
  {
    id: '2026-08',
    label: 'August 2026',
    registeredUnder2: 137,
    authorised: 238,
    fullyImmunized12m: 82,
    overdueChildren: 21,
    overdueOver30: 6,
    doses: [
      { name: 'BCG', value: 97 },
      { name: 'Pentavalent 3', value: 89 },
      { name: 'PCV 3', value: 88 },
      { name: 'IPV', value: 85 },
      { name: 'Measles-Rubella 1', value: 81 },
      { name: 'Measles-Rubella 2', value: 66 },
    ],
  },
  {
    id: '2026-07',
    label: 'July 2026',
    registeredUnder2: 134,
    authorised: 233,
    fullyImmunized12m: 80,
    overdueChildren: 24,
    overdueOver30: 8,
    doses: [
      { name: 'BCG', value: 96 },
      { name: 'Pentavalent 3', value: 88 },
      { name: 'PCV 3', value: 87 },
      { name: 'IPV', value: 83 },
      { name: 'Measles-Rubella 1', value: 80 },
      { name: 'Measles-Rubella 2', value: 64 },
    ],
  },
]

/** Reminders sent earlier this week (before today's session). */
export const REMINDERS_SENT_BEFORE_TODAY = 23

export function createInitialData() {
  doseSeq = 0
  const generated = generatePatients(248 - designPatients.length)
  const patients = [...structuredClone(designPatients), ...generated.patients]
  // Link each mother to her children through the caregiver records.
  const motherList = mothers().map((m) => ({
    ...m,
    childIds: patients.filter((p) => p.caregivers.some((c) => c.motherId === m.id)).map((p) => p.id),
  }))
  return {
    facility: FACILITY,
    staff: STAFF,
    rooms: ROOMS,
    patients,
    doses: [...structuredClone(designDoses), ...generated.doses],
    measurements: [...designMeasurements, ...generated.measurements],
    appointments: [...designAppointments(), ...maternalAppointments(), ...extraAppointments(generated.patients)],
    mothers: motherList,
    requests: requests(),
    staffNotifications: staffNotifications(),
    visitNotes: visitNotes(),
    conversations: conversations(),
    reminders: [],
    remindersSentBeforeToday: REMINDERS_SENT_BEFORE_TODAY,
    coverage: COVERAGE_REPORTS,
    patientSerial: 300,
  }
}
