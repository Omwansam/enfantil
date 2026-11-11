import { useId } from 'react'
import FieldMessage from './FieldMessage'
import { fieldClass, labelClass } from './fieldStyles'

export default function Textarea({ label, id, hint, error, optional = false, maxLength, value = '', className, rows = 3, ...props }) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const messageId = `${fieldId}-message`
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor={fieldId} className={labelClass}>
            {label}
            {optional && <span className="font-normal text-muted"> (optional)</span>}
          </label>
          {maxLength && (
            <span className="text-small text-muted" aria-live="polite">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={fieldClass(error, 'resize-y py-3 leading-6')}
        {...props}
      />
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
