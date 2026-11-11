import { cx } from '../utils/cx'

/** Radio option drawn as a card (child, reason, add-child mode). Uses a real, visually hidden radio input. */
export default function OptionCard({ name, value, checked, onChange, title, description, icon: Icon, leading, error, className }) {
  return (
    <label
      className={cx(
        'focus-within-ring flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 transition-colors',
        checked ? 'border-teal-700 bg-teal-50' : error ? 'border-coral-200 bg-white hover:border-coral-700' : 'border-line bg-white hover:border-[#CFCAC1]',
        className,
      )}
    >
      <input type="radio" className="sr-only" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {leading}
      {Icon && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-teal-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold leading-6 text-ink">{title}</span>
        {description && <span className="block text-small text-muted">{description}</span>}
      </span>
    </label>
  )
}
