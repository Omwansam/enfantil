/**
 * Checks the Bearer token and makes the signed-in user available to the
 * services (context.js). `protect('staff')` guards the portal routes and
 * `protect('family')` the family app routes; a token of the other kind is refused.
 */
import { runAs } from '../services/context.js'
import { ApiError } from '../services/errors.js'
import { read } from '../services/store/state.js'
import { verify } from '../services/tokens.js'

export default function protect(kind) {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
    if (!token) return next(new ApiError('Please sign in.', { status: 401 }))
    let claims
    try {
      claims = verify(token)
    } catch (err) {
      return next(new ApiError(err.name === 'TokenExpiredError' ? 'Your session has ended. Please sign in again.' : 'Please sign in again.', { status: 401 }))
    }
    if (claims.kind !== kind) return next(new ApiError('This sign-in is for the other Enfantil app.', { status: 403 }))
    const state = await read()
    const exists = kind === 'staff' ? state.staff.some((s) => s.id === claims.sub) : state.accounts.some((a) => a.id === claims.sub)
    if (!exists) return next(new ApiError('Please sign in again.', { status: 401 }))
    req.user = { kind, id: claims.sub }
    return runAs(req.user, () => next())
  }
}
