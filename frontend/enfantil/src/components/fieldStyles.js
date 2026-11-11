import { cx } from '../utils/cx'

/** Shared look for text inputs, selects and textareas (12px radius, 48px tall). */
export function fieldClass(error, extra) {
  return cx(
    'block w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink transition-colors placeholder:text-[#6B7480] hover:border-[#D3CFC7] disabled:cursor-not-allowed disabled:bg-[#F4F3F0] disabled:text-muted',
    error ? 'border-coral-700 bg-[#FFFBFA] hover:border-coral-700' : 'border-line',
    extra,
  )
}

export const labelClass = 'text-[14px] font-semibold text-ink'
export const linkClass = 'font-semibold text-teal-700 underline-offset-2 hover:text-teal-800 hover:underline'
