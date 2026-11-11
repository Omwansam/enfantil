import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { readJSON, removeKey, writeJSON } from '../utils/storage'

const AuthContext = createContext(null)
const SESSION_KEY = 'enfantil:session'

function readSession() {
  return readJSON(SESSION_KEY) ?? readJSON(SESSION_KEY, { kind: 'session' })
}

/** Stores { user, role: 'caregiver', token }. "Keep me signed in" uses localStorage, otherwise sessionStorage. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  const startSession = useCallback((next, { remember = true } = {}) => {
    removeKey(SESSION_KEY)
    removeKey(SESSION_KEY, { kind: 'session' })
    writeJSON(SESSION_KEY, next, { kind: remember ? 'local' : 'session' })
    setSession(next)
    return next
  }, [])

  const signIn = useCallback(
    async ({ identifier, password, remember }) => startSession(await authApi.signIn({ identifier, password }), { remember }),
    [startSession],
  )

  const signOut = useCallback(() => {
    removeKey(SESSION_KEY)
    removeKey(SESSION_KEY, { kind: 'session' })
    removeKey('enfantil:selectedChild')
    setSession(null)
  }, [])

  const updateUser = useCallback((changes) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = { ...prev, user: { ...prev.user, ...changes } }
      const kind = readJSON(SESSION_KEY) ? 'local' : 'session'
      writeJSON(SESSION_KEY, next, { kind })
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      role: session?.role ?? null,
      isAuthenticated: Boolean(session?.token),
      signIn,
      startSession,
      signOut,
      updateUser,
    }),
    [session, signIn, startSession, signOut, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
