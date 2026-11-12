/**
 * Clinician portal controllers: read the request, call the portal service,
 * send its JSON. The signed-in staff member comes from the token (req.user),
 * never from the request body.
 */
import * as appointments from '../services/clinic/api/appointments.js'
import * as auth from '../services/clinic/api/auth.js'
import * as caregivers from '../services/clinic/api/caregivers.js'
import * as coverage from '../services/clinic/api/coverage.js'
import * as dashboard from '../services/clinic/api/dashboard.js'
import * as growth from '../services/clinic/api/growth.js'
import * as immunizations from '../services/clinic/api/immunizations.js'
import * as messages from '../services/clinic/api/messages.js'
import * as mothers from '../services/clinic/api/mothers.js'
import * as notifications from '../services/clinic/api/notifications.js'
import * as patients from '../services/clinic/api/patients.js'
import * as reminders from '../services/clinic/api/reminders.js'
import * as requests from '../services/clinic/api/requests.js'
import * as visitNotes from '../services/clinic/api/visitNotes.js'
import { ApiError } from '../services/errors.js'
import { audienceFor } from '../services/notify.js'
import { mutate, read } from '../services/store/state.js'
import { now, toISODateTime } from '../services/clinic/utils/dates.js'

/** Sends what the service returned (null is a valid answer: "no pregnancy", "no share link"). */
const send = (fn) => async (req, res) => {
  const result = await fn(req, res)
  res.json(result === undefined ? { ok: true } : result)
}
const me = (req) => req.user.id
const int = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Number(v) : fallback)

/** "Who can see my records": when the care team last opened a mother's or child's record (at most every 10 minutes). */
function recordViewed(subjectId) {
  const at = toISODateTime(now())
  mutate((draft) => {
    for (const { account } of audienceFor(draft, subjectId)) {
      const last = account.consent?.lastViewed
      if (!last || Date.parse(`${at}:00`) - Date.parse(`${last}:00`) > 10 * 60 * 1000) account.consent = { ...account.consent, lastViewed: at }
    }
  }).catch((err) => console.error('[record view]', err.message))
}

// ------------------------------------------------------------------ auth
export const signIn = send((req) => auth.signIn(req.body ?? {}))
export const requestPasswordReset = send((req) => auth.requestPasswordReset(req.body ?? {}))
export const getMe = send((req) => auth.me(me(req)))

// ------------------------------------------------------------- dashboard
export const getDashboard = send((req) => dashboard.getDashboard(me(req)))
export const getNavCounts = send((req) => dashboard.getNavCounts(me(req)))

// -------------------------------------------------------------- patients
export const listPatients = send((req) =>
  patients.listPatients({
    q: String(req.query.q ?? ''),
    tab: String(req.query.tab ?? 'all'),
    group: String(req.query.group ?? 'all'),
    page: int(req.query.page, 1),
    pageSize: Math.min(100, int(req.query.pageSize, 10)),
  }),
)
export const exportPatients = send((req) =>
  patients.exportPatients({ q: String(req.query.q ?? ''), tab: String(req.query.tab ?? 'all'), group: String(req.query.group ?? 'all') }),
)
export const searchPatients = send((req) => patients.searchPatients(String(req.query.q ?? ''), Math.min(20, int(req.query.limit, 6))))
export const getPatientOptions = send(() => patients.getPatientOptions())
export const checkDuplicate = send((req) => patients.checkDuplicate(req.body ?? {}))
export const suggestFirstVisit = send((req) => patients.suggestFirstVisit(String(req.query.dob ?? '')))
export const registerPatient = send((req) => patients.registerPatient(req.body ?? {}))
export const getPatient = send(async (req) => {
  const result = await patients.getPatient(req.params.id)
  recordViewed(req.params.id)
  return result
})
export const getCaregivers = send((req) => caregivers.getCaregivers(req.params.id))
export const sendFamilyInvite = send((req) => caregivers.sendFamilyInvite(req.params.id, req.params.caregiverId))

// --------------------------------------------------------- immunizations
export const getRecordForm = send((req) => immunizations.getRecordForm(req.params.id))
export const recordImmunization = send((req) => immunizations.recordImmunization(req.params.id, req.body ?? {}))

// ---------------------------------------------------------------- growth
export const getMeasurements = send((req) => growth.getMeasurements(req.params.id))
export const saveMeasurement = send(async (req) => {
  const state = await read()
  const name = state.staff.find((s) => s.id === me(req))?.name ?? 'Clinic staff'
  return growth.saveMeasurement(req.params.id, req.body ?? {}, name)
})
export const deleteMeasurement = send((req) => growth.deleteMeasurement(req.params.id))

// ---------------------------------------------------------- appointments
export const getSchedule = send((req) =>
  appointments.getSchedule({
    from: String(req.query.from ?? ''),
    to: String(req.query.to ?? ''),
    clinicianId: String(req.query.clinician ?? req.query.clinicianId ?? 'all'),
    status: String(req.query.status ?? 'all'),
  }),
)
export const getBookingOptions = send(() => appointments.getBookingOptions())
export const getAvailability = send((req) =>
  appointments.getAvailability({
    date: String(req.query.date ?? ''),
    clinicianId: String(req.query.clinician ?? req.query.clinicianId ?? ''),
    excludeId: req.query.excludeId ? String(req.query.excludeId) : undefined,
  }),
)
export const createAppointment = send((req) => appointments.createAppointment(req.body ?? {}))
export const rescheduleAppointment = send((req) => appointments.rescheduleAppointment(req.params.id, req.body ?? {}))
export const cancelAppointment = send((req) => appointments.cancelAppointment(req.params.id, req.body ?? {}))

// -------------------------------------------------------------- messages
export const getConversations = send(() => messages.getConversations())
export const getConversation = send((req) => messages.getConversation(req.params.id))
export const markConversationRead = send((req) => messages.markConversationRead(req.params.id))
export const sendMessage = send((req) => messages.sendMessage(req.params.id, req.body?.body))
export const openConversation = send((req) => {
  if (req.body?.motherId) return messages.openConversationWithMother(String(req.body.motherId))
  if (req.body?.patientId) return messages.openConversationWithCaregiver(String(req.body.patientId))
  throw new ApiError('Choose who to message.', { status: 422, field: 'patientId' })
})

// ----------------------------------------------------------- visit notes
export const getNotesQueue = send((req) => visitNotes.getNotesQueue(me(req)))
export const getVisitNote = send((req) => visitNotes.getVisitNote(req.params.id, me(req)))
export const saveDraft = send((req) => visitNotes.saveDraft(req.params.id, req.body ?? {}))
export const signNote = send((req) => visitNotes.signNote(req.params.id, req.body ?? {}, me(req)))

// ------------------------------------------------- coverage & reminders
export const getCoverage = send((req) => coverage.getCoverage(String(req.query.period ?? '')))
export const getDefaulters = send(() => coverage.getDefaulters())
export const sendReminder = send((req) => reminders.sendReminder(String(req.body?.patientId ?? '')))
export const sendReminders = send((req) => reminders.sendReminders(Array.isArray(req.body?.patientIds) ? req.body.patientIds.map(String) : []))

// --------------------------------------------------------------- mothers
export const listMotherOptions = send(() => mothers.listMotherOptions())
export const getMother = send(async (req) => {
  const result = await mothers.getMother(req.params.id)
  recordViewed(req.params.id)
  return result
})
export const getAncForm = send((req) => mothers.getAncForm(req.params.id))
export const recordAncVisit = send((req) => mothers.recordAncVisit(req.params.id, req.body ?? {}, me(req)))
export const recordDelivery = send((req) => mothers.recordDelivery(req.params.id, req.body ?? {}, me(req)))
export const getPostnatalForm = send((req) => mothers.getPostnatalForm(req.params.id))
export const recordPostnatalVisit = send((req) => mothers.recordPostnatalVisit(req.params.id, req.body ?? {}, me(req)))
export const getRecordForEdit = send((req) => mothers.getRecordForEdit(req.params.kind, req.params.id))
export const editRecord = send((req) => mothers.editRecord(req.params.kind, req.params.id, req.body ?? {}, me(req)))

// -------------------------------------------------------------- requests
export const getRequests = send(() => requests.getRequests())
export const confirmRequest = send((req) => requests.confirmRequest(req.params.id, req.body ?? {}))
export const proposeTime = send((req) => requests.proposeTime(req.params.id, req.body ?? {}))
export const declineRequest = send((req) => requests.declineRequest(req.params.id, req.body ?? {}))

// --------------------------------------------------------- notifications
export const getStaffNotifications = send((req) => notifications.getStaffNotifications(me(req)))
export const markStaffNotificationRead = send((req) => notifications.markStaffNotificationRead(req.params.id))
export const markAllStaffNotificationsRead = send((req) => notifications.markAllStaffNotificationsRead(me(req)))
