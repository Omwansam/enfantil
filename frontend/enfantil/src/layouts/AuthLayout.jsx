import { Download, MessageCircle, Syringe } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

/** Top-bar layout for registration, password reset and public pages (W2). */
export default function AuthLayout({ aside, children }) {
  return (
    <div className="min-h-dvh bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/sign-in" aria-label="Enfantil, sign in" className="rounded-lg">
            <Logo />
          </Link>
          {aside}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  )
}

const POINTS = [
  { icon: Syringe, title: 'Kenya KEPI schedule', text: 'See every dose given and every dose coming up.' },
  { icon: Download, title: 'Print or download the vaccination card', text: 'Handy for school and nursery admissions.' },
  { icon: MessageCircle, title: 'Message the care team from your computer', text: 'Type longer questions with a full keyboard.' },
]

/** Split layout for sign-in (W1): teal brand panel on the left, form on the right. */
export function AuthSplitLayout({ children }) {
  return (
    <div className="grid min-h-dvh bg-page lg:grid-cols-[minmax(0,1.03fr)_minmax(0,1fr)]">
      <section className="relative isolate flex flex-col overflow-hidden bg-teal-700 px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-11">
        <span aria-hidden="true" className="absolute -right-24 -top-48 -z-10 size-[460px] rounded-full bg-teal-800" />
        <span aria-hidden="true" className="absolute -bottom-40 -left-28 -z-10 size-[320px] rounded-full bg-white/[0.06]" />
        <div className="flex items-center gap-3">
          <Logo inverted size="lg" />
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold tracking-[0.06em]">FOR FAMILIES</span>
        </div>
        <div className="mt-10 max-w-xl lg:mt-auto">
          <h1 className="text-[30px] font-bold leading-[38px] tracking-[-0.01em] sm:text-[40px] sm:leading-[48px]">
            Your children&apos;s health records, on any screen.
          </h1>
          <p className="mt-4 text-[16px] leading-7 text-teal-50">The same account as the Enfantil phone app. Everything stays in sync.</p>
          <ul className="mt-8 hidden space-y-4 sm:block">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold">{title}</span>
                  <span className="block text-[14px] text-teal-50">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <main id="main" className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[410px]">{children}</div>
      </main>
    </div>
  )
}
