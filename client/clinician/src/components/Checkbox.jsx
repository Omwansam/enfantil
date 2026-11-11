import { Check } from 'lucide-react'
import { useId } from 'react'
import FieldMessage from './FieldMessage'

export default function Checkbox({ checked, onChange, children, error, id, className, ...props }) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <span className="relative mt-[3px] flex size-[22px] shrink-0">
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`peer size-[22px] cursor-pointer appearance-none rounded-md border-[1.5px] bg-white transition-colors checked:border-teal-700 checked:bg-teal-700 ${
              error ? 'border-coral-700' : 'border-[#A8A398]'
            }`}
            {...props}
          />
          <Check className="pointer-events-none absolute inset-0 m-auto hidden size-4 text-white peer-checked:block" strokeWidth={3} aria-hidden="true" />
        </span>
        <label htmlFor={inputId} className="min-h-7 text-[14px] leading-[22px] text-slate-600">
          {children}
        </label>
      </div>
      {error && <FieldMessage id={`${inputId}-error`} error={error} className="ml-[34px]" />}
    </div>
  )
}
