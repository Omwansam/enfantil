import { cx } from '../utils/cx'

const TONES = {
  upcoming: 'bg-upcoming-bg text-upcoming',
  completed: 'bg-completed-bg text-completed',
  cancelled: 'bg-cancelled-bg text-cancelled',
  overdue: 'bg-overdue-bg text-overdue',
  given: 'bg-given-bg text-given',
  planned: 'bg-planned-bg text-planned',
  due: 'bg-due-bg text-due',
  uptodate: 'bg-uptodate-bg text-uptodate',
  neutral: 'bg-[#F1F0EC] text-slate-600',
  inverse: 'bg-white/15 text-white',
  portal: 'bg-white/12 text-white',
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
  Due: 'due',
  'Up to date': 'uptodate',
  Open: 'planned',
  Draft: 'planned',
  Signed: 'completed',
  Sent: 'completed',
}

/** Pill badge. Status is always shown as text and colour, never colour alone. */
export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold leading-5',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
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
