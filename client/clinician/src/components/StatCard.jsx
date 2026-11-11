import { Link } from 'react-router-dom'
import { cx } from '../utils/cx'

const ICON_TONES = {
  teal: 'bg-teal-50 text-teal-700',
  blue: 'bg-info-bg text-info',
  coral: 'bg-coral-50 text-coral-700',
  amber: 'bg-amber-50 text-amber-700',
}

const NOTE_TONES = {
  muted: 'text-muted',
  alert: 'font-medium text-coral-700',
  success: 'font-medium text-completed',
}

/** KPI card: caption label, big number, a short note and an optional tinted icon. */
export default function StatCard({ label, value, valueTone, note, noteTone = 'muted', icon: Icon, iconTone = 'teal', to, className }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-caption uppercase text-muted">{label}</p>
        {Icon && (
          <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-lg', ICON_TONES[iconTone])}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={cx('mt-1 text-[28px] font-bold leading-9 tracking-[-0.01em]', valueTone === 'alert' ? 'text-coral-700' : 'text-ink')}>{value}</p>
      {note && <p className={cx('mt-1 text-small', NOTE_TONES[noteTone])}>{note}</p>}
    </>
  )
  const classes = cx('block rounded-2xl bg-white p-5 shadow-card', to && 'transition-shadow hover:shadow-pop', className)
  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    )
  }
  return <div className={classes}>{body}</div>
}
