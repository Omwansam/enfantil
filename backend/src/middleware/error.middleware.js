/**
 * Turns errors into JSON both frontends understand:
 *   { message, field?, fields? }
 * `field` is the one input to highlight (family app), `fields` maps inputs to
 * messages (portal forms, 422). Unexpected errors are logged and answered
 * with a generic message.
 */
import config from '../config/env.js'
import { ApiError } from '../services/errors.js'
import { ConflictError } from '../services/store/state.js'

const PRISMA_UNAVAILABLE = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017'])

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    const body = { message: err.message }
    if (err.field) body.field = err.field
    if (err.fields) {
      body.fields = err.fields
      body.field ??= Object.keys(err.fields)[0]
    }
    return res.status(err.status ?? 400).json(body)
  }
  if (err instanceof ConflictError) return res.status(409).json({ message: 'Someone else just changed this. Try again.' })
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON.' })
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'The request is too large.' })
  if (PRISMA_UNAVAILABLE.has(err?.code) || err?.name === 'PrismaClientInitializationError') {
    console.error('[db]', err.message)
    return res.status(503).json({ message: 'The database is not reachable right now. Try again in a moment.' })
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err)
  return res.status(500).json({ message: 'Something went wrong. Try again.', ...(config.NODE_ENV === 'development' ? { detail: err?.message } : {}) })
}
