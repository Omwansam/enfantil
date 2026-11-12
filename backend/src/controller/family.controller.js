/**
 * Family app controllers. The signed-in account comes from the token; every
 * service only ever sees that account's own records and children.
 */
import * as appointments from '../services/family/api/appointments.js'
import * as auth from '../services/family/api/auth.js'
import * as children from '../services/family/api/children.js'
import * as growth from '../services/family/api/growth.js'
import * as help from '../services/family/api/help.js'
import * as immunizations from '../services/family/api/immunizations.js'
import * as maternal from '../services/family/api/maternal.js'
import * as messages from '../services/family/api/messages.js'
import * as notifications from '../services/family/api/notifications.js'
import * as settings from '../services/family/api/settings.js'
import { checkCode, issueCode } from '../services/otp.js'
import { read } from '../services/store/state.js'

/** Sends what the service returned (null is a valid answer: "no pregnancy", "no share link"). */
const send = (fn) => async (req, res) => {
  const result = await fn(req, res)
  res.json(result === undefined ? { ok: true } : result)
}
const body = (req) => req.body ?? {}

// ------------------------------------------------------------------ auth
export const signIn = send((req) => auth.signIn(body(req)))
export const sendSmsSignInCode = send((req) => auth.sendSmsSignInCode(body(req).phone))
export const verifySmsSignInCode = send((req) => auth.verifySmsSignInCode(body(req).phone, body(req).code))
export const requestPasswordReset = send((req) => auth.requestPasswordReset(body(req).phone))
export const verifyResetCode = send((req) => auth.verifyResetCode(body(req).phone, body(req).code))
export const resetPassword = send((req) => auth.resetPassword(body(req)))
export const startRegistration = send((req) => auth.startRegistration(body(req)))
export const completeRegistration = send((req) => auth.completeRegistration(body(req)))

// -------------------------------------------------------------- children
export const getProfiles = send(() => children.getProfiles())
export const getChildren = send(() => children.getChildren())
export const getChild = send((req) => children.getChild(req.params.id))
export const getHealthProfile = send((req) => children.getHealthProfile(req.params.id))
export const getChildOverview = send((req) => children.getChildOverview(req.params.id))
/** Finds the record, then texts a code to the phone on the family account. */
export const findChildRecord = send(async (req) => {
  const record = await children.findChildRecord(body(req))
  if (!record.alreadyLinked) await issueCode('link', record.phone)
  return record
})
export const linkChildRecord = send(async (req) => {
  const state = await read()
  const account = state.accounts.find((a) => a.id === req.user.id)
  await checkCode('link', account.phone, body(req).code)
  return children.linkChildRecord(body(req))
})
export const addChildManually = send((req) => children.addChildManually(body(req)))
export const getMeasurements = send((req) => growth.getMeasurements(req.params.id))

// --------------------------------------------------------------- vaccines
export const getImmunizations = send((req) => immunizations.getImmunizations(req.params.id))
export const getDose = send((req) => immunizations.getDose(req.params.id))
export const getOptionalVaccines = send((req) => immunizations.getOptionalVaccines(req.params.id))
export const setOptionalVaccine = send((req) => immunizations.setOptionalVaccine(req.params.id, req.params.vaccineId, Boolean(body(req).inPlan)))
export const getShareLink = send((req) => immunizations.getShareLink(req.params.id))
export const createShareLink = send((req) => immunizations.createShareLink(req.params.id))
export const revokeShareLink = send((req) => immunizations.revokeShareLink(req.params.id))

// ------------------------------------------------------------ appointments
export const getAppointments = send((req) =>
  appointments.getAppointments({ when: String(req.query.when ?? 'all'), childId: req.query.childId ? String(req.query.childId) : undefined }),
)
export const getAppointment = send((req) => appointments.getAppointment(req.params.id))
export const getBookingOptions = send(() => appointments.getBookingOptions())
export const getAvailability = send((req) =>
  appointments.getAvailability({
    clinicianId: req.query.clinicianId ? String(req.query.clinicianId) : undefined,
    forId: req.query.forId ? String(req.query.forId) : undefined,
  }),
)
export const requestAppointment = send((req) => appointments.requestAppointment(body(req)))
export const cancelAppointmentRequest = send((req) => appointments.cancelAppointmentRequest(req.params.id))
export const respondToProposal = send((req) => appointments.respondToProposal(req.params.id, Boolean(body(req).accept)))

// ---------------------------------------------------------------- messages
export const getConversations = send(() => messages.getConversations())
export const getConversation = send((req) => messages.getConversation(req.params.id))
export const openConversationWith = send((req) => messages.openConversationWith(body(req)))
export const markConversationRead = send((req) => messages.markConversationRead(req.params.id))
export const sendMessage = send((req) => messages.sendMessage(req.params.id, body(req)))

// ----------------------------------------------------------- notifications
export const getNotifications = send(() => notifications.getNotifications())
export const markNotificationRead = send((req) => notifications.markNotificationRead(req.params.id))
export const markAllNotificationsRead = send(() => notifications.markAllNotificationsRead())
export const getUnreadCounts = send(() => notifications.getUnreadCounts())

// ---------------------------------------------------------------- settings
export const getProfile = send(() => settings.getProfile())
export const updateProfile = send((req) => settings.updateProfile(body(req)))
export const getSettings = send(() => settings.getSettings())
export const updateReminders = send((req) => settings.updateReminders(body(req)))
export const updateLanguage = send((req) => settings.updateLanguage(body(req).language))
export const getRecordAccess = send(() => settings.getRecordAccess())
export const changePassword = send((req) => settings.changePassword(body(req)))
export const getHelpArticles = send(() => help.getHelpArticles())

// --------------------------------------------------- the mother's own care
export const getMeOverview = send(() => maternal.getMeOverview())
export const getMyHealthRecord = send(() => maternal.getMyHealthRecord())
export const addHealthItem = send((req) => maternal.addHealthItem(req.params.kind, body(req)))
export const removeHealthItem = send((req) => maternal.removeHealthItem(req.params.kind, req.params.itemId))
export const updatePersonalDetails = send((req) => maternal.updatePersonalDetails(body(req)))
export const getPregnancy = send(() => maternal.getPregnancy())
export const getAncSchedule = send(() => maternal.getAncSchedule())
export const getAncVisit = send((req) => maternal.getAncVisit(req.params.id))
export const getMaternalProgress = send(() => maternal.getMaternalProgress())
export const getMaternalVaccines = send(() => maternal.getMaternalVaccines())
export const getPostnatalCare = send(() => maternal.getPostnatalCare())
