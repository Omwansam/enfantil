import { CircleAlert } from 'lucide-react'
import { cx } from '../utils/cx'

/** Inline error (coral, with icon) or hint shown under a form field. */
export default function FieldMessage({ id, error, hint, hintTone = 'muted', className }) {
  if (error) {
    return (
      <p id={id} className={cx('mt-1.5 flex items-start gap-1.5 text-small text-coral-700', className)}>
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    )
  }
  if (!hint) return null
  const tones = { muted: 'text-muted', success: 'text-completed font-medium', error: 'text-coral-700' }
  return (
    <p id={id} className={cx('mt-1.5 text-small', tones[hintTone], className)}>
      {hint}
    </p>
  )
}
