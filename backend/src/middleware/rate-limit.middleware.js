/**
 * Rate limits. In-memory per process, which is right for one API process;
 * use a shared store (Redis or Postgres) if you run several.
 */
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

const base = { standardHeaders: 'draft-7', legacyHeaders: false }
const message = (text) => ({ message: text })

/** Whole-API ceiling: generous for normal use, blunts scraping. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 600,
  message: message('Too many requests. Slow down and try again shortly.'),
  skip: (req) => req.path === '/health' || req.path === '/api/health',
})

/** Sign-in: only failed attempts count, per IP and identifier. */
export const signInLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.identifier ?? req.body?.phone ?? '').toLowerCase()}`,
  message: message('Too many sign-in attempts. Wait 15 minutes and try again.'),
})

/** SMS codes: each one costs money and lands on someone's phone. */
export const smsLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 8,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${String(req.body?.phone ?? '').replace(/\D/g, '')}`,
  message: message('Too many codes requested. Wait an hour before trying again.'),
})

/** Checking codes: stops guessing. */
export const codeCheckLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: message('Too many attempts. Wait 15 minutes and try again.'),
})
