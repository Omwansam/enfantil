import { ApiError, nextId, notFound, request, write } from './client'
import { byDateAsc, byDateDesc, enrichAppointment, findClinician, meSummary, motherStatus, profileSummary, VISIT_TYPES } from './helpers'
import { addDays, formatDate, formatTime, now, toISODate, toISODateTime, TODAY } from '../utils/dates'
import { locationFor, newRef, notifyFamily, notifyStaff } from '../../notify.js'

/** when: 'upcoming' | 'past' | 'all'. Optional childId ('me' or a child) narrows to one profile. */
export function getAppointments({ when = 'all', childId } = {}) {
  return request((db) => {
    let list = db.appointments.map((a) => enrichAppointment(db, a))
    if (childId) list = list.filter((a) => a.childId === childId)
    if (when === 'upcoming') return list.filter((a) => a.upcoming).sort(byDateAsc('start'))
    if (when === 'past') return list.filter((a) => !a.upcoming).sort(byDateDesc('start'))
    return list.sort(byDateAsc('start'))
  })
}

export function getAppointment(id) {
  return request((db) => {
    const a = db.appointments.find((x) => x.id === id)
    if (!a) throw notFound('This visit')
    return enrichAppointment(db, a)
  })
}

const TITLES = {
  antenatal: 'Antenatal visit',
  postnatal: 'Postnatal check',
  vaccination: 'Vaccination',
  growth: 'Growth check',
  sick: 'Sick visit',
  general: 'General consultation',
}

/** Which visit types make sense for a profile. */
function typesFor(db, profileId) {
  if (profileId !== 'me') return ['vaccination', 'growth', 'sick', 'general']
  const status = motherStatus(db)
  if (status.kind === 'pregnant') return ['antenatal', 'sick', 'general']
  if (status.kind === 'postnatal') return ['postnatal', 'sick', 'general']
  return ['general', 'sick']
}

/** Everything the booking flow (M10) needs: who, which visit types, which doctors. */
export function getBookingOptions() {
  return request((db) => {
    const profiles = [meSummary(db), ...db.children.map((c) => profileSummary(db, c.id))].map((p) => ({
      ...p,
      visitTypes: typesFor(db, p.id).map((type) => ({ value: type, ...VISIT_TYPES[type] })),
    }))
    const clinicians = db.clinicians.filter((c) => c.sees.length).map((c) => findClinician(db, c.id))
    return { profiles, clinicians, facility: db.facilities[0] }
  })
}

const WEEKDAY_SLOTS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00']
const SATURDAY_SLOTS = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']

function hash(text) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/**
 * Free times at Tumaini Family Hospital for the next 12 clinic days (closed on
 * Sundays; Saturday mornings only). A time is taken when the chosen doctor
 * (or, with no doctor chosen, every doctor who sees this kind of visit)
 * already has a patient booked then, or when you already have a visit then.
 */
export function getAvailability({ clinicianId, forId } = {}) {
  return request(
    (db) => {
      const seesKind = forId === 'me' ? 'me' : 'child'
      const pool = clinicianId ? [clinicianId] : db.clinicians.filter((c) => c.sees.includes(seesKind)).map((c) => c.id)
      const booked = new Set(
        db.clinicAppointments.filter((a) => a.status !== 'cancelled').map((a) => `${a.clinicianId}|${a.start}`),
      )
      const days = []
      for (let i = 1; days.length < 12 && i < 21; i += 1) {
        const date = addDays(TODAY, i)
        const dow = date.getDay()
        if (dow === 0) continue
        const iso = toISODate(date)
        const times = dow === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS
        const slots = times.map((time) => {
          const start = `${iso}T${time}`
          const mine = db.appointments.some((a) => a.start === start && ['scheduled', 'requested'].includes(a.status))
          const busy = pool.length > 0 && pool.every((id) => booked.has(`${id}|${start}`))
          return { time, free: !mine && !busy }
        })
        days.push({ date: iso, saturday: dow === 6, slots, freeCount: slots.filter((s) => s.free).length })
      }
      return days
    },
    { delay: 260 },
  )
}

/** Validation shared by the booking form and the mock API. */
export function validateBooking(form) {
  const errors = {}
  if (!form.forId) errors.forId = 'Choose who the visit is for'
  if (!form.visitType) errors.visitType = 'Choose the type of visit'
  if (!form.date || !form.time) errors.slot = 'Choose a day and a free time'
  if (form.visitType === 'sick' && !form.note?.trim()) errors.note = 'Tell the doctor what is wrong, so they can prepare'
  if ((form.note ?? '').length > 300) errors.note = 'Keep the note to 300 characters'
  return errors
}

/** Sends a booking request. It shows as "Pending" until a doctor confirms it or proposes another time. */
export function requestAppointment({ forId, visitType, clinicianId, date, time, note, rescheduleOf }) {
  return write((state, account, view) => {
    const db = view()
    const errors = validateBooking({ forId, visitType, date, time, note })
    const first = Object.keys(errors)[0]
    if (first) throw new ApiError(errors[first], { field: first })
    if (forId === 'me' && !account.motherId) throw new ApiError('Your own visits are booked at the maternity desk. Choose a child.', { field: 'forId' })
    if (forId !== 'me' && !db.children.some((c) => c.id === forId)) throw new ApiError('Choose who the visit is for.', { field: 'forId' })
    if (!typesFor(db, forId).includes(visitType)) throw new ApiError('Choose a visit type for this person.', { field: 'visitType' })
    if (clinicianId && !db.clinicians.some((c) => c.id === clinicianId && c.sees.length)) throw new ApiError('Choose a doctor from the list.', { field: 'clinicianId' })
    const start = `${date}T${time}`
    if (start <= toISODateTime(now())) throw new ApiError('Choose a time from tomorrow onwards.', { field: 'slot' })
    if (new Date(`${date}T00:00`).getDay() === 0) throw new ApiError('The hospital’s clinics are closed on Sundays. Choose another day.', { field: 'slot' })
    const original = rescheduleOf ? db.appointments.find((a) => a.id === rescheduleOf) : null
    const who = profileSummary(db, forId)
    const title = original ? `New time for ${original.title}` : TITLES[visitType]
    const id = nextId('req')
    const subjectId = forId === 'me' ? account.motherId : forId
    state.requests.push({
      id,
      patientId: subjectId,
      accountId: account.id,
      forLabel: forId === 'me' ? `${account.fullName} (herself)` : `${who.fullName} (${who.ageShort})`,
      requestedBy: {
        name: account.fullName,
        relationship: forId === 'me' ? 'Patient' : account.relationship,
        phone: account.phone,
        ...(account.motherId ? { motherId: account.motherId } : {}),
      },
      visitType,
      title,
      preferredStart: start,
      clinicianId: clinicianId || null,
      note: note?.trim() || null,
      requestedAt: toISODateTime(now()),
      status: 'pending',
      ref: newRef('R'),
      ...(rescheduleOf ? { rescheduleOf } : {}),
    })
    notifyFamily(state, {
      accountId: account.id,
      type: 'appointment',
      childId: forId,
      title: 'Request sent',
      body: `${TITLES[visitType]} for ${forId === 'me' ? 'you' : who.firstName}, ${formatDate(start, 'weekday')} at ${formatTime(start)}. Waiting for the hospital to confirm.`,
      target: { appointmentId: id },
      read: true,
    })
    notifyStaff(state, {
      type: 'request',
      title: `New appointment request · ${forId === 'me' ? account.fullName : who.fullName}`,
      body: `${TITLES[visitType]} requested by ${account.fullName} for ${formatDate(start, 'weekday')} at ${formatTime(start)}${note?.trim() ? ` — ${note.trim().slice(0, 80)}` : ''}.`,
      link: '/clinic/requests',
    })
    const after = view()
    return enrichAppointment(after, after.appointments.find((a) => a.id === id))
  })
}

/** Withdraws a request the hospital has not confirmed yet. */
export function cancelAppointmentRequest(id) {
  return write((state, account, view) => {
    const r = state.requests.find((x) => x.id === id && x.accountId === account.id)
    if (!r) throw notFound('This request')
    if (!['pending', 'proposed'].includes(r.status)) throw new ApiError('Only requests that are not confirmed yet can be cancelled here.')
    Object.assign(r, { status: 'cancelled', summary: 'You cancelled this request.', respondedAt: toISODateTime(now()) })
    notifyStaff(state, {
      type: 'request',
      title: `Request withdrawn · ${r.forLabel ?? account.fullName}`,
      body: `${account.fullName} cancelled the ${r.title ?? VISIT_TYPES[r.visitType]?.label ?? 'visit'} request for ${formatDate(r.preferredStart, 'weekday')}.`,
      link: '/clinic/requests',
    })
    const db = view()
    return enrichAppointment(db, db.appointments.find((a) => a.id === id))
  })
}

/** Accept or decline a new time the doctor proposed. Accepting books the visit. */
export function respondToProposal(id, accept) {
  return write((state, account, view) => {
    const r = state.requests.find((x) => x.id === id && x.accountId === account.id)
    if (!r?.proposal || r.status !== 'proposed') throw notFound('This proposed time')
    const stamp = toISODateTime(now())
    const maternal = Boolean(account.motherId) && r.patientId === account.motherId
    let appointmentId = id
    if (accept) {
      const room = maternal ? 'Room 4' : 'Room 2'
      appointmentId = nextId('a')
      state.appointments.push({
        id: appointmentId,
        patientId: r.patientId,
        start: r.proposal.start,
        durationMin: maternal ? 20 : 15,
        reason: r.title ?? TITLES[r.visitType],
        reasonLong: r.title ?? TITLES[r.visitType],
        clinicianId: r.proposal.clinicianId ?? r.clinicianId,
        room,
        status: 'upcoming',
        visitType: r.visitType,
        doseKeys: [],
        noteForCaregiver: r.note ?? '',
        clinicalNote: '',
        cancelReason: '',
        history: [{ at: stamp, action: 'booked: parent accepted the proposed time' }],
        createdAt: stamp,
        ref: (r.ref ?? newRef('R')).replace('-R-', '-A-'),
        location: locationFor(room, r.visitType, maternal),
      })
      Object.assign(r, { status: 'confirmed', appointmentId, confirmedStart: r.proposal.start, confirmedClinicianId: r.proposal.clinicianId ?? r.clinicianId, respondedAt: stamp })
    } else {
      Object.assign(r, { status: 'cancelled', summary: 'You declined the proposed time. Send a new request whenever you are ready.', respondedAt: stamp })
    }
    for (const n of state.familyNotifications) if (n.accountId === account.id && n.target?.appointmentId === id) n.read = true
    notifyStaff(state, {
      to: [r.proposal.clinicianId, r.clinicianId].filter(Boolean).length ? [...new Set([r.proposal.clinicianId, r.clinicianId].filter(Boolean))] : undefined,
      type: 'request',
      title: `${account.fullName} ${accept ? 'accepted' : 'declined'} the proposed time`,
      body: `${r.title ?? TITLES[r.visitType]} · ${formatDate(r.proposal.start, 'weekday')} at ${formatTime(r.proposal.start)}${accept ? ' is now booked.' : '.'}`,
      link: accept ? '/clinic/appointments' : '/clinic/requests',
    })
    const db = view()
    return enrichAppointment(db, db.appointments.find((a) => a.id === appointmentId))
  })
}

