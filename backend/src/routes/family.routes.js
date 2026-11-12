/** Family app API, mounted at /api/family. Everything after /auth needs a family token. */
import { Router } from 'express'
import * as c from '../controller/family.controller.js'
import protect from '../middleware/protect.middleware.js'
import { codeCheckLimiter, signInLimiter, smsLimiter } from '../middleware/rate-limit.middleware.js'

const router = Router()

router.post('/auth/sign-in', signInLimiter, c.signIn)
router.post('/auth/sms-code', smsLimiter, c.sendSmsSignInCode)
router.post('/auth/sms-code/verify', codeCheckLimiter, c.verifySmsSignInCode)
router.post('/auth/password-reset', smsLimiter, c.requestPasswordReset)
router.post('/auth/password-reset/verify', codeCheckLimiter, c.verifyResetCode)
router.post('/auth/password-reset/complete', codeCheckLimiter, c.resetPassword)
router.post('/auth/register', smsLimiter, c.startRegistration)
router.post('/auth/register/confirm', codeCheckLimiter, c.completeRegistration)

router.use(protect('family'))

// The mother and her children
router.get('/me/profiles', c.getProfiles)
router.get('/children', c.getChildren)
router.post('/children', c.addChildManually)
router.post('/children/lookup', smsLimiter, c.findChildRecord)
router.post('/children/link', codeCheckLimiter, c.linkChildRecord)
router.get('/children/:id', c.getChild)
router.get('/children/:id/health', c.getHealthProfile)
router.get('/children/:id/overview', c.getChildOverview)
router.get('/children/:id/measurements', c.getMeasurements)
router.get('/children/:id/immunizations', c.getImmunizations)
router.get('/children/:id/optional-vaccines', c.getOptionalVaccines)
router.put('/children/:id/optional-vaccines/:vaccineId', c.setOptionalVaccine)
router.get('/children/:id/share-link', c.getShareLink)
router.post('/children/:id/share-link', c.createShareLink)
router.delete('/children/:id/share-link', c.revokeShareLink)
router.get('/doses/:id', c.getDose)

// Visits and booking requests
router.get('/appointments', c.getAppointments)
router.post('/appointments/requests', c.requestAppointment)
router.delete('/appointments/requests/:id', c.cancelAppointmentRequest)
router.post('/appointments/requests/:id/proposal', c.respondToProposal)
router.get('/appointments/:id', c.getAppointment)
router.get('/booking/options', c.getBookingOptions)
router.get('/booking/slots', c.getAvailability)

// Messages and notifications
router.get('/conversations', c.getConversations)
router.post('/conversations', c.openConversationWith)
router.get('/conversations/:id', c.getConversation)
router.post('/conversations/:id/read', c.markConversationRead)
router.post('/conversations/:id/messages', c.sendMessage)
router.get('/notifications', c.getNotifications)
router.get('/notifications/unread-counts', c.getUnreadCounts)
router.post('/notifications/read-all', c.markAllNotificationsRead)
router.post('/notifications/:id/read', c.markNotificationRead)

// Account and settings
router.get('/me', c.getProfile)
router.patch('/me', c.updateProfile)
router.get('/me/settings', c.getSettings)
router.patch('/me/settings/reminders', c.updateReminders)
router.patch('/me/settings/language', c.updateLanguage)
router.get('/me/record-access', c.getRecordAccess)
router.post('/me/password', signInLimiter, c.changePassword)
router.get('/help/articles', c.getHelpArticles)

// The mother's own care (M2–M9)
router.get('/me/overview', c.getMeOverview)
router.get('/me/health-record', c.getMyHealthRecord)
router.patch('/me/health-record', c.updatePersonalDetails)
router.post('/me/health-record/:kind', c.addHealthItem)
router.delete('/me/health-record/:kind/:itemId', c.removeHealthItem)
router.get('/me/pregnancy', c.getPregnancy)
router.get('/me/antenatal', c.getAncSchedule)
router.get('/me/antenatal/:id', c.getAncVisit)
router.get('/me/progress', c.getMaternalProgress)
router.get('/me/vaccines', c.getMaternalVaccines)
router.get('/me/postnatal', c.getPostnatalCare)

export default router
