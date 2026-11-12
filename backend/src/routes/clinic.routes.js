/** Clinician portal API, mounted at /api/clinic. Everything after /auth needs a staff token. */
import { Router } from 'express'
import * as c from '../controller/clinic.controller.js'
import protect from '../middleware/protect.middleware.js'
import { signInLimiter } from '../middleware/rate-limit.middleware.js'

const router = Router()

router.post('/auth/sign-in', signInLimiter, c.signIn)
router.post('/auth/password-reset', signInLimiter, c.requestPasswordReset)

router.use(protect('staff'))
router.get('/auth/me', c.getMe)

router.get('/dashboard', c.getDashboard)
router.get('/nav-counts', c.getNavCounts)

router.get('/patients', c.listPatients)
router.get('/patients/export', c.exportPatients)
router.get('/patients/search', c.searchPatients)
router.get('/patients/options', c.getPatientOptions)
router.get('/patients/first-visit-suggestion', c.suggestFirstVisit)
router.post('/patients/duplicate-check', c.checkDuplicate)
router.post('/patients', c.registerPatient)
router.get('/patients/:id', c.getPatient)
router.get('/patients/:id/caregivers', c.getCaregivers)
router.post('/patients/:id/caregivers/:caregiverId/invite', c.sendFamilyInvite)
router.get('/patients/:id/immunizations/form', c.getRecordForm)
router.post('/patients/:id/immunizations', c.recordImmunization)
router.get('/patients/:id/measurements', c.getMeasurements)
router.post('/patients/:id/measurements', c.saveMeasurement)
router.delete('/measurements/:id', c.deleteMeasurement)

router.get('/appointments', c.getSchedule)
router.get('/appointments/options', c.getBookingOptions)
router.get('/appointments/availability', c.getAvailability)
router.post('/appointments', c.createAppointment)
router.patch('/appointments/:id/reschedule', c.rescheduleAppointment)
router.patch('/appointments/:id/cancel', c.cancelAppointment)

router.get('/conversations', c.getConversations)
router.post('/conversations', c.openConversation)
router.get('/conversations/:id', c.getConversation)
router.post('/conversations/:id/read', c.markConversationRead)
router.post('/conversations/:id/messages', c.sendMessage)

router.get('/visit-notes/queue', c.getNotesQueue)
router.get('/visit-notes/:id', c.getVisitNote)
router.patch('/visit-notes/:id', c.saveDraft)
router.post('/visit-notes/:id/sign', c.signNote)

router.get('/coverage', c.getCoverage)
router.get('/coverage/defaulters', c.getDefaulters)
router.post('/reminders', c.sendReminder)
router.post('/reminders/bulk', c.sendReminders)

router.get('/mothers/options', c.listMotherOptions)
router.get('/mothers/:id', c.getMother)
router.get('/mothers/:id/anc/form', c.getAncForm)
router.post('/mothers/:id/anc', c.recordAncVisit)
router.post('/mothers/:id/delivery', c.recordDelivery)
router.get('/mothers/:id/postnatal/form', c.getPostnatalForm)
router.post('/mothers/:id/postnatal', c.recordPostnatalVisit)
router.get('/records/:kind/:id', c.getRecordForEdit)
router.patch('/records/:kind/:id', c.editRecord)

router.get('/requests', c.getRequests)
router.post('/requests/:id/confirm', c.confirmRequest)
router.post('/requests/:id/propose', c.proposeTime)
router.post('/requests/:id/decline', c.declineRequest)

router.get('/notifications', c.getStaffNotifications)
router.post('/notifications/read-all', c.markAllStaffNotificationsRead)
router.post('/notifications/:id/read', c.markStaffNotificationRead)

export default router
