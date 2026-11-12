import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import FamilyLayout from './layouts/FamilyLayout'

// Pages are code-split so the sign-in screen does not download the chart library.
const AddChild = lazy(() => import('./pages/AddChild'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DoseDetail = lazy(() => import('./pages/DoseDetail'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const HealthProfile = lazy(() => import('./pages/HealthProfile'))
const Help = lazy(() => import('./pages/Help'))
const Messages = lazy(() => import('./pages/Messages'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Register = lazy(() => import('./pages/Register'))
const BookAppointment = lazy(() => import('./pages/BookAppointment'))
const Settings = lazy(() => import('./pages/Settings'))
const SignIn = lazy(() => import('./pages/SignIn'))
const VaccinationCard = lazy(() => import('./pages/VaccinationCard'))
const Vaccines = lazy(() => import('./pages/Vaccines'))
const Visits = lazy(() => import('./pages/Visits'))
const MyHealth = lazy(() => import('./pages/me/MyHealth'))
const Pregnancy = lazy(() => import('./pages/me/Pregnancy'))
const Antenatal = lazy(() => import('./pages/me/Antenatal'))
const AntenatalVisit = lazy(() => import('./pages/me/AntenatalVisit'))
const MaternalProgress = lazy(() => import('./pages/me/MaternalProgress'))
const MaternalVaccines = lazy(() => import('./pages/me/MaternalVaccines'))
const Postnatal = lazy(() => import('./pages/me/Postnatal'))

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/family" replace />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/family"
            element={
              <ProtectedRoute>
                <FamilyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="health" element={<HealthProfile />} />
            <Route path="vaccines" element={<Vaccines />} />
            <Route path="vaccines/:doseId" element={<DoseDetail />} />
            <Route path="visits" element={<Visits />} />
            <Route path="visits/new" element={<BookAppointment />} />
            <Route path="me" element={<MyHealth />} />
            <Route path="me/pregnancy" element={<Pregnancy />} />
            <Route path="me/antenatal" element={<Antenatal />} />
            <Route path="me/antenatal/:visitId" element={<AntenatalVisit />} />
            <Route path="me/progress" element={<MaternalProgress />} />
            <Route path="me/vaccines" element={<MaternalVaccines />} />
            <Route path="me/postnatal" element={<Postnatal />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:conversationId" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="card" element={<VaccinationCard />} />
            <Route path="children/new" element={<AddChild />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
