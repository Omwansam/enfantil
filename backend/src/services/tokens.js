/**
 * Signed login tokens (JWT, HS256). Staff tokens last STAFF_TOKEN_TTL (8h),
 * family tokens FAMILY_TOKEN_TTL (30 days). `kind` keeps them apart: a family
 * token never opens a portal route and the reverse.
 */
import jwt from 'jsonwebtoken'
import config from '../config/env.js'

export function staffToken(staffId) {
  return jwt.sign({ kind: 'staff' }, config.JWT_SECRET, { subject: staffId, expiresIn: config.STAFF_TOKEN_TTL })
}

export function familyToken(accountId) {
  return jwt.sign({ kind: 'family' }, config.JWT_SECRET, { subject: accountId, expiresIn: config.FAMILY_TOKEN_TTL })
}

/** A short-lived token proving the reset code was right, for the "new password" step. */
export function resetToken(phone) {
  return jwt.sign({ kind: 'reset', phone }, config.JWT_SECRET, { expiresIn: '15m' })
}

export function verify(token) {
  return jwt.verify(token, config.JWT_SECRET)
}
