import { LockKeyhole, ShieldCheck } from 'lucide-react'
import Logo from '../components/Logo'

/**
 * Split sign-in layout (frame 10): deep-teal brand panel on the left, the
 * form on the right. Below 1024px the panel becomes a compact header.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page lg:flex-row">
      <section
        aria-label="Enfantil clinician portal"
        className="on-portal relative isolate overflow-hidden bg-portal px-6 py-6 text-white sm:px-10 lg:flex lg:w-1/2 lg:flex-col lg:px-[54px] lg:py-[45px]"
      >
        <span
          aria-hidden="true"
          className="absolute -right-[150px] top-[54%] -z-10 hidden size-[560px] rounded-full border-[54px] border-white/[0.055] lg:block"
        />
        <Logo badge size="lg" />
        <div className="mt-8 lg:mt-auto">
          <p className="max-w-[520px] text-[26px] font-bold leading-[1.2] tracking-[-0.01em] sm:text-[32px] lg:text-[40px]">
            Every child&apos;s record, ready before they walk in.
          </p>
          <p className="mt-4 max-w-[500px] text-[15px] leading-6 text-portal-text lg:text-[17px] lg:leading-[26px]">
            Schedules, KEPI immunization records and caregiver messages for your authorised patients.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-white/90 lg:mt-10">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-portal-text" aria-hidden="true" />
              Role-based access
            </li>
            <li className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-portal-text" aria-hidden="true" />
              Every record view is logged
            </li>
          </ul>
        </div>
      </section>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-[405px]">{children}</div>
      </main>
    </div>
  )
}
