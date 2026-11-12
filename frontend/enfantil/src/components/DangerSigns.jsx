import { Phone, TriangleAlert } from 'lucide-react'
import Button from './Button'
import { cx } from '../utils/cx'

/** Coral "Danger signs — go to hospital now" card with a call button for the 24-hour maternity unit. */
export default function DangerSigns({ signs, className, title = 'Danger signs — go to hospital now' }) {
  return (
    <section className={cx('rounded-2xl border border-coral-200 bg-coral-50 p-5', className)} aria-labelledby="danger-heading">
      <h2 id="danger-heading" className="flex items-center gap-2 text-[17px] font-semibold text-coral-700">
        <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
        {title}
      </h2>
      <ul className="mt-3 space-y-1.5 text-[14px] text-ink">
        {signs.map((s) => (
          <li key={s} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-coral-700" />
            {s}
          </li>
        ))}
      </ul>
      <Button href="tel:+254709600400" variant="dangerSolid" icon={Phone} fullWidth className="mt-4">
        Call maternity (24 hours)
      </Button>
      <p className="mt-2 text-center text-small text-slate-600">Tumaini Family Hospital · 0709 600 400</p>
    </section>
  )
}
