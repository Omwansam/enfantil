import { cx } from '../utils/cx'

const TONES = {
  upcoming: 'bg-upcoming-bg text-upcoming',
  completed: 'bg-completed-bg text-completed',
  cancelled: 'bg-cancelled-bg text-cancelled',
  overdue: 'bg-overdue-bg text-overdue',
  given: 'bg-given-bg text-given',
  planned: 'bg-planned-bg text-planned',
  neutral: 'bg-[#F1F0EC] text-slate-600',
  inverse: 'bg-white/15 text-white',
}

const STATUS_TONES = {
  Upcoming: 'upcoming',
  Today: 'upcoming',
  Tomorrow: 'upcoming',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Overdue: 'overdue',
  Given: 'given',
  Planned: 'planned',
  Requested: 'planned',
  Pending: 'planned',
  Declined: 'cancelled',
  'Not needed': 'neutral',
  'Optional (paid)': 'neutral',
  On: 'completed',
  Off: 'cancelled',
}

/** Pill badge. Status is always shown as text and colour, never colour alone. */
export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold leading-5', TONES[tone], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status, label, className }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} className={className}>
      {label ?? status}
    </Badge>
  )
}
