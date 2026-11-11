import { useRef } from 'react'
import FieldMessage from './FieldMessage'
import { cx } from '../utils/cx'

/** Six separate digit boxes for SMS codes. Supports paste, autofill, backspace and arrow keys. */
export default function CodeInput({ value, onChange, length = 6, error, label = 'Enter the 6-digit code', autoFocus = false, idPrefix = 'code' }) {
  const refs = useRef([])
  const focusAt = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus()

  const handleChange = (event, index) => {
    // Typing in a box past the end appends, so the code never has gaps.
    const start = Math.min(index, value.length)
    const typed = event.target.value.replace(/\D/g, '')
    if (!typed) {
      onChange(value.slice(0, start))
      return
    }
    // A box that already held a digit reports old + new; keep only what was just typed.
    const digits = value[index] && typed.length > 1 && typed.startsWith(value[index]) ? typed.slice(1) : typed
    const next = (value.slice(0, start) + digits).slice(0, length)
    onChange(next)
    focusAt(next.length)
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !value[index] && index > 0) {
      event.preventDefault()
      onChange(value.slice(0, index - 1))
      focusAt(index - 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight' && index < value.length) {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (event) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!digits) return
    event.preventDefault()
    onChange(digits)
    focusAt(digits.length)
  }

  return (
    <fieldset>
      <legend className="mb-2 text-[14px] font-semibold text-ink">{label}</legend>
      <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={i === 0 ? `${idPrefix}-0` : undefined}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? length : 1}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${idPrefix}-error` : undefined}
            value={value[i] ?? ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={cx(
              'h-14 w-11 rounded-xl border-[1.5px] bg-white text-center text-[22px] font-semibold text-ink transition-colors sm:w-12',
              error ? 'border-coral-700 bg-[#FFFBFA]' : value[i] ? 'border-teal-700' : 'border-line',
            )}
          />
        ))}
      </div>
      <FieldMessage id={`${idPrefix}-error`} error={error} />
    </fieldset>
  )
}
