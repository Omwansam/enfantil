/** Mothers' records for clinicians (D2–D5): profile, antenatal visits, delivery, postnatal visits and audited record edits. */
import { get, patch, post, seg } from './client'
import { daysBetween, isValidISODate, TODAY_ISO } from '../utils/dates'
import { isHighBp } from '../utils/pregnancy'

export const URINE = ['Negative', 'Trace', '+1', '+2', '+3']

export const SUPPLEMENTS = ['Iron and folic acid (IFAS)', 'Calcium', 'Deworming (mebendazole)', 'Anti-D (Rh negative)']

function num(v) {
  return v === '' || v === null || v === undefined ? null : Number(v)
}

/** Validation for D3. Returns { errors, warnings } — warnings are abnormal but allowed values. */
export function validateAnc(f, { lmp } = {}) {
  const errors = {}
  const warnings = []
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the visit date.'
  else if (f.date > TODAY_ISO) errors.date = 'The visit date can’t be in the future.'
  else if (lmp && f.date < lmp) errors.date = 'The visit date is before the last period.'
  const sys = num(f.bpSystolic)
  const dia = num(f.bpDiastolic)
  if (sys === null) errors.bpSystolic = 'Enter the systolic (top) number.'
  else if (!Number.isFinite(sys) || sys < 60 || sys > 250) errors.bpSystolic = 'Systolic should be between 60 and 250.'
  if (dia === null) errors.bpDiastolic = 'Enter the diastolic (bottom) number.'
  else if (!Number.isFinite(dia) || dia < 30 || dia > 150) errors.bpDiastolic = 'Diastolic should be between 30 and 150.'
  else if (sys !== null && dia >= sys) errors.bpDiastolic = 'Diastolic must be lower than systolic.'
  if (!errors.bpSystolic && !errors.bpDiastolic && isHighBp(sys, dia)) warnings.push(`Blood pressure ${sys}/${dia} is 140/90 or higher`)
  const w = num(f.weightKg)
  if (w === null) errors.weightKg = 'Enter the weight.'
  else if (!Number.isFinite(w) || w < 30 || w > 200) errors.weightKg = 'Weight should be between 30 and 200 kg.'
  const fh = num(f.fundalHeightCm)
  if (fh !== null && (!Number.isFinite(fh) || fh < 5 || fh > 50)) errors.fundalHeightCm = 'Fundal height should be between 5 and 50 cm.'
  const fhr = num(f.fetalHeartRate)
  if (fhr !== null) {
    if (!Number.isFinite(fhr) || fhr < 60 || fhr > 220) errors.fetalHeartRate = 'Fetal heart rate should be between 60 and 220.'
    else if (fhr < 110 || fhr > 160) warnings.push(`Fetal heart rate ${fhr} bpm is outside 110–160`)
  }
  const hb = num(f.hb)
  if (hb !== null) {
    if (!Number.isFinite(hb) || hb < 3 || hb > 20) errors.hb = 'Haemoglobin should be between 3 and 20 g/dL.'
    else if (hb < 11) warnings.push(`Haemoglobin ${hb} g/dL is below 11 (anaemia)`)
  }
  if (['+2', '+3'].includes(f.urineProtein)) warnings.push(`Urine protein ${f.urineProtein}`)
  if (['+2', '+3'].includes(f.urineGlucose)) warnings.push(`Urine glucose ${f.urineGlucose}`)
  if (f.tdGiven && !f.tdBatch?.trim()) errors.tdBatch = 'Enter the Td batch number.'
  if (f.nextVisitOn && (!isValidISODate(f.nextVisitOn) || f.nextVisitOn <= (f.date || TODAY_ISO)))
    errors.nextVisitOn = 'The next visit must be after this visit.'
  if ((f.noteForMother ?? '').length > 300) errors.noteForMother = 'Keep the note to 300 characters.'
  return { errors, warnings }
}

export const DELIVERY_MODES = ['Spontaneous vaginal delivery', 'Assisted vaginal delivery (vacuum)', 'Caesarean section']

export function validateDelivery(f, { lmp } = {}) {
  const errors = {}
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the delivery date.'
  else if (f.date > TODAY_ISO) errors.date = 'The delivery date can’t be in the future.'
  else if (lmp && daysBetween(lmp, f.date) < 154) errors.date = 'That is before 22 weeks. Check the date.'
  if (!f.time) errors.time = 'Enter the time of birth.'
  if (!f.mode) errors.mode = 'Choose the type of delivery.'
  if (!f.outcome) errors.outcome = 'Choose the outcome.'
  if (f.outcome === 'Live birth') {
    if (!f.babyFirstName.trim()) errors.babyFirstName = 'Enter the baby’s first name, or “Baby” for now.'
    if (!f.babySex) errors.babySex = 'Choose girl or boy.'
  }
  const w = Number(f.babyWeightKg)
  if (!f.babyWeightKg) errors.babyWeightKg = 'Enter the baby’s weight.'
  else if (!Number.isFinite(w) || w < 0.4 || w > 6.5) errors.babyWeightKg = 'Baby’s weight should be between 0.4 and 6.5 kg.'
  return errors
}

export const UTERUS = ['Well contracted', 'Involuting normally', 'Normal size', 'Tender or enlarged']

export const BLEEDING = ['Normal lochia', 'Light', 'Stopped', 'Heavy', 'Bad-smelling']

export const WOUND = ['Intact', 'Healing well', 'Healed', 'Signs of infection']

export const FP_METHODS = [
  'Not discussed yet',
  'Counselled, undecided',
  'Progestin-only pill',
  'Injectable (DMPA)',
  'Implant',
  'IUCD',
  'Condoms',
  'Lactational amenorrhoea',
]

export function validatePostnatal(f) {
  const errors = {}
  const warnings = []
  if (!f.key) errors.key = 'Choose which postnatal visit this is.'
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the visit date.'
  else if (f.date > TODAY_ISO) errors.date = 'The visit date can’t be in the future.'
  const sys = Number(f.bpSystolic)
  const dia = Number(f.bpDiastolic)
  if (!f.bpSystolic || !Number.isFinite(sys) || sys < 60 || sys > 250) errors.bpSystolic = 'Enter a systolic number between 60 and 250.'
  if (!f.bpDiastolic || !Number.isFinite(dia) || dia < 30 || dia > 150) errors.bpDiastolic = 'Enter a diastolic number between 30 and 150.'
  if (!errors.bpSystolic && !errors.bpDiastolic && isHighBp(sys, dia)) warnings.push(`Blood pressure ${sys}/${dia} is 140/90 or higher`)
  if (f.tempC && (Number(f.tempC) < 34 || Number(f.tempC) > 42.5)) errors.tempC = 'Temperature should be between 34 and 42.5 °C.'
  else if (Number(f.tempC) >= 38) warnings.push(`Temperature ${f.tempC} °C (fever)`)
  if (f.bleeding === 'Heavy' || f.bleeding === 'Bad-smelling') warnings.push(`Bleeding: ${f.bleeding.toLowerCase()}`)
  if (f.epds && Number(f.epds) >= 13) warnings.push(`Depression screen (EPDS) ${f.epds}`)
  if (f.babyWeightKg && (Number(f.babyWeightKg) < 0.4 || Number(f.babyWeightKg) > 10)) errors.babyWeightKg = 'Baby’s weight should be between 0.4 and 10 kg.'
  return { errors, warnings }
}

export const RECORD_LISTS = {
  allergies: { label: 'Allergies', field: 'substance', detail: 'reaction' },
  conditions: { label: 'Conditions', field: 'name', detail: 'detail' },
  medicines: { label: 'Medicines', field: 'name', detail: 'directions' },
  diagnoses: { label: 'Diagnoses', field: 'name', detail: 'code' },
}

export function validateRecordEdit({ list, fields, reason, action }) {
  const errors = {}
  const spec = RECORD_LISTS[list]
  if (!spec) errors.form = 'Choose what to change.'
  if (action !== 'remove' && !fields?.[spec?.field]?.trim()) errors.name = `Enter the ${list === 'allergies' ? 'substance' : 'name'}.`
  if (!reason?.trim()) errors.reason = 'Give a reason — it is saved in the audit trail.'
  else if (reason.trim().length < 4) errors.reason = 'Add a little more detail to the reason.'
  return errors
}

/** The mother's profile (D2). */
export function getMother(id) {
  return get(`/mothers/${seg(id)}`)
}

/** What the ANC form needs. */
export function getAncForm(id) {
  return get(`/mothers/${seg(id)}/anc/form`)
}

/** Record an antenatal visit (D3). */
export function recordAncVisit(id, f) {
  return post(`/mothers/${seg(id)}/anc`, f)
}

/** Record a delivery: creates the baby's record, links it and generates the KEPI schedule. */
export function recordDelivery(id, f) {
  return post(`/mothers/${seg(id)}/delivery`, f)
}

export function getPostnatalForm(id) {
  return get(`/mothers/${seg(id)}/postnatal/form`)
}

/** Record a postnatal visit (D4). */
export function recordPostnatalVisit(id, f) {
  return post(`/mothers/${seg(id)}/postnatal`, f)
}

/** Add, edit or remove an allergy, condition, medicine or diagnosis, with a reason (D5). */
export function editRecord(kind, id, { list, action, itemId, fields, reason }) {
  return patch(`/records/${seg(kind)}/${seg(id)}`, { list, action, itemId, fields, reason })
}

/** Lists and audit trail for the edit panel. */
export function getRecordForEdit(kind, id) {
  return get(`/records/${seg(kind)}/${seg(id)}`)
}

/** Mothers for the booking form's patient picker. */
export function listMotherOptions() {
  return get('/mothers/options')
}
