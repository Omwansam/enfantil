import { useId } from 'react'
import { cx } from '../utils/cx'

/** On/off toggle (role="switch") with a label and optional description. */
export default function Switch({ checked, onChange, label, description, disabled = false, className }) {
  const id = useId()
  return (
    <div className={cx('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[14px] font-medium text-ink">
          {label}
        </p>
        {description && (
          <p id={`${id}-desc`} className="text-small text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
      >
        <span className={cx('flex h-7 w-12 items-center rounded-full px-1 transition-colors', checked ? 'bg-teal-700' : 'bg-[#CBD5E1]')}>
          <span className={cx('size-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
        </span>
      </button>
    </div>
  )
}
