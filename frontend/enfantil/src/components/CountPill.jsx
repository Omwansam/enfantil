import { cx } from '../utils/cx'

/** Coral unread count pill. Uses coral-700 behind the white digits for AA contrast. */
export default function CountPill({ count, className }) {
  if (!count) return null
  return (
    <span className={cx('inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-700 px-1.5 text-[12px] font-bold text-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

/** Coral unread dot. Pass `label` to announce it, or an empty label when nearby text already says "unread". */
export function UnreadDot({ className, label = 'Unread' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }
  return <span className={cx('inline-flex size-2.5 shrink-0 rounded-full bg-coral-500', className)} {...a11y} />
}
