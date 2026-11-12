import { ApiError, nextId, notFound, request, write } from './client'
import { byDateDesc, childSummary, enrichAppointment, enrichChild, enrichDose, findClinician, findFacility, isUpcoming, byDateAsc, meSummary } from './helpers'
import { notifyStaff } from '../../notify.js'
import { toISODate, toISODateTime, TODAY } from '../utils/dates'

export function getChildren() {
  return request((db) => db.children.map((c) => enrichChild(db, c)))
}

/** The profiles a mother can switch between: herself ("Me") and each child. */
export function getProfiles() {
  return request((db) => ({ me: meSummary(db), children: db.children.map((c) => enrichChild(db, c)) }))
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
    const id = String(patientId ?? '').trim().toUpperCase()
    if (!PATIENT_ID.test(id)) throw new ApiError('Patient IDs look like TFH-P-250118-007.', { field: 'patientId' })
    const record = db.clinicRegistry.find((r) => r.patientId === id && r.dob === dob)
    if (!record) {
      throw new ApiError(
        'We couldn’t find a record with that patient ID and date of birth. Check the MCH handbook, or enter the details yourself.',
        { field: 'patientId', status: 404 },
      )
    }
    const facility = findFacility(db, record.facilityId)
    if (record.linkedTo && record.linkedTo.accountId !== db.caregiver.id) {
      throw new ApiError('This record is already linked to another family account. Ask Tumaini Family Hospital’s records desk for help.', {
        field: 'patientId',
        status: 409,
      })
    }
    const alreadyLinked = Boolean(record.linkedTo && db.children.some((c) => c.id === record.linkedTo.childId))
    const dosesOnRecord = db.state.doses.filter((d) => d.patientId === record._id).length
    const { _id, ...shown } = record
    return { ...shown, facility, alreadyLinked, dosesOnRecord, phone: db.caregiver.phone }
  })
}

/** Links a hospital record after the caregiver enters the SMS code (checked by the route). */
export function linkChildRecord({ patientId, dob }) {
  return write((state, account, view) => {
    const id = String(patientId ?? '').trim().toUpperCase()
    const p = state.patients.find((x) => x.patientId === id && x.dob === dob)
    if (!p) throw notFound('This record')
    const accounts = new Set(state.accounts.map((a) => a.id))
    const linked = p.caregivers.find((c) => accounts.has(c.id))
    if (linked) {
      throw new ApiError(linked.id === account.id ? 'This child is already on your account.' : 'This record is linked to another family account.', { status: 409 })
    }
    const existing = p.caregivers.find((c) => c.phone === account.phone)
    const entry = {
      id: account.id,
      name: account.fullName,
      relationship: account.relationship,
      phone: account.phone,
      email: account.email ?? '',
      primary: existing?.primary ?? p.caregivers.length === 0,
      hasApp: true,
      tone: account.avatarTone ?? 'pink',
      ...(account.motherId && account.relationship === 'Mother' ? { motherId: account.motherId } : {}),
    }
    // The hospital already had this caregiver by phone: that entry becomes the app account.
    p.caregivers = existing ? p.caregivers.map((c) => (c === existing ? entry : c)) : [...p.caregivers, entry]
    notifyStaff(state, {
      type: 'record',
      title: `${account.fullName} linked ${p.firstName} ${p.lastName}’s record`,
      body: `${p.patientId} is now in the family app.`,
      link: `/clinic/patients/${p.id}`,
    })
    const db = view()
    return enrichChild(db, db.children.find((c) => c.id === p.id))
  })
}

/** Adds a child from details the caregiver typed. The hospital confirms them at the next visit. */
export function addChildManually({ firstName, lastName, dob, sex, placeOfBirth, birthWeightKg, birthLengthCm }) {
  return write((state, account, view) => {
    if (!String(firstName ?? '').trim() || !String(lastName ?? '').trim()) throw new ApiError('Enter the child’s first and last name.', { field: 'firstName' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob ?? '') || dob > toISODate(TODAY)) throw new ApiError('Enter a real date of birth.', { field: 'dob' })
    if (!['female', 'male'].includes(sex)) throw new ApiError('Choose girl or boy.', { field: 'sex' })
    const base = firstName.trim().toLowerCase().replace(/[^a-z]/g, '') || 'child'
    let id = base
    for (let n = 2; state.patients.some((c) => c.id === id); n += 1) id = `${base}-${n}`
    const child = {
      id,
      facilityId: state.facility.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      sex,
      dob,
      patientId: null,
      tone: 'amber',
      birthWeightKg: birthWeightKg ? Number(birthWeightKg) : null,
      birthLengthCm: birthLengthCm ? Number(birthLengthCm) : null,
      birthNotificationNo: '',
      registeredOn: toISODate(TODAY),
      bornAt: String(placeOfBirth ?? '').trim(),
      mainClinicianId: null,
      recordStatus: 'pending',
      caregivers: [
        {
          id: account.id,
          name: account.fullName,
          relationship: account.relationship,
          phone: account.phone,
          email: account.email ?? '',
          primary: true,
          hasApp: true,
          tone: account.avatarTone ?? 'pink',
          ...(account.motherId && account.relationship === 'Mother' ? { motherId: account.motherId } : {}),
        },
      ],
      allergies: [],
      medicines: [],
      conditions: [],
      diagnoses: [],
      audit: [],
      pastVisits: [],
      contactLog: [],
    }
    state.patients.push(child)
    if (child.birthWeightKg && child.birthLengthCm) {
      state.measurements.push({
        id: nextId('m'),
        patientId: id,
        date: dob,
        weightKg: child.birthWeightKg,
        heightCm: child.birthLengthCm,
        muacCm: null,
        tempC: null,
        by: 'Entered by you',
      })
    }
    notifyStaff(state, {
      type: 'record',
      title: `New child added in the family app · ${child.firstName} ${child.lastName}`,
      body: `${account.fullName} entered ${child.firstName}’s details (born ${dob}). Confirm the record at the next visit.`,
      link: '/clinic/patients',
    })
    const db = view()
    return enrichChild(db, db.children.find((c) => c.id === id))
  })
}
