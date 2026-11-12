/**
 * One-time SMS codes (sign-in by SMS, password reset, registration, linking
 * a child's record).
 *
 * No SMS provider is connected yet. sendSms() writes the message to the
 * server console; connect a provider there (for example Africa's Talking or
 * Twilio) before going live.
 *
 * With OTP_DEMO=true (development only) any 6-digit code except 000000 is
 * accepted, as in the frontend demos. With OTP_DEMO=false the server checks
 * the real code, which expires after 10 minutes and allows 5 tries.
 */
import { createHash, randomInt } from 'node:crypto'
import config from '../config/env.js'
import { prisma } from '../config/db.js'
import { ApiError } from './errors.js'

const TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

const hash = (phone, purpose, code) => createHash('sha256').update(`${config.JWT_SECRET}|${purpose}|${phone}|${code}`).digest('hex')

/** Sends an SMS. Replace the console line with your SMS provider's API call. */
export async function sendSms(phone, text) {
  console.log(`[sms] to 0${phone}: ${text}`)
}

/** Creates and sends a code. `phone` is the 9-digit form (712345678). */
export async function issueCode(purpose, phone) {
  if (config.OTP_DEMO) return { sentTo: phone, expiresInSeconds: 300 }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.otpCode.updateMany({ where: { phone, purpose, usedAt: null }, data: { usedAt: new Date() } })
  await prisma.otpCode.create({
    data: { id: `otp-${Date.now().toString(36)}${randomInt(0, 1e6).toString(36)}`, purpose, phone, codeHash: hash(phone, purpose, code), expiresAt: new Date(Date.now() + TTL_MS) },
  })
  await sendSms(phone, `Your Enfantil code is ${code}. It expires in 10 minutes. Hospital staff will never ask for it.`)
  return { sentTo: phone, expiresInSeconds: TTL_MS / 1000 }
}

const wrong = () => new ApiError('That code is not right. Check the SMS and try again.', { field: 'code' })

/** Checks (and uses up) a code. Throws a field error when it is wrong or expired. */
export async function checkCode(purpose, phone, code) {
  const value = String(code ?? '').trim()
  if (!/^\d{6}$/.test(value)) throw wrong()
  if (config.OTP_DEMO) {
    if (value === '000000') throw wrong()
    return true
  }
  const row = await prisma.otpCode.findFirst({ where: { phone, purpose, usedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!row || row.expiresAt < new Date()) throw new ApiError('That code has expired. Ask for a new one.', { field: 'code' })
  if (row.attempts >= MAX_ATTEMPTS) throw new ApiError('Too many wrong codes. Ask for a new one.', { field: 'code', status: 429 })
  if (row.codeHash !== hash(phone, purpose, value)) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
    throw wrong()
  }
  await prisma.otpCode.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  return true
}
