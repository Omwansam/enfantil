import { useRef } from 'react'
import { cx } from '../utils/cx'

/** Two to four mutually exclusive options (role="radiogroup"), e.g. Weight / Height. */
export default function SegmentedControl({ options, value, onChange, label, className, fullWidth = false }) {
  const refs = useRef([])
  const onKeyDown = (event, index) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    if (!(event.key in keys)) return
    event.preventDefault()
    const next = (index + keys[event.key] + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} className={cx('inline-flex rounded-xl bg-sand p-1', fullWidth && 'flex w-full', className)}>
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              'min-h-10 rounded-[10px] px-4 text-[14px] font-semibold transition-colors',
              fullWidth && 'flex-1',
              selected ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
