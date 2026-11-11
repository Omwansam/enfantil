import { useId } from 'react'
import FieldMessage from './FieldMessage'
import { fieldClass, labelClass } from './fieldStyles'
import { cx } from '../utils/cx'

/**
 * Labelled text input with hint/error, an optional fixed prefix (e.g. +254),
 * an end adornment (e.g. Show/Hide) and an action next to the label.
 */
export default function Input({
  label,
  id,
  hint,
  hintTone,
  error,
  optional = false,
  required = false,
  prefix,
  endAdornment,
  labelAction,
  className,
  inputClassName,
  ...props
}) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-message`
  return (
    <div className={className}>
      {(label || labelAction) && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label && (
            <label htmlFor={inputId} className={labelClass}>
              {label}
              {required && (
                <span className="text-coral-700" aria-hidden="true">
                  {' '}
                  *
                </span>
              )}
              {optional && <span className="font-normal text-muted"> (optional)</span>}
            </label>
          )}
          {labelAction}
        </div>
      )}
      <div className="flex gap-2">
        {prefix && (
          <span className="flex min-h-12 items-center rounded-xl border border-line bg-white px-3 text-[15px] font-semibold text-ink" aria-hidden="true">
            {prefix}
          </span>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            aria-required={required || undefined}
            className={fieldClass(error, cx('min-h-12', endAdornment && 'pr-20', inputClassName))}
            {...props}
          />
          {endAdornment && <div className="absolute inset-y-0 right-1.5 flex items-center">{endAdornment}</div>}
        </div>
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} hintTone={hintTone} />
    </div>
  )
}
