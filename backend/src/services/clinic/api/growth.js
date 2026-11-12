/** Infant growth measurements (D6): list, add, edit and delete. */
import { ageInMonths, formatAge, isValidISODate, TODAY_ISO } from '../utils/dates'
import { notifySubject } from '../../notify.js'
import { invalid, notFound, request } from './client'
import { nowISO } from './helpers'

/** GET /api/patients/:id/measurements — oldest first, with age at each. */
export function getMeasurements(patientId) {
  return request((db) => {
    const p = db.patients.find((x) => x.id === patientId)
    if (!p) throw notFound('This patient')
    return db.measurements
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((m) => ({ ...m, ageMonths: ageInMonths(p.dob, m.date), ageLabel: m.date === p.dob ? 'Birth' : formatAge(p.dob, m.date) }))
  })
}

export function validateMeasurement(f, { dob } = {}) {
  const errors = {}
  if (!f.date || !isValidISODate(f.date)) errors.date = 'Enter the date.'
  else if (f.date > TODAY_ISO) errors.date = 'The date can’t be in the future.'
  else if (dob && f.date < dob) errors.date = 'The date is before the date of birth.'
  const w = f.weightKg === '' ? null : Number(f.weightKg)
  const h = f.heightCm === '' ? null : Number(f.heightCm)
  if (w === null && h === null) errors.weightKg = 'Enter a weight, a height or both.'
  if (w !== null && (!Number.isFinite(w) || w < 0.4 || w > 40)) errors.weightKg = 'Weight should be between 0.4 and 40 kg.'
  if (h !== null && (!Number.isFinite(h) || h < 30 || h > 130)) errors.heightCm = 'Height should be between 30 and 130 cm.'
  if (f.muacCm && (Number(f.muacCm) < 6 || Number(f.muacCm) > 25)) errors.muacCm = 'MUAC should be between 6 and 25 cm.'
  return errors
}

/** POST/PATCH /api/patients/:id/measurements */
export function saveMeasurement(patientId, f, byName) {
  return request(
    (db) => {
      const p = db.patients.find((x) => x.id === patientId)
      if (!p) throw notFound('This patient')
      const errors = validateMeasurement(f, { dob: p.dob })
      if (Object.keys(errors).length) throw invalid(errors)
      const values = {
        date: f.date,
        weightKg: f.weightKg === '' ? null : Number(f.weightKg),
        heightCm: f.heightCm === '' ? null : Number(f.heightCm),
        muacCm: f.muacCm ? Number(f.muacCm) : null,
        by: byName,
      }
      if (f.id) {
        const m = db.measurements.find((x) => x.id === f.id)
        if (!m) throw notFound('This measurement')
        Object.assign(m, values)
      } else {
        db.measurements.push({ id: `m-${patientId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, patientId, tempC: null, ...values })
      }
      p.audit ??= []
      p.audit.push({
        id: `au-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: nowISO(),
        by: byName,
        action: `${f.id ? 'Edited' : 'Added'} measurement on ${f.date}`,
        reason: 'Growth record',
      })
      if (!f.id) {
        notifySubject(db, patientId, {
          type: 'growth',
          title: 'New growth measurement',
          body: [values.weightKg && `${values.weightKg} kg`, values.heightCm && `${values.heightCm} cm`].filter(Boolean).join(' · ') + `, recorded ${f.date}`,
          target: { page: 'health' },
        })
      }
      return { ok: true }
    },
    { mutates: true, delay: 400 },
  )
}

/** DELETE /api/measurements/:id */
export function deleteMeasurement(id) {
  return request(
    (db) => {
      const before = db.measurements.length
      db.measurements = db.measurements.filter((m) => m.id !== id)
      if (db.measurements.length === before) throw notFound('This measurement')
      return { ok: true }
    },
    { mutates: true, delay: 350 },
  )
}
