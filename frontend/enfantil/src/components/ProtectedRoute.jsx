import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Sends signed-out visitors to /sign-in and remembers where they were going. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()
  if (!isAuthenticated || role !== 'caregiver') {
    return <Navigate to="/sign-in" replace state={{ from: location }} />
  }
  return children ?? <Outlet />
}
