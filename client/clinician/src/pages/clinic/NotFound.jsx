import { ArrowLeft, Compass } from 'lucide-react'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Logo from '../../components/Logo'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

function Message({ signedIn }) {
  return (
    <>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-5 text-caption uppercase text-muted">Error 404</p>
      <h1 className="mt-1 text-h1 text-ink">We can’t find that page</h1>
      <p className="mt-2 max-w-md text-[15px] text-slate-600">
        The link may be old, or the record may belong to a facility you are not authorised to see. Check the address, or go back to your dashboard.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button icon={ArrowLeft} to={signedIn ? '/clinic' : '/clinic/sign-in'}>
          {signedIn ? 'Back to dashboard' : 'Go to sign-in'}
        </Button>
        {signedIn && (
          <Button variant="secondary" to="/clinic/patients">
            Find a patient
          </Button>
        )}
      </div>
    </>
  )
}

/** 404 in the portal style: inside the clinic layout when signed in, on deep teal otherwise. */
export default function NotFound({ inApp = false }) {
  useDocumentTitle('Page not found')
  const { isAuthenticated, role } = useAuth()
  const signedIn = isAuthenticated && role === 'clinician'

  if (inApp) {
    return (
      <Card className="flex flex-col items-start p-8 sm:p-10">
        <Message signedIn={signedIn} />
      </Card>
    )
  }
  return (
    <div className="on-portal flex min-h-dvh flex-col bg-portal px-4 py-6 sm:px-10">
      <Logo badge />
      <main id="main" className="flex flex-1 items-center justify-center py-10">
        <Card className="flex w-full max-w-xl flex-col items-start p-8 sm:p-10">
          <Message signedIn={signedIn} />
        </Card>
      </main>
    </div>
  )
}
