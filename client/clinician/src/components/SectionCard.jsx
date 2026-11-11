import Card from './Card'
import { cx } from '../utils/cx'

/** Form section with a numbered teal circle: "1 Child", "2 Primary caregiver" (frame 27). */
export default function SectionCard({ number, title, id, children, className }) {
  return (
    <Card as="fieldset" className={cx('min-w-0 p-5 sm:p-6', className)} aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-2.5 text-[17px] font-semibold text-ink">
        <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-full bg-teal-700 text-[13px] font-bold text-white">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Card>
  )
}
