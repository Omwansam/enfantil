import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import FieldMessage from './FieldMessage'
import { fieldClass, labelClass } from './fieldStyles'

export default function Select({ label, id, hint, error, optional = false, className, children, ...props }) {
  const autoId = useId()
  const selectId = id ?? autoId
  const messageId = `${selectId}-message`
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className={`mb-1.5 block ${labelClass}`}>
          {label}
          {optional && <span className="font-normal text-muted"> (optional)</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={fieldClass(error, 'min-h-12 appearance-none pr-10')}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-600" aria-hidden="true" />
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
