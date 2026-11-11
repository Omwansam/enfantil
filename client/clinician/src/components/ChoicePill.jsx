import { cx } from '../utils/cx'

/** Pill-shaped radio option (relationship, time of day, sex). */
export default function ChoicePill({ name, value, checked, onChange, children, className }) {
  return (
    <label
      className={cx(
        'focus-within-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] px-4 text-[14px] font-medium transition-colors',
        checked ? 'border-teal-700 bg-teal-50 font-semibold text-teal-800' : 'border-line bg-white text-ink hover:border-[#CFCAC1]',
        className,
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {children}
    </label>
  )
}
