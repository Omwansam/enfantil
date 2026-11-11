import { cx } from '../utils/cx'

const TONES = {
  // Darker than coral-500 / amber-500 so white digits meet WCAG AA (4.5:1).
  coral: 'bg-coral-700 text-white',
  amber: 'bg-amber-700 text-white',
}

/** Small round count, e.g. unread conversations (coral) or unfinished notes (amber). */
export default function CountPill({ count, tone = 'coral', className }) {
  if (!count) return null
  return (
    <span
      aria-hidden="true"
      className={cx('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none', TONES[tone], className)}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
