import { cx } from '../utils/cx'

export default function ProgressBar({ value, max, label, className }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      className={cx('h-2.5 w-full overflow-hidden rounded-full bg-sand', className)}
    >
      <div className="h-full rounded-full bg-teal-700 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}
