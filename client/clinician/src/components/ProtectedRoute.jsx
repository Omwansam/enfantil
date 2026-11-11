import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FAMILY_SIGN_IN_URL } from '../config'

/** Caregivers who reach the portal are sent to the family sign-in. */
function FamilyRedirect() {
  const { signOut } = useAuth()
  useEffect(() => {
    signOut()
    window.location.replace(FAMILY_SIGN_IN_URL)
  }, [signOut])
  return (
    <main className="flex min-h-dvh items-center justify-center bg-page px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-h2 text-ink">This portal is for clinic staff</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Taking you to the family sign-in…{' '}
          <a href={FAMILY_SIGN_IN_URL} className="font-semibold text-teal-700 underline">
            Go now
          </a>
        </p>
      </div>
    </main>
  )
}

/**
 * Guards /clinic/*: signed-out visitors go to /clinic/sign-in (and come back
 * afterwards); caregiver sessions go to the family app.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()
  if (isAuthenticated && role === 'caregiver') return <FamilyRedirect />
  if (!isAuthenticated || role !== 'clinician') {
    return <Navigate to="/clinic/sign-in" replace state={{ from: location }} />
  }
  return children ?? <Outlet />
}
