import { dateTileParts } from '../utils/dates'
import { cx } from '../utils/cx'

const VARIANTS = {
  solid: 'bg-teal-700 text-white',
  teal: 'bg-teal-50 text-teal-800',
  coral: 'bg-coral-50 text-coral-700',
  indigo: 'bg-[#EEF2FF] text-[#3730A3]',
  amber: 'bg-planned-bg text-[#92400E]',
  neutral: 'bg-[#F1F0EC] text-ink',
}

/** NOV / 9 / Mon date tile used in visit lists and the dashboard timeline. */
export default function DateTile({ date, variant = 'teal', className }) {
  const { month, day, weekday } = dateTileParts(date)
  return (
    <span aria-hidden="true" className={cx('flex w-[52px] shrink-0 flex-col items-center rounded-xl py-1.5 leading-none', VARIANTS[variant], className)}>
      <span className="text-[11px] font-semibold tracking-wide">{month}</span>
      <span className="mt-1 text-[22px] font-bold">{day}</span>
      <span className="mt-1 text-[11px] font-medium">{weekday}</span>
    </span>
  )
}
