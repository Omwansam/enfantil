import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { readJSON, removeKey, writeJSON } from '../utils/storage'

const AuthContext = createContext(null)
const SESSION_KEY = 'enfantil-clinic:session'
/** One-off message for the sign-in page, e.g. after signing out. */
export const NOTICE_KEY = 'enfantil-clinic:notice'
const EIGHT_HOURS = 8 * 60 * 60 * 1000

/** A remembered session lasts 8 hours on this computer; otherwise it ends when the browser closes. */
function readSession() {
  const remembered = readJSON(SESSION_KEY)
  if (remembered) {
    if (remembered.expiresAt && remembered.expiresAt > Date.now()) return remembered
    removeKey(SESSION_KEY)
  }
  return readJSON(SESSION_KEY, { kind: 'session' })
}

/** Stores { user, role: 'clinician', facility, token }. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  const signIn = useCallback(async ({ identifier, password, remember }) => {
    const next = await authApi.signIn({ identifier, password })
    removeKey(SESSION_KEY)
    removeKey(SESSION_KEY, { kind: 'session' })
    if (remember) writeJSON(SESSION_KEY, { ...next, expiresAt: Date.now() + EIGHT_HOURS })
    else writeJSON(SESSION_KEY, next, { kind: 'session' })
    setSession(next)
    return next
  }, [])

  const signOut = useCallback(({ notice } = {}) => {
    if (notice) writeJSON(NOTICE_KEY, notice, { kind: 'session' })
    removeKey(SESSION_KEY)
    removeKey(SESSION_KEY, { kind: 'session' })
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      facility: session?.facility ?? null,
      isAuthenticated: Boolean(session?.token),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
