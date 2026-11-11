import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PageLoader from './components/PageLoader'
import ProtectedRoute from './components/ProtectedRoute'
import ScrollToTop from './components/ScrollToTop'
import ClinicLayout from './layouts/ClinicLayout'

const SignIn = lazy(() => import('./pages/clinic/SignIn'))
const Dashboard = lazy(() => import('./pages/clinic/Dashboard'))
const Patients = lazy(() => import('./pages/clinic/Patients'))
const PatientProfile = lazy(() => import('./pages/clinic/PatientProfile'))
const RegisterChild = lazy(() => import('./pages/clinic/RegisterChild'))
const RecordImmunization = lazy(() => import('./pages/clinic/RecordImmunization'))
const Appointments = lazy(() => import('./pages/clinic/Appointments'))
const NewAppointment = lazy(() => import('./pages/clinic/NewAppointment'))
const Messages = lazy(() => import('./pages/clinic/Messages'))
const VisitNotes = lazy(() => import('./pages/clinic/VisitNotes'))
const VisitNote = lazy(() => import('./pages/clinic/VisitNote'))
const Coverage = lazy(() => import('./pages/clinic/Coverage'))
const NotFound = lazy(() => import('./pages/clinic/NotFound'))

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/clinic" replace />} />
          <Route path="/clinic/sign-in" element={<SignIn />} />
          <Route
            path="/clinic"
            element={
              <ProtectedRoute>
                <ClinicLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/new" element={<RegisterChild />} />
            <Route path="patients/:patientId" element={<PatientProfile />} />
            <Route path="patients/:patientId/immunizations/new" element={<RecordImmunization />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="appointments/new" element={<NewAppointment />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:conversationId" element={<Messages />} />
            <Route path="visits" element={<VisitNotes />} />
            <Route path="visits/:visitId/note" element={<VisitNote />} />
            <Route path="coverage" element={<Coverage />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}
