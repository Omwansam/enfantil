import { CircleHelp, House } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { linkClass } from '../components/fieldStyles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AuthLayout from '../layouts/AuthLayout'

function Content({ inApp }) {
  return (
    <Card className="mx-auto max-w-[560px] px-6 py-12 text-center sm:px-10">
      <p className="text-caption uppercase text-teal-700">Error 404</p>
      <h1 className="mt-2 text-h1">We can’t find that page</h1>
      <p className="mt-2 text-[15px] text-slate-600">The link may be old, or the page may have moved. Your children’s records are safe.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button to={inApp ? '/family' : '/sign-in'} icon={House}>
          {inApp ? 'Go to overview' : 'Go to sign in'}
        </Button>
        {inApp && (
          <Button to="/family/help" variant="secondary" icon={CircleHelp}>
            Help & support
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function NotFound({ inApp = false }) {
  useDocumentTitle('Page not found')
  if (inApp) return <Content inApp />
  return (
    <AuthLayout
      aside={
        <Link to="/sign-in" className={`${linkClass} text-[14px] underline`}>
          Sign in
        </Link>
      }
    >
      <Content />
    </AuthLayout>
  )
}
