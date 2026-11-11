/**
 * Mock data for the Enfantil caregiver web app. Everything here matches the
 * "Enfantil — UI/UX Design" frames W1–W14. "Today" is Sunday 8 Nov 2026
 * (see src/utils/dates.js). Dose status (given / planned / overdue) is NOT
 * stored: it is derived from `givenOn` and `dueOn` by the API layer.
 *
 * The API layer (src/api) works on a deep copy made by createInitialData(),
 * so changes made while using the app reset when the page reloads.
 */
import { addDays, addMonths, toDate, toISODate } from '../utils/dates'

/* ------------------------------------------------------------------ people */

export const caregiver = {
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
}

/** Demo login. Phone may be typed as 0712 345 678, +254 712 345 678 or 712345678. */
export const credentials = [
  { userId: 'cg-wanjiru', phone: '712345678', email: 'wanjiru.kamau@example.co.ke', password: 'Amani2026!' },
]

export const facilities = [
  { id: 'kl4', name: 'Kiambu Level 4 Hospital', shortName: 'Kiambu Level 4', county: 'Kiambu' },
  { id: 'rsc', name: 'Ruiru Sub-County Hospital', shortName: 'Ruiru Sub-County', county: 'Kiambu' },
  { id: 'thika', name: 'Thika Level 5 Hospital', shortName: 'Thika Level 5', county: 'Kiambu' },
]

export const clinicians = [
  {
    id: 'achieng-otieno',
    name: 'Dr. Achieng Otieno',
    shortName: 'Dr. Otieno',
    role: 'Paediatrician',
    subtitle: 'Paediatrician · Kiambu Level 4 Hospital',
    facilityId: 'kl4',
    tone: 'indigo',
  },
  {
    id: 'joseph-mwangi',
    name: 'Nurse Joseph Mwangi',
    shortName: 'Nurse Mwangi',
    role: 'Immunization nurse',
    subtitle: 'Immunization nurse · Kiambu Level 4',
    facilityId: 'kl4',
    tone: 'teal',
  },
  {
    id: 'kl4-reception',
    name: 'Kiambu L4 Reception',
    shortName: 'Reception',
    initials: 'KR',
    role: 'Clinic staff',
    subtitle: 'Clinic staff',
    facilityId: 'kl4',
    tone: 'slate',
  },
  {
    id: 'hassan-abdi',
    name: 'Dr. Hassan Abdi',
    shortName: 'Dr. Abdi',
    role: 'Clinical Officer',
    subtitle: 'Clinical Officer · Ruiru Sub-County Hospital',
    facilityId: 'rsc',
    tone: 'amber',
  },
  {
    id: 'mercy-wambui',
    name: 'Nurse Mercy Wambui',
    shortName: 'Nurse Wambui',
    role: 'Midwife',
    subtitle: 'Midwife · Kiambu L4 Maternity',
    facilityId: 'kl4',
    tone: 'teal',
    messaging: false,
  },
  {
    id: 'grace-njeri',
    name: 'Nurse Grace Njeri',
    shortName: 'Nurse Njeri',
    role: 'Immunization nurse',
    subtitle: 'Immunization nurse · Ruiru Sub-County',
    facilityId: 'rsc',
    tone: 'teal',
    messaging: false,
  },
]

/* --------------------------------------------------- Kenya KEPI vaccines */

export const vaccines = {
  bcg: {
    id: 'bcg',
    name: 'BCG',
    short: 'BCG',
    numbered: false,
    totalDoses: 1,
    protects: 'severe forms of tuberculosis (TB)',
    how: 'Given as one small injection in the upper left arm.',
    common: [
      'A small swelling that turns into a blister or sore 2–6 weeks later',
      'The sore heals slowly over a few weeks and leaves a small scar',
    ],
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
    faqs: [
      { q: 'Is it given with other vaccines?', a: 'Yes. In Kenya PCV is given at 6, 10 and 14 weeks, on the same day as Pentavalent, OPV and Rotavirus.' },
    ],
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
    getHelp: [
      'Strong tummy pain with repeated crying, drawing up the legs or vomiting',
      'Blood in the stool, or a baby who is very weak or not feeding',
    ],
    faqs: [
      { q: 'Is there an age limit?', a: 'Yes. Rotavirus doses need to be given while your baby is young, so try not to miss the 6 and 10 week visits.' },
    ],
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
    faqs: [
      { q: 'My child already had polio drops. Why the injection too?', a: 'The injection (IPV) adds a different kind of protection to the drops (OPV). Together they protect better than either alone.' },
    ],
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
}

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
  if (!v.numbered) return { name: v.name, short: v.short, title: v.name }
  return { name: `${v.name} ${dose}`, short: `${v.short} ${dose}`, title: `${v.name} · Dose ${dose}` }
}

function doseRecord(childId, vaccineId, dose, ageLabel, fields) {
  const key = dose === null ? vaccineId : `${vaccineId}-${dose}`
  return {
    id: `${childId}-${key}`,
    childId,
    vaccineId,
    doseNumber: dose,
    ageLabel,
    ...doseNames(vaccineId, dose),
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

/** Generates a child's KEPI doses from their date of birth (used for Zawadi and linked records). */
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
      givenBy: given ? givenBy : null,
      facilityLabel: given ? facilityLabel : null,
    })
  })
}

/* ------------------------------------------------------------------ children */

export const children = [
  {
    id: 'amani',
    firstName: 'Amani',
    lastName: 'Kamau',
    sex: 'female',
    dob: '2026-02-09',
    patientId: 'KL4-P-260209-014',
    facilityId: 'kl4',
    bornAt: 'Kiambu Level 4 Hospital',
    birthWeightKg: 3.2,
    birthLengthCm: 49,
    mainClinicianId: 'achieng-otieno',
    tone: 'teal',
    recordStatus: 'linked',
    allergies: [{ id: 'al-egg', substance: 'Egg', reaction: 'mild skin rash', recordedOn: '2026-09-14' }],
    medicines: [{ id: 'med-vitd', name: 'Vitamin D drops', directions: 'Once daily', since: '2026-03-23' }],
  },
  {
    id: 'zawadi',
    firstName: 'Zawadi',
    lastName: 'Kamau',
    sex: 'female',
    dob: '2023-06-04',
    patientId: 'KL4-P-230604-031',
    facilityId: 'rsc',
    bornAt: 'Ruiru Sub-County Hospital',
    birthWeightKg: 3.0,
    birthLengthCm: 48,
    mainClinicianId: 'hassan-abdi',
    tone: 'coral',
    recordStatus: 'linked',
    allergies: [],
    medicines: [{ id: 'med-amox', name: 'Amoxicillin syrup', directions: 'Twice daily · 7-day course', since: '2026-11-02' }],
  },
]

/* --------------------------------------------------------------- doses */

const KL4 = 'Kiambu Level 4'
const MATERNITY = 'Kiambu L4 Maternity'
const MWANGI = 'Nurse Joseph Mwangi'

const amaniDoses = [
  doseRecord('amani', 'bcg', null, 'Birth', { dueOn: '2026-02-09', givenOn: '2026-02-09', batch: 'BCG-24K117', givenBy: 'Nurse Mercy Wambui', facilityLabel: MATERNITY, tableGroup: 'birth' }),
  doseRecord('amani', 'opv', 0, 'Birth', { dueOn: '2026-02-09', givenOn: '2026-02-09', batch: 'bOPV-0126-J9', givenBy: 'Nurse Mercy Wambui', facilityLabel: MATERNITY, tableGroup: 'birth' }),
  doseRecord('amani', 'opv', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'bOPV-0226-J4', givenBy: MWANGI, facilityLabel: KL4, tableGroup: '6w', cardGroup: '6w' }),
  doseRecord('amani', 'penta', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'PNT-25A1187', givenBy: MWANGI, facilityLabel: KL4, tableGroup: '6w', cardGroup: '6w' }),
  doseRecord('amani', 'pcv', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'PCV10-85520', givenBy: MWANGI, facilityLabel: KL4, tableGroup: '6w', cardGroup: '6w' }),
  doseRecord('amani', 'rota', 1, '6 weeks', { dueOn: '2026-03-23', givenOn: '2026-03-23', batch: 'ROTA-5390C', givenBy: MWANGI, facilityLabel: KL4, tableGroup: '6w', cardGroup: '6w' }),
  doseRecord('amani', 'opv', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'bOPV-0326-K2', givenBy: MWANGI, facilityLabel: KL4 }),
  doseRecord('amani', 'penta', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'PNT-25B2870', givenBy: MWANGI, facilityLabel: KL4, cardGroup: '10w' }),
  doseRecord('amani', 'pcv', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'PCV10-87106', givenBy: MWANGI, facilityLabel: KL4, cardGroup: '10w' }),
  doseRecord('amani', 'rota', 2, '10 weeks', { dueOn: '2026-04-20', givenOn: '2026-04-20', batch: 'ROTA-5514A', givenBy: MWANGI, facilityLabel: KL4, cardGroup: '10w' }),
  doseRecord('amani', 'opv', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'bOPV-0426-K7', givenBy: MWANGI, facilityLabel: KL4, appointmentId: 'appt-a-0518' }),
  doseRecord('amani', 'penta', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'PNT-25B3391', givenBy: MWANGI, facilityLabel: KL4, appointmentId: 'appt-a-0518' }),
  doseRecord('amani', 'pcv', 3, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'PCV10-88412', givenBy: MWANGI, facilityLabel: KL4, appointmentId: 'appt-a-0518', cardGroup: '14w' }),
  doseRecord('amani', 'ipv', null, '14 weeks', { dueOn: '2026-05-18', givenOn: '2026-05-18', batch: 'IPV-24C0193', givenBy: MWANGI, facilityLabel: KL4, appointmentId: 'appt-a-0518', cardGroup: '14w' }),
  doseRecord('amani', 'vita', 6, '6 months', { dueOn: '2026-08-09', appointmentId: 'appt-a-1109' }),
  doseRecord('amani', 'mr', 1, '9 months', { dueOn: '2026-11-09', appointmentId: 'appt-a-1109' }),
  doseRecord('amani', 'vita', 12, '12 months', { dueOn: '2027-02-09', appointmentId: 'appt-a-0209' }),
  doseRecord('amani', 'mr', 2, '18 months', { dueOn: '2027-08-09' }),
]

const zawadiDoses = generateKepiDoses('zawadi', '2023-06-04', {
  givenUntil: '2026-06-04',
  givenBy: 'Nurse Grace Njeri',
  facilityLabel: 'Ruiru Sub-County',
  batchSeed: 23,
})
  .filter((d) => !(d.vaccineId === 'vita' && d.doseNumber === 54))
  .map((d) => (d.id === 'zawadi-vita-42' ? { ...d, appointmentId: 'appt-z-1204' } : d))

export const doses = [...amaniDoses, ...zawadiDoses]

/* ------------------------------------------------------------- growth */

export const measurements = [
  { id: 'gm-a-1', childId: 'amani', date: '2026-02-09', weightKg: 3.2, heightCm: 49.0, measuredBy: 'Nurse Mercy Wambui', facilityId: 'kl4' },
  { id: 'gm-a-2', childId: 'amani', date: '2026-03-23', weightKg: 4.7, heightCm: 55.0, measuredBy: MWANGI, facilityId: 'kl4' },
  { id: 'gm-a-3', childId: 'amani', date: '2026-04-20', weightKg: 5.6, heightCm: 58.5, measuredBy: MWANGI, facilityId: 'kl4' },
  { id: 'gm-a-4', childId: 'amani', date: '2026-05-18', weightKg: 6.4, heightCm: 61.5, measuredBy: MWANGI, facilityId: 'kl4' },
  { id: 'gm-a-5', childId: 'amani', date: '2026-09-14', weightKg: 7.8, heightCm: 67.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'kl4' },
  { id: 'gm-a-6', childId: 'amani', date: '2026-10-12', weightKg: 8.2, heightCm: 69.0, measuredBy: 'Dr. Achieng Otieno', facilityId: 'kl4' },
  { id: 'gm-z-1', childId: 'zawadi', date: '2023-06-04', weightKg: 3.0, heightCm: 48.0, measuredBy: 'Nurse Grace Njeri', facilityId: 'rsc' },
  { id: 'gm-z-2', childId: 'zawadi', date: '2023-12-04', weightKg: 7.4, heightCm: 65.5, measuredBy: 'Nurse Grace Njeri', facilityId: 'rsc' },
  { id: 'gm-z-3', childId: 'zawadi', date: '2024-06-04', weightKg: 9.1, heightCm: 73.5, measuredBy: 'Nurse Grace Njeri', facilityId: 'rsc' },
  { id: 'gm-z-4', childId: 'zawadi', date: '2024-12-04', weightKg: 10.5, heightCm: 80.5, measuredBy: 'Dr. Hassan Abdi', facilityId: 'rsc' },
  { id: 'gm-z-5', childId: 'zawadi', date: '2025-06-04', weightKg: 11.6, heightCm: 85.5, measuredBy: 'Dr. Hassan Abdi', facilityId: 'rsc' },
  { id: 'gm-z-6', childId: 'zawadi', date: '2025-12-04', weightKg: 12.6, heightCm: 89.5, measuredBy: 'Dr. Hassan Abdi', facilityId: 'rsc' },
  { id: 'gm-z-7', childId: 'zawadi', date: '2026-06-04', weightKg: 13.5, heightCm: 93.5, measuredBy: 'Nurse Grace Njeri', facilityId: 'rsc' },
  { id: 'gm-z-8', childId: 'zawadi', date: '2026-11-02', weightKg: 14.1, heightCm: 96.0, measuredBy: 'Dr. Hassan Abdi', facilityId: 'rsc' },
]

/* -------------------------------------------------------- appointments */

export const appointments = [
  {
    id: 'appt-a-1109',
    childId: 'amani',
    start: '2026-11-09T10:00',
    title: 'Measles-Rubella 1 + Vitamin A catch-up',
    clinicianId: 'achieng-otieno',
    facilityId: 'kl4',
    location: 'MCH clinic, Room 2',
    ref: 'KL4-A-10942',
    note: 'Please bring the Mother & Child Health handbook.',
    status: 'scheduled',
    doseIds: ['amani-mr-1', 'amani-vita-6'],
  },
  {
    id: 'appt-z-1204',
    childId: 'zawadi',
    start: '2026-12-04T09:00',
    title: 'Vitamin A (42 months)',
    clinicianId: 'hassan-abdi',
    facilityId: 'rsc',
    location: 'MCH clinic',
    ref: 'RSC-A-04417',
    note: "Please bring Zawadi's clinic card.",
    status: 'scheduled',
    doseIds: ['zawadi-vita-42'],
  },
  {
    id: 'appt-a-0209',
    childId: 'amani',
    start: '2027-02-09T09:30',
    title: '12-month check & Vitamin A',
    clinicianId: 'achieng-otieno',
    facilityId: 'kl4',
    location: 'MCH clinic, Room 2',
    ref: 'KL4-A-11208',
    note: null,
    status: 'scheduled',
    doseIds: ['amani-vita-12'],
  },
  {
    id: 'appt-a-1012',
    childId: 'amani',
    start: '2026-10-12T09:00',
    title: '8-month growth check',
    clinicianId: 'achieng-otieno',
    facilityId: 'kl4',
    location: 'MCH clinic, Room 2',
    ref: 'KL4-A-10511',
    note: null,
    summary: 'Weight 8.2 kg and height 69.0 cm. Growing well along her curve.',
    status: 'completed',
    doseIds: [],
  },
  {
    id: 'appt-a-0914',
    childId: 'amani',
    start: '2026-09-14T11:30',
    title: 'Cough review',
    clinicianId: 'achieng-otieno',
    facilityId: 'kl4',
    location: 'Paediatric outpatients',
    ref: 'KL4-A-10187',
    note: null,
    summary: 'Mild cough, chest clear. Egg allergy (mild skin rash) added to her record.',
    status: 'completed',
    doseIds: [],
  },
  {
    id: 'appt-a-0810',
    childId: 'amani',
    start: '2026-08-10T09:00',
    title: '6-month visit',
    clinicianId: 'joseph-mwangi',
    facilityId: 'kl4',
    location: 'MCH clinic, Room 2',
    ref: 'KL4-A-09734',
    note: null,
    summary: 'Cancelled. Vitamin A (6 months) was not given and is now due as a catch-up.',
    status: 'cancelled',
    doseIds: [],
  },
  {
    id: 'appt-a-0518',
    childId: 'amani',
    start: '2026-05-18T10:00',
    title: '14-week immunizations',
    clinicianId: 'joseph-mwangi',
    facilityId: 'kl4',
    location: 'MCH clinic, Room 2',
    ref: 'KL4-A-08215',
    note: null,
    summary: 'OPV 3, Pentavalent 3, PCV 3 and IPV given. Weight 6.4 kg.',
    status: 'completed',
    doseIds: ['amani-opv-3', 'amani-penta-3', 'amani-pcv-3', 'amani-ipv'],
  },
]

/* ------------------------------------------------------------ messages */

export const conversations = [
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
    id: 'conv-reception',
    clinicianId: 'kl4-reception',
    childId: 'amani',
    messages: [
      { id: 'm-r-1', from: 'clinician', sentAt: '2026-11-06T09:02', body: 'Your appointment on Mon 9 Nov at 10:00 with Dr. Achieng Otieno is confirmed. Reply here if you need to change it.', read: true },
    ],
  },
  {
    id: 'conv-abdi',
    clinicianId: 'hassan-abdi',
    childId: 'zawadi',
    messages: [
      { id: 'm-a-1', from: 'caregiver', sentAt: '2026-11-02T08:15', body: 'Good morning daktari. Zawadi finished day 5 of the amoxicillin. Does she still need the ear check today?', read: true },
      { id: 'm-a-2', from: 'clinician', sentAt: '2026-11-02T11:48', body: 'I saw her this morning — the ear is clear now. Please finish the full amoxicillin course, all 7 days, even though she seems better.', read: true },
      { id: 'm-a-3', from: 'caregiver', sentAt: '2026-11-02T12:05', body: 'Thank you, she’s eating well again.', read: true },
    ],
  },
]

/* -------------------------------------------------------- notifications */

export const notifications = [
  {
    id: 'n-1',
    type: 'message',
    childId: 'amani',
    title: 'Dr. Achieng Otieno replied',
    body: 'A mild fever below 38.5°C is usually no reason to delay. Give plenty of fluids and come at 10:00.',
    createdAt: '2026-11-08T20:05',
    read: false,
    target: { conversationId: 'conv-otieno' },
  },
  {
    id: 'n-2',
    type: 'vaccine',
    childId: 'amani',
    title: 'Measles-Rubella dose 1 is tomorrow',
    body: 'Mon 9 Nov, 10:00 · Kiambu Level 4 Hospital, Room 2',
    createdAt: '2026-11-08T18:00',
    read: false,
    target: { doseId: 'amani-mr-1' },
  },
  {
    id: 'n-3',
    type: 'overdue',
    childId: 'amani',
    title: 'Vitamin A (6 months) is overdue',
    body: 'Was due 9 Aug. Ask for it at tomorrow’s visit.',
    createdAt: '2026-11-08T09:00',
    read: true,
    target: { doseId: 'amani-vita-6' },
  },
  {
    id: 'n-4',
    type: 'appointment',
    childId: 'amani',
    title: 'Appointment confirmed',
    body: 'Mon 9 Nov at 10:00 with Dr. Achieng Otieno',
    createdAt: '2026-11-06T09:02',
    read: true,
    target: { appointmentId: 'appt-a-1109' },
  },
  {
    id: 'n-5',
    type: 'growth',
    childId: 'amani',
    title: 'New growth measurement',
    body: '8.2 kg · 69.0 cm, recorded 12 Oct',
    createdAt: '2026-10-12T11:00',
    read: true,
    target: { page: 'health' },
  },
  {
    id: 'n-6',
    type: 'appointment',
    childId: 'zawadi',
    title: 'Next visit booked',
    body: 'Fri 4 Dec at 09:00 · Ruiru Sub-County Hospital',
    createdAt: '2026-11-02T12:30',
    read: true,
    target: { appointmentId: 'appt-z-1204' },
  },
]

/* ------------------------------------------------------------ settings */

export const settings = {
  reminders: { sms: true, push: true, weeklyEmail: false, timing: '1 day before' },
  language: 'en',
}

export const clinicAccess = [
  { id: 'acc-kl4', facilityId: 'kl4', childIds: ['amani'], since: '2026-02-09', lastViewed: '2026-11-08', active: true },
  { id: 'acc-rsc', facilityId: 'rsc', childIds: ['zawadi'], since: '2023-06-04', lastViewed: '2026-11-02', active: true },
]

/** Clinic records a caregiver can link from "Add a child" (looked up by patient ID + date of birth). */
export const clinicRegistry = [
  { patientId: 'KL4-P-230604-031', dob: '2023-06-04', firstName: 'Zawadi', lastName: 'Kamau', sex: 'female', facilityId: 'rsc', linkedChildId: 'zawadi' },
  { patientId: 'KL4-P-260209-014', dob: '2026-02-09', firstName: 'Amani', lastName: 'Kamau', sex: 'female', facilityId: 'kl4', linkedChildId: 'amani' },
  { patientId: 'THK-P-250118-007', dob: '2025-01-18', firstName: 'Baraka', lastName: 'Kamau', sex: 'male', facilityId: 'thika', birthWeightKg: 3.4, birthLengthCm: 50, linkedChildId: null },
]

export const counties = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado',
  'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
  'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi',
  'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
  'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot',
]

export const helpTopics = ['Getting started', 'Vaccines', 'Appointments', 'Privacy', 'Account']

export const helpArticles = [
  {
    id: 'faq-link-record',
    topic: 'Getting started',
    question: 'How do I link my child’s clinic record?',
    answer: 'Go to Settings, then Add a child, and choose “Link a clinic record”. Enter the patient ID from the MCH handbook and your child’s date of birth.',
  },
  {
    id: 'faq-overdue',
    topic: 'Vaccines',
    question: 'What does “Overdue” mean?',
    answer: 'A dose is overdue when its due date on the Kenya KEPI schedule has passed and the clinic has not recorded it as given. It is almost always still worth giving: ask for a catch-up dose at your next visit.',
  },
  {
    id: 'faq-card',
    topic: 'Vaccines',
    question: 'How do I get a vaccination card for school?',
    answer: 'Open Vaccination card, choose your child, then Download PDF or Print. You can also create a share link for the school. It shows vaccines only and stops working after 7 days.',
  },
  {
    id: 'faq-change-appointment',
    topic: 'Appointments',
    question: 'How do I change an appointment?',
    answer: 'Open Visits, choose the appointment and select “Request a different time”. Your clinic confirms the new time by SMS, usually within one working day.',
  },
  {
    id: 'faq-who-sees',
    topic: 'Privacy',
    question: 'Who can see my children’s records?',
    answer: 'Only you and the clinics you approve. Settings › Privacy & access lists every clinic with access, when it last viewed the record, and lets you remove it.',
  },
  {
    id: 'faq-forgot-password',
    topic: 'Account',
    question: 'I forgot my password',
    answer: 'On the sign-in page choose “Forgot password?”. We send a 6-digit code by SMS to your phone. Clinic staff will never ask you for this code.',
  },
]

/** Fresh, mutable copy of all data for the in-memory mock API. */
export function createInitialData() {
  return structuredClone({
    caregiver,
    credentials,
    facilities,
    clinicians,
    children,
    doses,
    measurements,
    appointments,
    conversations,
    notifications,
    settings,
    clinicAccess,
    clinicRegistry,
    shareLinks: {},
  })
}
