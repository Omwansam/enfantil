/**
 * Mock data for the Enfantil family web app (Infant and Maternal Health
 * Management System v1). One private facility: Tumaini Family Hospital.
 * "Today" is Sunday 8 Nov 2026 (src/utils/dates.js).
 *
 * Two demo mothers, each with her own account data:
 * - Wanjiru Kamau: postnatal, baby Amani (born 9 Feb 2026).
 * - Njeri Mwangi: 26 weeks pregnant, son Baraka (3 years).
 *
 * The mother is a profile with id 'me', so her appointments, messages and
 * notifications use childId 'me'. Dose, ANC and postnatal status are NOT
 * stored: the API layer works them out from dates.
 */
import { addDays, addMonths, toDate, toISODate } from '../utils/dates'

/* ---------------------------------------------------------------- facility */

export const FACILITY = {
  id: 'tfh',
  name: 'Tumaini Family Hospital',
  shortName: 'Tumaini Family Hospital',
  address: 'Kiambu Road, Kiambu',
  county: 'Kiambu',
  phone: '0709 600 400',
}

export const facilities = [FACILITY]

export const clinicians = [
  {
    id: 'achieng-otieno',
    name: 'Dr. Achieng Otieno',
    shortName: 'Dr. Otieno',
    role: 'Paediatrician',
    subtitle: 'Paediatrician · Tumaini Family Hospital',
    facilityId: 'tfh',
    tone: 'indigo',
    sees: ['child'],
  },
  {
    id: 'grace-wanjala',
    name: 'Dr. Grace Wanjala',
    shortName: 'Dr. Wanjala',
    role: 'Obstetrician-Gynaecologist',
    subtitle: 'Obstetrician-Gynaecologist · Tumaini Family Hospital',
    facilityId: 'tfh',
    tone: 'amber',
    sees: ['me'],
  },
  {
    id: 'joseph-mwangi',
    name: 'Nurse Joseph Mwangi',
    shortName: 'Nurse Mwangi',
    role: 'Nurse-Midwife',
    subtitle: 'Nurse-Midwife · Tumaini Family Hospital',
    facilityId: 'tfh',
    tone: 'teal',
    sees: ['me', 'child'],
  },
  {
    id: 'tfh-reception',
    name: 'Tumaini Reception',
    shortName: 'Reception',
    initials: 'TR',
    role: 'Clinic staff',
    subtitle: 'Appointments desk · Tumaini Family Hospital',
    facilityId: 'tfh',
    tone: 'slate',
    sees: [],
  },
]

const FACILITY_LABEL = 'Tumaini Family Hospital'
const MATERNITY = 'Tumaini Maternity'
const MWANGI = 'Nurse Joseph Mwangi'
const WANJALA = 'Dr. Grace Wanjala'

/* ------------------------------------------------------------- vaccines */

export const vaccines = {
  bcg: {
    id: 'bcg',
    name: 'BCG',
    short: 'BCG',
    numbered: false,
    totalDoses: 1,
    protects: 'severe forms of tuberculosis (TB)',
    how: 'Given as one small injection in the upper left arm.',
    common: ['A small swelling that turns into a blister or sore 2–6 weeks later', 'The sore heals slowly over a few weeks and leaves a small scar'],
    getHelp: ['A large, painful swelling or pus at the injection site', 'Swollen glands in the armpit, or a high fever'],
    faqs: [
      { q: 'Is the scar normal?', a: 'Yes. A small raised scar on the upper arm is expected and shows the vaccine has taken. Keep the area clean and dry and do not cover it tightly.' },
      { q: 'My child has no scar. Do they need another dose?', a: 'Not usually. Mention it at the next visit and the clinician will decide what is needed.' },
    ],
  },
  opv: {
    id: 'opv',
    name: 'OPV',
    short: 'OPV',
    numbered: true,
    firstDose: 0,
    totalDoses: 4,
    protects: 'polio',
    how: 'Given as two drops in the mouth.',
    common: ['Usually no side effects at all'],
    getHelp: ['Trouble breathing or swelling of the face', 'New weakness in an arm or leg (very rare)'],
    faqs: [
      { q: 'Why are there several polio doses?', a: 'Each dose builds stronger protection. The drops (OPV) and the injection (IPV) work together, so your child needs all of them.' },
      { q: 'What if my baby spits out the drops?', a: 'Tell the nurse straight away. If most of the dose came out, they can give it again at the same visit.' },
    ],
  },
  penta: {
    id: 'penta',
    name: 'Pentavalent',
    short: 'Penta',
    numbered: true,
    totalDoses: 3,
    protects: 'diphtheria, tetanus, whooping cough (pertussis), hepatitis B and Hib',
    how: 'Given as one injection in the thigh.',
    common: ['Soreness, redness or a small lump where the needle went in', 'A mild fever or fussiness for a day or two'],
    getHelp: ['Trouble breathing or swelling of the face', 'A seizure, a very high fever, or crying that will not stop for 3 hours or more'],
    faqs: [
      { q: 'Can I give something for the fever?', a: 'Ask the clinician at the visit which medicine and dose are right for your child’s weight. Give plenty of breastfeeds or fluids.' },
      { q: 'Why five diseases in one injection?', a: 'Combining them means fewer injections for your baby while giving the same protection.' },
    ],
  },
  pcv: {
    id: 'pcv',
    name: 'PCV',
    short: 'PCV',
    numbered: true,
    totalDoses: 3,
    protects: 'pneumococcal disease, including pneumonia, meningitis and ear infections',
    how: 'Given as one injection in the thigh.',
    common: ['Soreness or redness where the needle went in', 'A mild fever, sleepiness or less appetite for a day'],
    getHelp: ['Trouble breathing or swelling of the face', 'A seizure or a very high fever'],
    faqs: [{ q: 'Is it given with other vaccines?', a: 'Yes. In Kenya PCV is given at 6, 10 and 14 weeks, on the same day as Pentavalent, OPV and Rotavirus.' }],
  },
  rota: {
    id: 'rota',
    name: 'Rotavirus',
    short: 'Rota',
    numbered: true,
    totalDoses: 2,
    protects: 'severe diarrhoea caused by rotavirus',
    how: 'Given as drops in the mouth.',
    common: ['Mild diarrhoea, irritability or a little vomiting for a day or two'],
    getHelp: ['Strong tummy pain with repeated crying, drawing up the legs or vomiting', 'Blood in the stool, or a baby who is very weak or not feeding'],
    faqs: [{ q: 'Is there an age limit?', a: 'Yes. Rotavirus doses need to be given while your baby is young, so try not to miss the 6 and 10 week visits.' }],
  },
  ipv: {
    id: 'ipv',
    name: 'IPV',
    short: 'IPV',
    numbered: false,
    totalDoses: 1,
    protects: 'polio',
    how: 'Given as one injection in the thigh at 14 weeks.',
    common: ['Soreness or redness where the needle went in'],
    getHelp: ['Trouble breathing or swelling of the face'],
    faqs: [{ q: 'My child already had polio drops. Why the injection too?', a: 'The injection (IPV) adds a different kind of protection to the drops (OPV). Together they protect better than either alone.' }],
  },
  mr: {
    id: 'mr',
    name: 'Measles-Rubella',
    short: 'MR',
    numbered: true,
    totalDoses: 2,
    protects: 'measles and rubella (German measles)',
    how: 'Given as one injection in the upper arm.',
    common: ['Soreness or redness where the needle went in', 'A mild fever or faint rash 1–2 weeks later'],
    getHelp: ['Trouble breathing or swelling of the face', 'A seizure or a very high fever'],
    faqs: [
      { q: 'Why are two doses needed?', a: 'The second dose protects children who did not build full protection from the first. Together the two doses give long-lasting protection against measles and rubella.' },
      { q: 'My child is unwell — can we still go?', a: 'A mild cold or a low fever is usually not a reason to delay. Tell the clinician at the visit; they will check your child first.' },
      { q: 'Can it be given with other vaccines?', a: 'Yes. Measles-Rubella can safely be given on the same day as other vaccines and Vitamin A. The clinician will tell you which doses are due.' },
    ],
  },
  vita: {
    id: 'vita',
    name: 'Vitamin A',
    short: 'Vit A',
    numbered: false,
    totalDoses: null,
    supplement: true,
    protects: 'serious infections and night blindness, by keeping the immune system and eyes healthy',
    how: 'Given as drops from a capsule, by mouth, every 6 months from 6 months to 5 years.',
    common: ['Usually no side effects', 'Sometimes a mild headache, sleepiness or vomiting on the same day'],
    getHelp: ['Repeated vomiting or a child who is very drowsy', 'A bulging soft spot on a baby’s head'],
    faqs: [
      { q: 'Is Vitamin A a vaccine?', a: 'No. It is a supplement given on the Kenya KEPI schedule every 6 months from 6 months to 5 years, usually at the same visits as vaccines.' },
      { q: 'A dose was missed. Is it too late?', a: 'No. Ask for a catch-up dose at your next visit. The clinic will record it and the next dose will follow 6 months later.' },
      { q: 'Can it be given with other vaccines?', a: 'Yes. Vitamin A can be given on the same day as any vaccine on the schedule.' },
    ],
  },

  /* Optional vaccines Tumaini Family Hospital offers at a cost. Planned only if the parent opts in. */
  tcv: {
    id: 'tcv',
    name: 'Typhoid conjugate',
    short: 'TCV',
    numbered: false,
    totalDoses: 1,
    optional: true,
    price: 'KSh 2,500',
    schedule: [{ dose: null, at: { months: 9 }, ageLabel: '9 months' }],
    protects: 'typhoid fever',
    how: 'One injection in the thigh or upper arm, from 9 months. Can be given with Measles-Rubella.',
    common: ['Soreness where the needle went in', 'A mild fever for a day'],
    getHelp: ['Trouble breathing or swelling of the face', 'A very high fever'],
    faqs: [{ q: 'Is it on the free KEPI schedule?', a: 'Not at Tumaini Family Hospital. It is an optional vaccine you pay for. Ask the clinic if you would like to talk it through first.' }],
  },
  varicella: {
    id: 'varicella',
    name: 'Varicella (chickenpox)',
    short: 'Varicella',
    numbered: false,
    totalDoses: 1,
    optional: true,
    price: 'KSh 5,800',
    schedule: [{ dose: null, at: { months: 12 }, ageLabel: '12 months' }],
    protects: 'chickenpox',
    how: 'One injection in the upper arm from 12 months.',
    common: ['Soreness where the needle went in', 'A few spots or a mild fever 1–3 weeks later'],
    getHelp: ['Trouble breathing or swelling of the face', 'A widespread rash with fever'],
    faqs: [{ q: 'Is one dose enough?', a: 'One dose prevents most severe chickenpox. The clinic can advise on a second dose before school age.' }],
  },
  hepa: {
    id: 'hepa',
    name: 'Hepatitis A',
    short: 'Hep A',
    numbered: true,
    totalDoses: 2,
    optional: true,
    price: 'KSh 4,200 per dose',
    schedule: [
      { dose: 1, at: { months: 12 }, ageLabel: '12 months' },
      { dose: 2, at: { months: 18 }, ageLabel: '18 months' },
    ],
    protects: 'hepatitis A, a liver infection spread through food and water',
    how: 'Two injections in the thigh or upper arm, 6 months apart, from 12 months.',
    common: ['Soreness where the needle went in', 'Tiredness or less appetite for a day'],
    getHelp: ['Trouble breathing or swelling of the face'],
    faqs: [{ q: 'Why two doses?', a: 'The second dose gives long-lasting protection, usually for many years.' }],
  },
  flu: {
    id: 'flu',
    name: 'Influenza',
    short: 'Flu',
    numbered: true,
    totalDoses: 2,
    optional: true,
    price: 'KSh 2,000 per dose',
    schedule: [
      { dose: 1, at: { months: 6 }, ageLabel: 'From 6 months' },
      { dose: 2, after: { days: 28 }, ageLabel: '4 weeks after dose 1' },
    ],
    protects: 'seasonal flu',
    how: 'A child’s first flu vaccination is two injections 4 weeks apart, then one dose each year.',
    common: ['Soreness where the needle went in', 'A mild fever or aches for a day'],
    getHelp: ['Trouble breathing or swelling of the face', 'A very high fever'],
    faqs: [{ q: 'Does it give my child flu?', a: 'No. The injection cannot cause flu. A mild fever for a day is the body building protection.' }],
  },
}

export const OPTIONAL_VACCINE_IDS = ['tcv', 'varicella', 'hepa', 'flu']

/** The KEPI schedule in the order a child receives it, with the age each dose is due. */
export const kepiSchedule = [
  { vaccineId: 'bcg', dose: null, at: { days: 0 }, ageLabel: 'Birth' },
  { vaccineId: 'opv', dose: 0, at: { days: 0 }, ageLabel: 'Birth' },
  { vaccineId: 'opv', dose: 1, at: { days: 42 }, ageLabel: '6 weeks' },
  { vaccineId: 'penta', dose: 1, at: { days: 42 }, ageLabel: '6 weeks' },
  { vaccineId: 'pcv', dose: 1, at: { days: 42 }, ageLabel: '6 weeks' },
  { vaccineId: 'rota', dose: 1, at: { days: 42 }, ageLabel: '6 weeks' },
  { vaccineId: 'opv', dose: 2, at: { days: 70 }, ageLabel: '10 weeks' },
  { vaccineId: 'penta', dose: 2, at: { days: 70 }, ageLabel: '10 weeks' },
  { vaccineId: 'pcv', dose: 2, at: { days: 70 }, ageLabel: '10 weeks' },
  { vaccineId: 'rota', dose: 2, at: { days: 70 }, ageLabel: '10 weeks' },
  { vaccineId: 'opv', dose: 3, at: { days: 98 }, ageLabel: '14 weeks' },
  { vaccineId: 'penta', dose: 3, at: { days: 98 }, ageLabel: '14 weeks' },
  { vaccineId: 'pcv', dose: 3, at: { days: 98 }, ageLabel: '14 weeks' },
  { vaccineId: 'ipv', dose: null, at: { days: 98 }, ageLabel: '14 weeks' },
  { vaccineId: 'vita', dose: 6, at: { months: 6 }, ageLabel: '6 months' },
  { vaccineId: 'mr', dose: 1, at: { months: 9 }, ageLabel: '9 months' },
  { vaccineId: 'vita', dose: 12, at: { months: 12 }, ageLabel: '12 months' },
  { vaccineId: 'mr', dose: 2, at: { months: 18 }, ageLabel: '18 months' },
  { vaccineId: 'vita', dose: 18, at: { months: 18 }, ageLabel: '18 months' },
  { vaccineId: 'vita', dose: 24, at: { months: 24 }, ageLabel: '24 months' },
  { vaccineId: 'vita', dose: 30, at: { months: 30 }, ageLabel: '30 months' },
  { vaccineId: 'vita', dose: 36, at: { months: 36 }, ageLabel: '36 months' },
  { vaccineId: 'vita', dose: 42, at: { months: 42 }, ageLabel: '42 months' },
  { vaccineId: 'vita', dose: 48, at: { months: 48 }, ageLabel: '48 months' },
  { vaccineId: 'vita', dose: 54, at: { months: 54 }, ageLabel: '54 months' },
]

/** Names for a dose: { name: 'Pentavalent 2', short: 'Penta 2', title: 'Pentavalent · Dose 2' }. */
export function doseNames(vaccineId, dose) {
  const v = vaccines[vaccineId]
  if (vaccineId === 'vita') {
    return { name: `Vitamin A (${dose} months)`, short: `Vit A ${dose} mo`, title: `Vitamin A · ${dose} months` }
  }
  if (!v.numbered || dose === null) return { name: v.name, short: v.short, title: v.name }
  return { name: `${v.name} ${dose}`, short: `${v.short} ${dose}`, title: `${v.name} · Dose ${dose}` }
}

export function doseRecord(childId, vaccineId, dose, ageLabel, fields) {
  const key = dose === null ? vaccineId : `${vaccineId}-${dose}`
  return {
    id: `${childId}-${key}`,
    childId,
    vaccineId,
    doseNumber: dose,
    ageLabel,
    ...doseNames(vaccineId, dose),
    optional: Boolean(vaccines[vaccineId].optional),
    dueOn: null,
    givenOn: null,
    batch: null,
    givenBy: null,
    facilityLabel: null,
    appointmentId: null,
    tableGroup: null,
    cardGroup: null,
    ...fields,
  }
}

/** Generates a child's KEPI doses from their date of birth (used for Baraka and linked records). */
export function generateKepiDoses(childId, dob, { givenUntil, givenBy, facilityLabel, batchSeed = 7 }) {
  let seed = batchSeed
  const nextBatch = (prefix) => {
    seed = (seed * 9301 + 49297) % 233280
    return `${prefix}-${String(seed % 100000).padStart(5, '0')}`
  }
  const prefixes = { bcg: 'BCG', opv: 'bOPV', penta: 'PNT', pcv: 'PCV10', rota: 'ROTA', ipv: 'IPV', mr: 'MR', vita: 'VTA' }
  return kepiSchedule.map((entry) => {
    const due = entry.at.months ? addMonths(dob, entry.at.months) : addDays(dob, entry.at.days)
    const given = toDate(due) <= toDate(givenUntil)
    return doseRecord(childId, entry.vaccineId, entry.dose, entry.ageLabel, {
      dueOn: toISODate(due),
      givenOn: given ? toISODate(due) : null,
      batch: given ? nextBatch(prefixes[entry.vaccineId]) : null,
      givenBy: given ? (entry.at.days === 0 ? MWANGI : givenBy) : null,
      facilityLabel: given ? (entry.at.days === 0 ? MATERNITY : facilityLabel) : null,
    })
  })
}

/** Maternal vaccine information (Td in pregnancy). */
export const maternalVaccineInfo = {
  td: {
    name: 'Tetanus-diphtheria (Td)',
    short: 'Td',
    protects: 'tetanus and diphtheria for you, and tetanus for your newborn baby in the first weeks of life',
    how: 'One injection in the upper arm. Five doses over the years give lifelong protection.',
    schedule: [
      'Td 1: at your first antenatal visit',
      'Td 2: at least 4 weeks after Td 1',
      'Td 3: at least 6 months after Td 2, or in your next pregnancy',
      'Td 4 and Td 5: at least 1 year apart, or in later pregnancies',
    ],
  },
}

/* ------------------------------------------------------- shared registry */

export const credentials = [
  { userId: 'cg-wanjiru', phone: '712345678', email: 'wanjiru.kamau@example.co.ke', password: 'Amani2026!' },
  { userId: 'cg-njeri', phone: '723118406', email: 'njeri.mwangi@example.co.ke', password: 'Njeri2026!' },
]

/** Hospital records a parent can link from "Add a child" (patient ID + date of birth). */
export const clinicRegistry = [
  { patientId: 'TFH-P-260209-014', dob: '2026-02-09', firstName: 'Amani', lastName: 'Kamau', sex: 'female', facilityId: 'tfh', linkedTo: { accountId: 'cg-wanjiru', childId: 'amani' } },
  { patientId: 'TFH-P-230721-019', dob: '2023-07-21', firstName: 'Baraka', lastName: 'Mwangi', sex: 'male', facilityId: 'tfh', linkedTo: { accountId: 'cg-njeri', childId: 'baraka' } },
  { patientId: 'TFH-P-250118-007', dob: '2025-01-18', firstName: 'Jabari', lastName: 'Kamau', sex: 'male', facilityId: 'tfh', birthWeightKg: 3.4, birthLengthCm: 50, linkedTo: null },
]

/* ======================================================= Wanjiru Kamau */

function wanjiruAccount() {
  const amaniDoses = [
    doseRecord('amani', 'bcg', null, 'Birth', { dueOn: '2026-02-09', givenOn: '2026-02-09', batch: 'BCG-24K117', givenBy: MWANGI, facilityLabel: MATERNITY, tableGroup: 'birth' }),
    doseRecord('amani', 'opv', 0, 'Birth', { dueOn: '2026-02-09', givenOn: '2026-02-09', batch: 'bOPV-0126-J9', givenBy: MWANGI, facilityLabel: MATERNITY, tableGroup: 'birth' }),
    doseRecord('amani', 'opv', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'bOPV-0226-J4', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, tableGroup: '6w', cardGroup: '6w' }),
    doseRecord('amani', 'penta', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'PNT-25A1187', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, tableGroup: '6w', cardGroup: '6w' }),
    doseRecord('amani', 'pcv', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'PCV10-85520', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, tableGroup: '6w', cardGroup: '6w' }),
    doseRecord('amani', 'rota', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'ROTA-5390C', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, tableGroup: '6w', cardGroup: '6w' }),
    doseRecord('amani', 'opv', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'bOPV-0326-K2', givenBy: MWANGI, facilityLabel: FACILITY_LABEL }),
    doseRecord('amani', 'penta', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'PNT-25B2870', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, cardGroup: '10w' }),
    doseRecord('amani', 'pcv', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'PCV10-87106', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, cardGroup: '10w' }),
    doseRecord('amani', 'rota', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'ROTA-5514A', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, cardGroup: '10w' }),
    doseRecord('amani', 'opv', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'bOPV-0426-K7', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, appointmentId: 'appt-a-0518' }),
    doseRecord('amani', 'penta', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'PNT-25B3391', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, appointmentId: 'appt-a-0518' }),
    doseRecord('amani', 'pcv', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'PCV10-88412', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, appointmentId: 'appt-a-0518', cardGroup: '14w' }),
    doseRecord('amani', 'ipv', null, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'IPV-24C0193', givenBy: MWANGI, facilityLabel: FACILITY_LABEL, appointmentId: 'appt-a-0518', cardGroup: '14w' }),
    doseRecord('amani', 'vita', 6, '6 months', { dueOn: '2026-08-09', appointmentId: 'appt-a-1109' }),
    doseRecord('amani', 'mr', 1, '9 months', { dueOn: '2026-11-09', appointmentId: 'appt-a-1109' }),
    doseRecord('amani', 'vita', 12, '12 months', { dueOn: '2027-02-09', appointmentId: 'appt-a-0209' }),
    doseRecord('amani', 'mr', 2, '18 months', { dueOn: '2027-08-09' }),
  ]

  return {
    caregiver: {
      id: 'cg-wanjiru',
      firstName: 'Wanjiru',
      lastName: 'Kamau',
      fullName: 'Wanjiru Kamau',
      relationship: 'Mother',
      phone: '712345678',
      email: 'wanjiru.kamau@example.co.ke',
      county: 'Kiambu',
      memberSince: '2026-02-09',
      avatarTone: 'pink',
    },
    mother: {
      dob: '1996-04-17',
      tracking: 'baby',
      bloodGroup: 'O+',
      patientId: 'TFH-M-960417-031',
      nkda: { note: 'No known drug allergies', updatedBy: WANJALA, updatedAt: '2025-08-02T10:15' },
      allergies: [],
      conditions: [
        {
          id: 'cond-w-1',
          name: 'Mild anaemia after delivery',
          detail: 'Haemoglobin 10.4 g/dL on 10 Feb 2026. Back to 12.2 g/dL on 23 Mar 2026.',
          status: 'Resolved',
          source: 'clinician',
          updatedBy: WANJALA,
          updatedAt: '2026-03-23T11:40',
        },
      ],
      medicines: [
        { id: 'med-w-1', name: 'Multivitamin', directions: 'One tablet daily', source: 'self', updatedBy: 'You', updatedAt: '2026-06-01T08:00' },
        {
          id: 'med-w-2',
          name: 'Contraceptive implant (etonogestrel)',
          directions: 'Inserted 23 Mar 2026 · protects for 3 years',
          source: 'clinician',
          updatedBy: WANJALA,
          updatedAt: '2026-03-23T11:42',
        },
      ],
      pregnancyHistory: [
        {
          id: 'ph-w-1',
          year: 2026,
          outcome: 'Live birth (girl)',
          delivery: 'Spontaneous vaginal delivery',
          babyWeightKg: 3.2,
          gestation: '39+2',
          place: FACILITY_LABEL,
          childId: 'amani',
          source: 'clinician',
          updatedBy: WANJALA,
          updatedAt: '2026-02-09T06:10',
        },
      ],
    },
    pregnancy: {
      id: 'preg-w-1',
      lmp: '2025-05-10',
      edd: '2026-02-14',
      gravida: 1,
      para: 0,
      status: 'delivered',
      ancVisits: [
        anc('w', 1, '2025-08-02', '12+0', WANJALA, { bp: [110, 70], weight: 58.2, fh: null, fhr: 156, hb: 12.4, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)'], td: 'Td 1', note: 'Everything looks normal. Take one iron and folic acid tablet every day.', next: '2025-09-27' }),
        anc('w', 2, '2025-09-27', '20+0', MWANGI, { bp: [112, 72], weight: 60.6, fh: 20, fhr: 150, hb: null, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Deworming (mebendazole)'], td: 'Td 2', note: 'Baby is growing well. Anatomy scan normal.', next: '2025-11-08' }),
        anc('w', 3, '2025-11-08', '26+0', WANJALA, { bp: [114, 72], weight: 62.9, fh: 26, fhr: 146, hb: 11.8, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium'], note: 'Sugar test normal. Keep taking iron and calcium.', next: '2025-12-06' }),
        anc('w', 4, '2025-12-06', '30+0', WANJALA, { bp: [116, 74], weight: 64.8, fh: 30, fhr: 142, hb: 11.5, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium'], note: 'Birth plan: Tumaini Maternity. Count kicks every evening.', next: '2026-01-03' }),
        anc('w', 5, '2026-01-03', '34+0', MWANGI, { bp: [118, 76], weight: 66.5, fh: 34, fhr: 140, hb: null, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium'], note: 'Baby is head down. Pack your hospital bag.', next: '2026-01-17' }),
        anc('w', 6, '2026-01-17', '36+0', WANJALA, { bp: [118, 78], weight: 67.4, fh: 35, fhr: 144, hb: 11.2, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium'], note: 'All normal. Come in when contractions are regular.', next: '2026-01-31' }),
        anc('w', 7, '2026-01-31', '38+0', MWANGI, { bp: [120, 78], weight: 68.0, fh: 37, fhr: 138, hb: null, protein: 'Trace', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)'], note: 'Trace of protein, blood pressure normal. Recheck if you get a headache or swelling.', next: '2026-02-14' }),
      ],
    },
    delivery: {
      date: '2026-02-09',
      time: '04:35',
      place: `${FACILITY_LABEL} (maternity)`,
      mode: 'Spontaneous vaginal delivery',
      gestation: '39+2',
      outcome: 'Live birth, girl',
      babyWeightKg: 3.2,
      babyLengthCm: 49,
      apgar: '9 and 10',
      bloodLoss: 'Normal (about 300 ml)',
      attendedBy: [MWANGI, WANJALA],
      childId: 'amani',
    },
    postnatalVisits: [
      {
        id: 'pnc-w-48h',
        key: '48h',
        date: '2026-02-10T09:00',
        clinician: WANJALA,
        mother: { bp: '118/76', tempC: 36.8, weightKg: 66.0, uterus: 'Well contracted', bleeding: 'Normal lochia', perineum: 'Small tear, healing well', breasts: 'Soft, breastfeeding well', mood: 'Tired but well', hb: 10.4 },
        baby: { weightKg: 3.1, feeding: 'Breastfeeding 8–10 times a day', cord: 'Clean and dry', jaundice: 'None', tempC: 36.9 },
        familyPlanning: null,
        note: 'Mild anaemia (Hb 10.4). Started iron and folic acid; we will recheck at 6 weeks.',
      },
      {
        id: 'pnc-w-2w',
        key: '1-2w',
        date: '2026-02-20T10:00',
        clinician: MWANGI,
        mother: { bp: '116/74', tempC: 36.7, weightKg: 64.2, uterus: 'Involuting normally', bleeding: 'Light', perineum: 'Healed', breasts: 'No problems', mood: 'Depression screen (EPDS) 4 — no concerns', hb: null },
        baby: { weightKg: 3.4, feeding: 'Exclusive breastfeeding', cord: 'Fallen off, clean', jaundice: 'None', tempC: 36.8 },
        familyPlanning: 'Talked about options to start at 6 weeks.',
        note: 'Recovering well. Amani has regained her birth weight.',
      },
      {
        id: 'pnc-w-6w',
        key: '4-6w',
        date: '2026-03-23T10:30',
        clinician: WANJALA,
        mother: { bp: '112/72', tempC: 36.6, weightKg: 63.5, uterus: 'Back to normal size', bleeding: 'Stopped', perineum: 'Healed', breasts: 'No problems', mood: 'EPDS 3 — feeling well', hb: 12.2 },
        baby: { weightKg: 4.7, feeding: 'Exclusive breastfeeding', cord: '—', jaundice: 'None', tempC: 36.7 },
        familyPlanning: 'Chose a contraceptive implant; inserted today. It protects for 3 years and can be removed whenever you choose.',
        note: 'Anaemia resolved (Hb 12.2). You can stop the iron tablets at the end of this pack. Postnatal care complete.',
      },
    ],
    maternalVaccines: [
      { id: 'td-w-1', vaccine: 'td', dose: 1, givenOn: '2025-08-02', batch: 'TD-25C0412', givenBy: WANJALA, note: 'At your first antenatal visit' },
      { id: 'td-w-2', vaccine: 'td', dose: 2, givenOn: '2025-09-27', batch: 'TD-25D0871', givenBy: MWANGI, note: '8 weeks after Td 1' },
      { id: 'td-w-3', vaccine: 'td', dose: 3, givenOn: null, earliestOn: '2026-03-27', note: 'At least 6 months after Td 2 — can be given at any visit, or in your next pregnancy' },
    ],
    children: [
      {
        id: 'amani',
        firstName: 'Amani',
        lastName: 'Kamau',
        sex: 'female',
        dob: '2026-02-09',
        patientId: 'TFH-P-260209-014',
        facilityId: 'tfh',
        bornAt: FACILITY_LABEL,
        birthWeightKg: 3.2,
        birthLengthCm: 49,
        mainClinicianId: 'achieng-otieno',
        tone: 'teal',
        recordStatus: 'linked',
        allergies: [{ id: 'al-egg', substance: 'Egg', reaction: 'mild skin rash', recordedOn: '2026-09-14' }],
        medicines: [{ id: 'med-vitd', name: 'Vitamin D drops', directions: 'Once daily', since: '2026-03-23' }],
      },
    ],
    doses: amaniDoses,
    measurements: [
      { id: 'gm-a-1', childId: 'amani', date: '2026-02-09', weightKg: 3.2, heightCm: 49.0, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-a-2', childId: 'amani', date: '2026-03-23', weightKg: 4.7, heightCm: 55.0, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-a-3', childId: 'amani', date: '2026-04-20', weightKg: 5.6, heightCm: 58.5, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-a-4', childId: 'amani', date: '2026-05-18', weightKg: 6.4, heightCm: 61.5, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-a-5', childId: 'amani', date: '2026-09-14', weightKg: 7.8, heightCm: 67.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'tfh' },
      { id: 'gm-a-6', childId: 'amani', date: '2026-10-12', weightKg: 8.2, heightCm: 69.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'tfh' },
    ],
    appointments: [
      appt('appt-a-1109', 'amani', '2026-11-09T10:00', 'Measles-Rubella 1 + Vitamin A catch-up', 'achieng-otieno', 'vaccination', {
        location: 'Child Health Clinic, Room 2',
        ref: 'TFH-A-10942',
        note: 'Please bring the Mother & Child Health handbook.',
        doseIds: ['amani-mr-1', 'amani-vita-6'],
      }),
      appt('appt-a-0209', 'amani', '2027-02-09T09:30', '12-month check & Vitamin A', 'achieng-otieno', 'growth', {
        location: 'Child Health Clinic, Room 2',
        ref: 'TFH-A-11208',
        doseIds: ['amani-vita-12'],
      }),
      appt('req-a-growth', 'amani', '2026-11-17T09:00', 'Growth check', 'achieng-otieno', 'growth', {
        status: 'requested',
        ref: 'TFH-R-20417',
        note: 'Her weight check is due. Mornings suit us best.',
        requestedAt: '2026-11-07T19:12',
        proposal: {
          start: '2026-11-18T11:00',
          clinicianId: 'achieng-otieno',
          note: 'Dr. Otieno is not at the clinic on Tuesday morning. Wednesday 18 Nov at 11:00 is free.',
          at: '2026-11-08T12:30',
        },
      }),
      appt('req-me-fp', 'me', '2026-11-12T10:00', 'Postnatal & family planning review', 'grace-wanjala', 'postnatal', {
        status: 'requested',
        ref: 'TFH-R-20431',
        note: 'I’d like to talk about my implant and some lower back pain.',
        requestedAt: '2026-11-08T19:55',
      }),
      appt('req-me-sun', 'me', '2026-11-01T10:00', 'General consultation', null, 'general', {
        status: 'declined',
        ref: 'TFH-R-20288',
        note: 'Headaches in the evenings.',
        requestedAt: '2026-10-30T09:12',
        summary: 'The outpatient clinic is closed on Sundays. Please choose another day.',
      }),
      appt('appt-a-1012', 'amani', '2026-10-12T09:00', '8-month growth check', 'achieng-otieno', 'growth', {
        location: 'Child Health Clinic, Room 2',
        ref: 'TFH-A-10511',
        summary: 'Weight 8.2 kg and height 69.0 cm. Growing well along her curve.',
        status: 'completed',
      }),
      appt('appt-a-0914', 'amani', '2026-09-14T11:30', 'Cough review', 'achieng-otieno', 'sick', {
        location: 'Paediatric outpatients',
        ref: 'TFH-A-10187',
        summary: 'Mild cough, chest clear. Egg allergy (mild skin rash) added to her record.',
        status: 'completed',
      }),
      appt('appt-a-0810', 'amani', '2026-08-10T09:00', '6-month visit', 'joseph-mwangi', 'vaccination', {
        location: 'Child Health Clinic, Room 2',
        ref: 'TFH-A-09734',
        summary: 'Cancelled. Vitamin A (6 months) was not given and is now due as a catch-up.',
        status: 'cancelled',
      }),
      appt('appt-a-0518', 'amani', '2026-05-18T10:00', '14-week immunizations', 'joseph-mwangi', 'vaccination', {
        location: 'Child Health Clinic, Room 2',
        ref: 'TFH-A-08215',
        summary: 'OPV 3, Pentavalent 3, PCV 3 and IPV given. Weight 6.4 kg.',
        status: 'completed',
        doseIds: ['amani-opv-3', 'amani-penta-3', 'amani-pcv-3', 'amani-ipv'],
      }),
      appt('appt-me-pnc3', 'me', '2026-03-23T10:30', 'Postnatal check (4–6 weeks)', 'grace-wanjala', 'postnatal', {
        location: 'Maternity clinic, Room 4',
        ref: 'TFH-A-07402',
        summary: 'Anaemia resolved. Contraceptive implant inserted. Postnatal care complete.',
        status: 'completed',
      }),
      appt('appt-me-pnc2', 'me', '2026-02-20T10:00', 'Postnatal check (1–2 weeks)', 'joseph-mwangi', 'postnatal', {
        location: 'Maternity clinic, Room 4',
        ref: 'TFH-A-07015',
        summary: 'Recovering well. Amani back to her birth weight.',
        status: 'completed',
      }),
      appt('appt-me-pnc1', 'me', '2026-02-10T09:00', 'Postnatal check (within 48 hours)', 'grace-wanjala', 'postnatal', {
        location: 'Maternity ward',
        ref: 'TFH-A-06871',
        summary: 'Mild anaemia; iron started.',
        status: 'completed',
      }),
    ],
    conversations: [
      {
        id: 'conv-otieno',
        clinicianId: 'achieng-otieno',
        childId: 'amani',
        messages: [
          { id: 'm-o-1', from: 'clinician', sentAt: '2026-11-06T10:24', body: 'Hello Wanjiru, a reminder that Amani’s Measles-Rubella dose is due on Monday. Please bring her MCH handbook.', read: true },
          { id: 'm-o-2', from: 'caregiver', sentAt: '2026-11-06T10:31', body: 'Thank you daktari, we’ll be there at 10.', read: true },
          { id: 'm-o-3', from: 'caregiver', sentAt: '2026-11-08T19:42', body: 'Amani has had a mild fever since this afternoon (37.9°C). Should we still come tomorrow?', read: true },
          { id: 'm-o-4', from: 'clinician', sentAt: '2026-11-08T20:05', body: 'A mild fever below 38.5°C is usually no reason to delay. Give plenty of fluids and come at 10:00 — I’ll check her before the vaccine.', read: false },
        ],
      },
      {
        id: 'conv-mwangi',
        clinicianId: 'joseph-mwangi',
        childId: 'amani',
        messages: [
          { id: 'm-m-1', from: 'clinician', sentAt: '2026-05-18T10:42', body: 'Amani had her 14-week vaccines today and did very well. Her next dose is Vitamin A at 6 months, on 9 Aug.', read: true },
          { id: 'm-m-2', from: 'caregiver', sentAt: '2026-05-18T11:05', body: 'Asante sana, we will come in August.', read: true },
          { id: 'm-m-3', from: 'clinician', sentAt: '2026-11-08T16:12', body: 'Amani’s 6-month Vitamin A dose is overdue — we can give it at tomorrow’s visit together with Measles-Rubella.', read: false },
        ],
      },
      {
        id: 'conv-wanjala',
        clinicianId: 'grace-wanjala',
        childId: 'me',
        messages: [
          { id: 'm-w-1', from: 'clinician', sentAt: '2026-03-23T12:10', body: 'Hello Wanjiru, your haemoglobin is back to 12.2 — the anaemia has resolved. You can stop the iron tablets at the end of this pack.', read: true },
          { id: 'm-w-2', from: 'caregiver', sentAt: '2026-03-23T12:31', body: 'Asante daktari! And the implant feels fine.', read: true },
        ],
      },
      {
        id: 'conv-reception',
        clinicianId: 'tfh-reception',
        childId: 'amani',
        messages: [
          { id: 'm-r-1', from: 'clinician', sentAt: '2026-11-06T09:02', body: 'Your appointment on Mon 9 Nov at 10:00 with Dr. Achieng Otieno is confirmed. Reply here if you need to change it.', read: true },
        ],
      },
    ],
    notifications: [
      note('n-1', 'message', 'amani', 'Dr. Achieng Otieno replied', 'A mild fever below 38.5°C is usually no reason to delay. Give plenty of fluids and come at 10:00.', '2026-11-08T20:05', false, { conversationId: 'conv-otieno' }),
      note('n-2', 'vaccine', 'amani', 'Measles-Rubella dose 1 is tomorrow', 'Mon 9 Nov, 10:00 · Tumaini Family Hospital, Room 2', '2026-11-08T18:00', false, { doseId: 'amani-mr-1' }),
      note('n-7', 'request-proposed', 'amani', 'New time proposed for your request', 'Growth check for Amani: Wed 18 Nov at 11:00 instead of Tue 17 Nov. Accept or decline in Visits.', '2026-11-08T12:30', false, { appointmentId: 'req-a-growth' }),
      note('n-3', 'overdue', 'amani', 'Vitamin A (6 months) is overdue', 'Was due 9 Aug. Ask for it at tomorrow’s visit.', '2026-11-08T09:00', true, { doseId: 'amani-vita-6' }),
      note('n-4', 'appointment', 'amani', 'Appointment confirmed', 'Mon 9 Nov at 10:00 with Dr. Achieng Otieno', '2026-11-06T09:02', true, { appointmentId: 'appt-a-1109' }),
      note('n-8', 'request-declined', 'me', 'Appointment request declined', 'General consultation on Sun 1 Nov: the outpatient clinic is closed on Sundays. Please choose another day.', '2026-10-30T16:00', true, { appointmentId: 'req-me-sun' }),
      note('n-5', 'growth', 'amani', 'New growth measurement', '8.2 kg · 69.0 cm, recorded 12 Oct', '2026-10-12T11:00', true, { page: 'health' }),
      note('n-9', 'maternal-vaccine', 'me', 'Td 3 can be given now', 'It is 6 months since your Td 2. Ask for it at any visit, or in your next pregnancy.', '2026-03-27T09:00', true, { page: 'me/vaccines' }),
      note('n-10', 'record', 'me', 'Dr. Grace Wanjala updated your health record', 'Mild anaemia after delivery: marked as resolved. Contraceptive implant added.', '2026-03-23T11:42', true, { page: 'me' }),
      note('n-11', 'postnatal', 'me', 'Postnatal check (4–6 weeks) is tomorrow', 'Mon 23 Mar, 10:30 · Maternity clinic, Room 4', '2026-03-22T18:00', true, { page: 'me/postnatal' }),
    ],
    settings: { reminders: { sms: true, push: true, weeklyEmail: false, timing: '1 day before' }, language: 'en' },
    consent: { since: '2026-02-09', recordedBy: WANJALA, lastViewed: '2026-11-08T16:12' },
    shareLinks: {},
  }
}

/* ========================================================= Njeri Mwangi */

function njeriAccount() {
  const barakaDoses = generateKepiDoses('baraka', '2023-07-21', {
    givenUntil: '2026-11-08',
    givenBy: MWANGI,
    facilityLabel: FACILITY_LABEL,
    batchSeed: 31,
  }).map((d) => (d.id === 'baraka-vita-36' ? { ...d, appointmentId: 'appt-b-0721' } : d))

  return {
    caregiver: {
      id: 'cg-njeri',
      firstName: 'Njeri',
      lastName: 'Mwangi',
      fullName: 'Njeri Mwangi',
      relationship: 'Mother',
      phone: '723118406',
      email: 'njeri.mwangi@example.co.ke',
      county: 'Kiambu',
      memberSince: '2023-07-21',
      avatarTone: 'amber',
    },
    mother: {
      dob: '1999-03-02',
      tracking: 'both',
      bloodGroup: 'A+',
      patientId: 'TFH-M-990302-012',
      nkda: null,
      allergies: [
        { id: 'al-n-1', substance: 'Penicillin', reaction: 'Itchy rash', source: 'clinician', updatedBy: WANJALA, updatedAt: '2026-11-08T14:20' },
      ],
      conditions: [],
      medicines: [
        { id: 'med-n-1', name: 'Iron and folic acid (IFAS)', directions: 'One tablet daily until 3 months after birth', source: 'clinician', updatedBy: WANJALA, updatedAt: '2026-08-01T09:40' },
        { id: 'med-n-2', name: 'Calcium 1.5 g', directions: 'Daily, with food', source: 'clinician', updatedBy: MWANGI, updatedAt: '2026-09-26T10:05' },
        { id: 'med-n-3', name: 'Antacid', directions: 'When needed for heartburn', source: 'self', updatedBy: 'You', updatedAt: '2026-10-14T21:00' },
      ],
      pregnancyHistory: [
        {
          id: 'ph-n-1',
          year: 2023,
          outcome: 'Live birth (boy)',
          delivery: 'Spontaneous vaginal delivery',
          babyWeightKg: 3.1,
          gestation: '39+0',
          place: FACILITY_LABEL,
          childId: 'baraka',
          source: 'clinician',
          updatedBy: WANJALA,
          updatedAt: '2023-07-21T09:30',
        },
      ],
    },
    pregnancy: {
      id: 'preg-n-2',
      lmp: '2026-05-09',
      edd: '2027-02-13',
      gravida: 2,
      para: 1,
      status: 'pregnant',
      ancVisits: [
        anc('n', 1, '2026-08-01', '12+0', WANJALA, { bp: [112, 72], weight: 62.3, fh: null, fhr: 158, hb: 12.1, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)'], note: 'Welcome back! Everything looks normal. Take one iron and folic acid tablet every day. Screening tests done — results are normal.', next: '2026-09-26' }),
        anc('n', 2, '2026-09-26', '20+0', MWANGI, { bp: [116, 74], weight: 65.1, fh: 20, fhr: 148, hb: null, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium', 'Deworming (mebendazole)'], note: 'Baby is growing well and the anatomy scan was normal. Calcium added to protect your blood pressure.', next: '2026-11-07' }),
        anc('n', 3, '2026-11-07', '26+0', WANJALA, { bp: [118, 76], weight: 68.4, fh: 26, fhr: 144, hb: 11.6, protein: 'Negative', glucose: 'Negative', supplements: ['Iron and folic acid (IFAS)', 'Calcium'], note: 'All normal, including your sugar test. Keep taking iron and calcium. From 28 weeks, count baby’s kicks every evening.', next: '2026-12-05' }),
      ],
    },
    delivery: null,
    postnatalVisits: [],
    maternalVaccines: [
      { id: 'td-n-1', vaccine: 'td', dose: 1, givenOn: '2023-02-11', batch: 'TD-22K0315', givenBy: WANJALA, note: 'In your first pregnancy' },
      { id: 'td-n-2', vaccine: 'td', dose: 2, givenOn: '2023-03-11', batch: 'TD-23A0128', givenBy: MWANGI, note: '4 weeks after Td 1' },
      { id: 'td-n-3', vaccine: 'td', dose: 3, givenOn: null, dueOn: '2026-12-05', latestOn: '2027-01-30', note: 'Planned for your 30-week visit — at least 2 weeks before your due date' },
    ],
    children: [
      {
        id: 'baraka',
        firstName: 'Baraka',
        lastName: 'Mwangi',
        sex: 'male',
        dob: '2023-07-21',
        patientId: 'TFH-P-230721-019',
        facilityId: 'tfh',
        bornAt: FACILITY_LABEL,
        birthWeightKg: 3.1,
        birthLengthCm: 50,
        mainClinicianId: 'achieng-otieno',
        tone: 'indigo',
        recordStatus: 'linked',
        allergies: [],
        medicines: [],
      },
    ],
    doses: barakaDoses,
    measurements: [
      { id: 'gm-b-1', childId: 'baraka', date: '2023-07-21', weightKg: 3.1, heightCm: 50.0, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-b-2', childId: 'baraka', date: '2024-01-22', weightKg: 7.9, heightCm: 67.5, measuredBy: MWANGI, facilityId: 'tfh' },
      { id: 'gm-b-3', childId: 'baraka', date: '2024-07-22', weightKg: 10.2, heightCm: 76.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'tfh' },
      { id: 'gm-b-4', childId: 'baraka', date: '2025-07-21', weightKg: 12.6, heightCm: 88.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'tfh' },
      { id: 'gm-b-5', childId: 'baraka', date: '2026-07-21', weightKg: 14.3, heightCm: 96.0, measuredBy: MWANGI, facilityId: 'tfh' },
    ],
    appointments: [
      appt('appt-n-anc4', 'me', '2026-12-05T09:30', 'Antenatal visit (30 weeks)', 'grace-wanjala', 'antenatal', {
        location: 'Antenatal clinic, Room 4',
        ref: 'TFH-A-11533',
        note: 'Bring your MCH handbook. Td 3 is planned at this visit.',
      }),
      appt('req-n-baraka', 'baraka', '2026-11-10T10:30', 'Sick visit', null, 'sick', {
        status: 'requested',
        ref: 'TFH-R-20436',
        note: 'Baraka has had a cough and runny nose for 4 days. No fever.',
        requestedAt: '2026-11-08T08:52',
      }),
      appt('appt-n-anc3', 'me', '2026-11-07T10:00', 'Antenatal visit (26 weeks)', 'grace-wanjala', 'antenatal', {
        location: 'Antenatal clinic, Room 4',
        ref: 'TFH-A-11204',
        summary: 'BP 118/76, weight 68.4 kg, baby’s heartbeat 144. All normal.',
        status: 'completed',
      }),
      appt('appt-n-anc2', 'me', '2026-09-26T09:30', 'Antenatal visit (20 weeks)', 'joseph-mwangi', 'antenatal', {
        location: 'Antenatal clinic, Room 4',
        ref: 'TFH-A-10388',
        summary: 'Anatomy scan normal. Calcium added.',
        status: 'completed',
      }),
      appt('appt-n-anc1', 'me', '2026-08-01T09:00', 'First antenatal visit (12 weeks)', 'grace-wanjala', 'antenatal', {
        location: 'Antenatal clinic, Room 4',
        ref: 'TFH-A-09611',
        summary: 'Booking visit. Screening tests normal; iron and folic acid started.',
        status: 'completed',
      }),
      appt('appt-b-0721', 'baraka', '2026-07-21T09:00', '3-year check & Vitamin A', 'joseph-mwangi', 'growth', {
        location: 'Child Health Clinic, Room 1',
        ref: 'TFH-A-09450',
        summary: 'Weight 14.3 kg, height 96 cm. Vitamin A given.',
        status: 'completed',
        doseIds: ['baraka-vita-36'],
      }),
    ],
    conversations: [
      {
        id: 'conv-n-wanjala',
        clinicianId: 'grace-wanjala',
        childId: 'me',
        messages: [
          { id: 'm-nw-1', from: 'caregiver', sentAt: '2026-11-06T18:40', body: 'Good evening daktari. Is it normal for the baby to move less in the afternoon and more at night?', read: true },
          { id: 'm-nw-2', from: 'clinician', sentAt: '2026-11-06T19:15', body: 'Yes, that is common — babies are often more active when you rest. From 28 weeks, count kicks in the evening: at least 10 in 2 hours. If you notice fewer movements, come in straight away.', read: true },
          { id: 'm-nw-3', from: 'clinician', sentAt: '2026-11-07T11:30', body: 'Today’s check was all normal, Njeri. I have added your penicillin allergy to your record. See you on Sat 5 Dec for your 30-week visit.', read: false },
        ],
      },
      {
        id: 'conv-n-reception',
        clinicianId: 'tfh-reception',
        childId: 'baraka',
        messages: [
          { id: 'm-nr-1', from: 'clinician', sentAt: '2026-11-08T09:05', body: 'We have received your request for Baraka (sick visit). We will confirm a time by Monday morning.', read: false },
        ],
      },
    ],
    notifications: [
      note('n-n-1', 'record', 'me', 'Dr. Grace Wanjala updated your health record', 'Added an allergy: Penicillin (itchy rash).', '2026-11-08T14:20', false, { page: 'me' }),
      note('n-n-2', 'appointment', 'baraka', 'Request received', 'Sick visit for Baraka, Tue 10 Nov at 10:30. Waiting for the hospital to confirm.', '2026-11-08T08:52', false, { appointmentId: 'req-n-baraka' }),
      note('n-n-3', 'antenatal', 'me', 'Your next antenatal visit', 'Antenatal visit (30 weeks) on Sat 5 Dec at 09:30 with Dr. Grace Wanjala.', '2026-11-07T12:00', false, { appointmentId: 'appt-n-anc4' }),
      note('n-n-4', 'message', 'me', 'Dr. Grace Wanjala sent a message', 'Today’s check was all normal, Njeri.', '2026-11-07T11:30', true, { conversationId: 'conv-n-wanjala' }),
      note('n-n-5', 'maternal-vaccine', 'me', 'Td 3 is planned at your 30-week visit', 'Sat 5 Dec. It protects you and your newborn against tetanus.', '2026-11-07T12:05', true, { page: 'me/vaccines' }),
      note('n-n-6', 'request-confirmed', 'me', 'Appointment request confirmed', 'Antenatal visit (30 weeks) · Sat 5 Dec at 09:30 with Dr. Grace Wanjala.', '2026-11-07T15:10', true, { appointmentId: 'appt-n-anc4' }),
    ],
    settings: { reminders: { sms: true, push: true, weeklyEmail: true, timing: '1 day before' }, language: 'sw' },
    consent: { since: '2023-07-21', recordedBy: MWANGI, lastViewed: '2026-11-08T14:20' },
    shareLinks: {},
  }
}

/* --------------------------------------------------------------- helpers */

function anc(prefix, n, date, ga, clinician, f) {
  return {
    id: `anc-${prefix}-${n}`,
    contact: n,
    date,
    ga,
    clinician,
    bpSystolic: f.bp[0],
    bpDiastolic: f.bp[1],
    weightKg: f.weight,
    fundalHeightCm: f.fh,
    fetalHeartRate: f.fhr,
    hb: f.hb,
    urineProtein: f.protein,
    urineGlucose: f.glucose,
    supplements: f.supplements,
    tdGiven: f.td ?? null,
    noteForMother: f.note,
    nextVisitOn: f.next,
  }
}

function appt(id, childId, start, title, clinicianId, visitType, extra = {}) {
  return {
    id,
    childId,
    start,
    title,
    clinicianId,
    visitType,
    facilityId: 'tfh',
    location: null,
    ref: null,
    note: null,
    status: 'scheduled',
    doseIds: [],
    ...extra,
  }
}

function note(id, type, childId, title, body, createdAt, read, target) {
  return { id, type, childId, title, body, createdAt, read, target }
}

export const counties = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

export const helpTopics = ['Getting started', 'Pregnancy', 'Vaccines', 'Appointments', 'Privacy', 'Account']

export const helpArticles = [
  {
    id: 'faq-link-record',
    topic: 'Getting started',
    question: 'How do I link my child’s hospital record?',
    answer: 'Go to Settings, then Add a child, and choose “Link a hospital record”. Enter the patient ID from the MCH handbook (it starts with TFH-P) and your child’s date of birth.',
  },
  {
    id: 'faq-anc',
    topic: 'Pregnancy',
    question: 'How many antenatal visits should I have?',
    answer: 'At least 8: at about 12, 20, 26, 30, 34, 36, 38 and 40 weeks. My pregnancy › Antenatal care shows each visit, what is checked and which ones are done.',
  },
  {
    id: 'faq-danger',
    topic: 'Pregnancy',
    question: 'When should I go to hospital straight away?',
    answer: 'If you have bleeding, a severe headache or blurred vision, swelling of the face or hands, fever, fewer baby movements, leaking fluid or severe abdominal pain. Tumaini Family Hospital’s maternity unit is open 24 hours: 0709 600 400.',
  },
  {
    id: 'faq-overdue',
    topic: 'Vaccines',
    question: 'What does “Overdue” mean?',
    answer: 'A dose is overdue when its due date on the Kenya KEPI schedule has passed and the hospital has not recorded it as given. It is almost always still worth giving: ask for a catch-up dose at your next visit.',
  },
  {
    id: 'faq-optional',
    topic: 'Vaccines',
    question: 'What are optional (paid) vaccines?',
    answer: 'Tumaini Family Hospital also offers vaccines that are not on the free KEPI schedule, such as typhoid, chickenpox, hepatitis A and flu. They only appear in your child’s plan if you add them, and you pay for them at the visit.',
  },
  {
    id: 'faq-change-appointment',
    topic: 'Appointments',
    question: 'How do I book or change an appointment?',
    answer: 'Open Visits and choose “Book appointment”. Pick who it is for, the type of visit and a free time. Your request shows as Pending until a doctor confirms it or proposes another time.',
  },
  {
    id: 'faq-who-sees',
    topic: 'Privacy',
    question: 'Who can see my records?',
    answer: 'Only you and the Tumaini Family Hospital care team looking after you and your children. Settings › Privacy shows when you gave consent and when the care team last opened your record.',
  },
  {
    id: 'faq-forgot-password',
    topic: 'Account',
    question: 'I forgot my password',
    answer: 'On the sign-in page choose “Forgot password?”. We send a 6-digit code by SMS to your phone. Hospital staff will never ask you for this code.',
  },
]

/** A brand-new account for a mother who registers in the demo. */
export function emptyAccount(caregiver, mother) {
  return {
    caregiver,
    mother,
    pregnancy: null,
    delivery: null,
    postnatalVisits: [],
    maternalVaccines: [],
    children: [],
    doses: [],
    measurements: [],
    appointments: [],
    conversations: [],
    notifications: [],
    settings: { reminders: { sms: true, push: true, weeklyEmail: false, timing: '1 day before' }, language: 'en' },
    consent: { since: null, recordedBy: null, lastViewed: null },
    shareLinks: {},
  }
}

/**
 * Fresh, mutable data for the in-memory mock API. Each account gets its own
 * records; facility, clinicians, credentials and the hospital registry are
 * shared between them.
 */
export function createInitialData() {
  const shared = structuredClone({ facilities, clinicians, credentials, clinicRegistry })
  const accounts = { 'cg-wanjiru': wanjiruAccount(), 'cg-njeri': njeriAccount() }
  for (const account of Object.values(accounts)) Object.assign(account, shared)
  return { ...shared, accounts }
}
