import { cx } from '../utils/cx'

const TONES = {
  teal: 'bg-given-bg text-given',
  amber: 'bg-planned-bg text-planned',
  coral: 'bg-overdue-bg text-overdue',
}

/** Coloured count tile: 14 Given · 3 Planned · 1 Overdue. */
export default function StatTile({ value, label, tone = 'teal', className }) {
  return (
    <div className={cx('min-w-[76px] rounded-xl px-3.5 py-2.5', TONES[tone], className)}>
      <p className="text-[24px] font-bold leading-8">{value}</p>
      <p className="text-small font-medium text-slate-600">{label}</p>
    </div>
  )
}
