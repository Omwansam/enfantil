/**
 * Pregnancy and postnatal helpers: gestational age, due dates, the 8-contact
 * antenatal (ANC) schedule, postnatal visits and the maternal Td schedule.
 * Everything is calculated from the last menstrual period (LMP) or delivery
 * date against TODAY, never stored as a status.
 */
import { addDays, daysBetween, toISODate, TODAY } from './dates'

export const PREGNANCY_DAYS = 280

export function eddFromLmp(lmp) {
  return toISODate(addDays(lmp, PREGNANCY_DAYS))
}

export function lmpFromEdd(edd) {
  return toISODate(addDays(edd, -PREGNANCY_DAYS))
}

/** { weeks, days, total } completed since the LMP. */
export function gestationalAge(lmp, at = TODAY) {
  const total = Math.max(0, daysBetween(lmp, at))
  return { weeks: Math.floor(total / 7), days: total % 7, total }
}

/** '26+1' */
export function formatGA(ga) {
  return `${ga.weeks}+${ga.days}`
}

/** '26 weeks 1 day' */
export function formatGALong(ga) {
  const w = `${ga.weeks} week${ga.weeks === 1 ? '' : 's'}`
  return ga.days ? `${w} ${ga.days} day${ga.days === 1 ? '' : 's'}` : w
}

export function trimester(weeks) {
  if (weeks < 14) return 1
  if (weeks < 28) return 2
  return 3
}

/** The date a given week of pregnancy starts. */
export function dateAtWeek(lmp, weeks, days = 0) {
  return toISODate(addDays(lmp, weeks * 7 + days))
}

/** The WHO / Kenya 8-contact antenatal schedule, with what is checked at each. */
export const ANC_CONTACTS = [
  {
    n: 1,
    weeks: 12,
    title: 'First visit (booking)',
    checks: [
      'Your health history and a full check-up',
      'Blood pressure, weight and height',
      'Blood tests: haemoglobin, blood group, HIV, syphilis and hepatitis B',
      'Urine test for protein and sugar',
      'Iron and folic acid tablets, and a Td vaccine if due',
      'Dating ultrasound to confirm your due date',
    ],
  },
  {
    n: 2,
    weeks: 20,
    title: 'Mid-pregnancy check',
    checks: [
      'Blood pressure and weight',
      'Baby’s growth (fundal height) and heartbeat',
      'Urine test',
      'Deworming tablet and Td vaccine if due',
      'Anatomy ultrasound',
    ],
  },
  {
    n: 3,
    weeks: 26,
    title: 'Second-trimester check',
    checks: [
      'Blood pressure and weight',
      'Fundal height and baby’s heartbeat',
      'Haemoglobin (anaemia check)',
      'Sugar test for gestational diabetes (24–28 weeks)',
    ],
  },
  {
    n: 4,
    weeks: 30,
    title: 'Third-trimester check',
    checks: [
      'Blood pressure, weight, fundal height and heartbeat',
      'Haemoglobin',
      'Your birth plan: where and with whom you will deliver',
      'Td vaccine if due',
    ],
  },
  {
    n: 5,
    weeks: 34,
    title: 'Getting ready for birth',
    checks: ['Blood pressure, weight, fundal height and heartbeat', 'Baby’s position', 'Preparing for birth and breastfeeding'],
  },
  { n: 6, weeks: 36, title: 'Baby’s position', checks: ['Blood pressure and urine', 'Is baby head down?', 'Signs of labour and when to come in'] },
  { n: 7, weeks: 38, title: 'Final checks', checks: ['Blood pressure and urine', 'Baby’s position and movements', 'Your hospital bag and transport plan'] },
  { n: 8, weeks: 40, title: 'Due-date visit', checks: ['Blood pressure and baby’s wellbeing', 'What happens if baby is not born by 41 weeks'] },
]

/**
 * Status of one ANC contact: 'Completed' if recorded, 'Not needed' if the baby
 * came first, 'Overdue' a week after its target date, otherwise 'Upcoming'.
 */
export function ancContactStatus(contact, { lmp, visit, deliveredOn }) {
  const dueOn = dateAtWeek(lmp, contact.weeks)
  if (visit) return { status: 'Completed', dueOn }
  if (deliveredOn && deliveredOn <= dueOn) return { status: 'Not needed', dueOn }
  if (daysBetween(dueOn, TODAY) > 7) return { status: 'Overdue', dueOn }
  return { status: 'Upcoming', dueOn }
}

/** Kenya postnatal care: within 48 hours, at 1–2 weeks and at 4–6 weeks. */
export const POSTNATAL_VISITS = [
  { key: '48h', label: 'Within 48 hours', dueDays: 2, lateAfterDays: 3 },
  { key: '1-2w', label: '1–2 weeks', dueDays: 14, lateAfterDays: 21 },
  { key: '4-6w', label: '4–6 weeks', dueDays: 42, lateAfterDays: 49 },
]

export function postnatalStatus(visitDef, { deliveredOn, visit }) {
  const dueOn = toISODate(addDays(deliveredOn, visitDef.dueDays))
  if (visit) return { status: 'Completed', dueOn }
  if (daysBetween(deliveredOn, TODAY) > visitDef.lateAfterDays) return { status: 'Overdue', dueOn }
  return { status: 'Upcoming', dueOn }
}

/** 'Postnatal · day 5' in the first 6 weeks, then months since birth. */
export function postnatalLabel(deliveredOn, at = TODAY) {
  const days = daysBetween(deliveredOn, at)
  if (days <= 42) return `Postnatal · day ${days}`
  const months = Math.round(days / 30.44)
  return `Postnatal · ${months} month${months === 1 ? '' : 's'} since birth`
}

/** Baby size by week, compared with things you can find at the market. */
const SIZES = [
  { from: 4, size: 'a poppy seed', length: 'under 1 mm', weight: null },
  { from: 6, size: 'a bean', length: 'about 1 cm', weight: null },
  { from: 8, size: 'a grape', length: 'about 2 cm', weight: 'about 1 g' },
  { from: 11, size: 'a lime', length: 'about 6 cm', weight: 'about 15 g' },
  { from: 14, size: 'a lemon', length: 'about 9 cm', weight: 'about 45 g' },
  { from: 17, size: 'an avocado', length: 'about 13 cm', weight: 'about 150 g' },
  { from: 20, size: 'a banana', length: 'about 25 cm', weight: 'about 300 g' },
  { from: 23, size: 'a maize cob', length: 'about 30 cm', weight: 'about 500 g' },
  { from: 26, size: 'a pawpaw', length: 'about 36 cm', weight: 'about 760 g' },
  { from: 29, size: 'a butternut', length: 'about 39 cm', weight: 'about 1.2 kg' },
  { from: 32, size: 'a pineapple', length: 'about 42 cm', weight: 'about 1.7 kg' },
  { from: 35, size: 'a honeydew melon', length: 'about 46 cm', weight: 'about 2.4 kg' },
  { from: 38, size: 'a watermelon', length: 'about 49 cm', weight: 'about 3.1 kg' },
]

export function babySize(weeks) {
  return [...SIZES].reverse().find((s) => weeks >= s.from) ?? SIZES[0]
}

/** Short guidance for the week, written for the mother. */
const GUIDANCE = [
  { from: 0, text: 'Take your iron and folic acid every day, rest when you can, and book your first antenatal visit before 12 weeks.' },
  { from: 13, text: 'Many mothers feel more energy now. Keep taking iron and folic acid, eat a mix of foods, and drink plenty of water.' },
  { from: 20, text: 'You may feel your baby move this month. Wear comfortable shoes and sleep on your side.' },
  {
    from: 24,
    text: 'Your baby can hear your voice and is practising breathing. Rest on your left side, keep taking iron and calcium, and notice your baby’s regular movements.',
  },
  { from: 28, text: 'Count your baby’s kicks each evening: at least 10 in 2 hours. Start planning how you will get to hospital when labour starts.' },
  { from: 34, text: 'Pack your hospital bag, keep your MCH handbook ready, and learn the signs of labour.' },
  { from: 37, text: 'Your baby could come any day. Come in when contractions are regular, if your waters break, or if you notice any danger sign.' },
]

export function weeklyGuidance(weeks) {
  return [...GUIDANCE].reverse().find((g) => weeks >= g.from).text
}

/** Signs that mean "go to hospital now" (Kenya MCH handbook). */
export const DANGER_SIGNS = [
  'Bleeding from the vagina',
  'Severe headache or blurred vision',
  'Swelling of the face or hands',
  'Fever',
  'Your baby is moving less than usual',
  'Fluid leaking from the vagina',
  'Severe pain in the abdomen',
]

export const POSTNATAL_DANGER_SIGNS = [
  'Heavy bleeding, or bleeding that gets worse',
  'Fever or chills',
  'Severe headache or blurred vision',
  'Swelling, pain or redness in one leg',
  'Bad-smelling discharge, or pain where you were stitched',
  'Feeling very low, or having thoughts of harming yourself or your baby',
]

/** Blood pressure at or above 140/90 needs attention. */
export function isHighBp(systolic, diastolic) {
  return Number(systolic) >= 140 || Number(diastolic) >= 90
}

export const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']
