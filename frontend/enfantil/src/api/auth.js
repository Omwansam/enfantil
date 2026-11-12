/** Sign-in, SMS codes, password reset and registration (POST /api/family/auth/…). */
import { post } from './client'
import { daysBetween, isValidISODate, TODAY, toISODate } from '../utils/dates'

/** Validation for the "My health" step, shared with the form. */
export function validateHealth(health, tracking) {
  const errors = {}
  if (!health.dob) errors.dob = 'Enter your date of birth'
  else if (!isValidISODate(health.dob)) errors.dob = 'Enter a real date'
  else {
    const years = daysBetween(health.dob, TODAY) / 365.25
    if (years < 12 || years > 60) errors.dob = 'Check the year of your date of birth'
  }
  if (tracking !== 'baby') {
    if (health.dateKind === 'lmp') {
      if (!health.lmp) errors.lmp = 'Enter the first day of your last period'
      else if (!isValidISODate(health.lmp)) errors.lmp = 'Enter a real date'
      else if (health.lmp > toISODate(TODAY)) errors.lmp = 'This date can’t be in the future'
      else if (daysBetween(health.lmp, TODAY) > 300) errors.lmp = 'That is more than 42 weeks ago. Check the date'
    } else {
      if (!health.edd) errors.edd = 'Enter your due date'
      else if (!isValidISODate(health.edd)) errors.edd = 'Enter a real date'
      else if (daysBetween(TODAY, health.edd) < -14) errors.edd = 'This due date has passed. Check the date'
      else if (daysBetween(TODAY, health.edd) > 280) errors.edd = 'A due date is at most 40 weeks away'
    }
  }
  return errors
}

export function signIn({ identifier, password }) {
  return post('/auth/sign-in', { identifier, password })
}

export function sendSmsSignInCode(phone) {
  return post('/auth/sms-code', { phone })
}

export function verifySmsSignInCode(phone, code) {
  return post('/auth/sms-code/verify', { phone, code })
}

export function requestPasswordReset(phone) {
  return post('/auth/password-reset', { phone })
}

/** The reset token from the code step is kept here for the "new password" step. */
let resetToken = null

export async function verifyResetCode(phone, code) {
  const result = await post('/auth/password-reset/verify', { phone, code })
  resetToken = result.resetToken
  return result
}

export function resetPassword({ password }) {
  return post('/auth/password-reset/complete', { resetToken, password })
}

/** Checks the phone number is free and sends the confirmation code. */
export function startRegistration({ fullName, phone, email, relationship }) {
  return post('/auth/register', { fullName, phone, email, relationship })
}

/** Completes registration: creates the account, the mother's record and her pregnancy. */
export function completeRegistration(details) {
  return post('/auth/register/confirm', details)
}
