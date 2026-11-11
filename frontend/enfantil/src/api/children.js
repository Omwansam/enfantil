import { ApiError, notFound, request } from './client'
import { byDateDesc, childSummary, enrichAppointment, enrichChild, enrichDose, findClinician, findFacility, isUpcoming, byDateAsc } from './helpers'
import { generateKepiDoses } from '../data/mockData'
import { toDate, toISODate, TODAY } from '../utils/dates'

export function getChildren() {
  return request((db) => db.children.map((c) => enrichChild(db, c)))
}

export function getChild(childId) {
  return request((db) => {
    const child = childSummary(db, childId)
    if (!child) throw notFound('This child')
    return child
  })
}

/** Everything the Health profile side cards need. */
export function getHealthProfile(childId) {
  return request((db) => {
    const child = childSummary(db, childId)
    if (!child) throw notFound('This child')
    return { ...child, mainClinician: child.mainClinicianId ? findClinician(db, child.mainClinicianId) : null }
  })
}

/** Dashboard summary for one child: latest growth, overdue doses, next vaccine and next visit. */
export function getChildOverview(childId) {
  return request((db) => {
    const child = childSummary(db, childId)
    if (!child) throw notFound('This child')
    const latest = db.measurements.filter((m) => m.childId === childId).sort(byDateDesc('date'))[0] ?? null
    const doses = db.doses.filter((d) => d.childId === childId).map((d) => enrichDose(db, d))
    const overdue = doses.filter((d) => d.status === 'Overdue').sort(byDateAsc('dueOn'))
    const nextDose = doses.filter((d) => d.status === 'Planned').sort(byDateAsc('dueOn'))[0] ?? null
    const nextVisit =
      db.appointments
        .filter((a) => a.childId === childId && isUpcoming(a))
        .sort(byDateAsc('start'))
        .map((a) => enrichAppointment(db, a))[0] ?? null
    return { child, latestMeasurement: latest, overdue, nextDose, nextVisit }
  })
}

const PATIENT_ID = /^[A-Z0-9]{2,4}-P-\d{6}-\d{3}$/

export function findChildRecord({ patientId, dob }) {
  return request((db) => {
    const id = patientId.trim().toUpperCase()
    if (!PATIENT_ID.test(id)) throw new ApiError('Patient IDs look like KL4-P-230604-031.', { field: 'patientId' })
    const record = db.clinicRegistry.find((r) => r.patientId === id && r.dob === dob)
    if (!record) {
      throw new ApiError(
        'We couldn’t find a record with that patient ID and date of birth. Check the MCH handbook, or enter the details yourself.',
        { field: 'patientId', status: 404 },
      )
    }
    const facility = findFacility(db, record.facilityId)
    const alreadyLinked = Boolean(record.linkedChildId && db.children.some((c) => c.id === record.linkedChildId))
    const dosesOnRecord = alreadyLinked
      ? db.doses.filter((d) => d.childId === record.linkedChildId && d.givenOn).length
      : generateKepiDoses('preview', record.dob, { givenUntil: toISODate(TODAY), givenBy: '', facilityLabel: '' }).filter(
          (d) => d.givenOn,
        ).length
    return { ...record, facility, alreadyLinked, dosesOnRecord, phone: db.caregiver.phone }
  })
}

/** Links a clinic record after the caregiver enters the SMS code the clinic sent. */
export function linkChildRecord({ patientId, dob, code }) {
  return request(
    (db) => {
      if (!/^\d{6}$/.test(code) || code === '000000') {
        throw new ApiError('That code is not right. Check the SMS and try again.', { field: 'code' })
      }
      const record = db.clinicRegistry.find((r) => r.patientId === patientId && r.dob === dob)
      if (!record) throw notFound('This record')
      if (record.linkedChildId && db.children.some((c) => c.id === record.linkedChildId)) {
        throw new ApiError('This child is already on your account.', { status: 409 })
      }
      const id = record.firstName.toLowerCase()
      const facility = findFacility(db, record.facilityId)
      db.children.push({
        id,
        firstName: record.firstName,
        lastName: record.lastName,
        sex: record.sex,
        dob: record.dob,
        patientId: record.patientId,
        facilityId: record.facilityId,
        bornAt: facility?.name ?? '',
        birthWeightKg: record.birthWeightKg ?? null,
        birthLengthCm: record.birthLengthCm ?? null,
        mainClinicianId: null,
        tone: 'indigo',
        recordStatus: 'linked',
        allergies: [],
        medicines: [],
      })
      db.doses.push(
        ...generateKepiDoses(id, record.dob, {
          givenUntil: toISODate(TODAY),
          givenBy: 'Clinic record',
          facilityLabel: facility?.shortName ?? '',
          batchSeed: 41,
        }).filter((d) => d.givenOn || toDate(d.dueOn) <= toDate('2027-12-31')),
      )
      db.measurements.push({
        id: `gm-${id}-1`,
        childId: id,
        date: record.dob,
        weightKg: record.birthWeightKg ?? 3.3,
        heightCm: record.birthLengthCm ?? 50,
        measuredBy: 'Clinic record',
        facilityId: record.facilityId,
      })
      db.clinicAccess.push({
        id: `acc-${id}`,
        facilityId: record.facilityId,
        childIds: [id],
        since: toISODate(TODAY),
        lastViewed: toISODate(TODAY),
        active: true,
      })
      record.linkedChildId = id
      return enrichChild(db, db.children[db.children.length - 1])
    },
    { mutates: true },
  )
}

/** Adds a child from details the caregiver typed. The clinic confirms them at the next visit. */
export function addChildManually({ firstName, lastName, dob, sex, placeOfBirth, birthWeightKg, birthLengthCm }) {
  return request(
    (db) => {
      const base = firstName.trim().toLowerCase().replace(/[^a-z]/g, '') || 'child'
      let id = base
      for (let n = 2; db.children.some((c) => c.id === id); n += 1) id = `${base}-${n}`
      const child = {
        id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        sex,
        dob,
        patientId: null,
        facilityId: null,
        bornAt: placeOfBirth.trim(),
        birthWeightKg: birthWeightKg ? Number(birthWeightKg) : null,
        birthLengthCm: birthLengthCm ? Number(birthLengthCm) : null,
        mainClinicianId: null,
        tone: 'amber',
        recordStatus: 'pending',
        allergies: [],
        medicines: [],
      }
      db.children.push(child)
      if (child.birthWeightKg && child.birthLengthCm) {
        db.measurements.push({
          id: `gm-${id}-1`,
          childId: id,
          date: dob,
          weightKg: child.birthWeightKg,
          heightCm: child.birthLengthCm,
          measuredBy: 'Entered by you',
          facilityId: null,
        })
      }
      return enrichChild(db, child)
    },
    { mutates: true },
  )
}
