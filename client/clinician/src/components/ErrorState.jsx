import { RefreshCw, TriangleAlert } from 'lucide-react'
import Button from './Button'
import { cx } from '../utils/cx'

/** Shown when an API call fails, with a retry button. */
export default function ErrorState({ title = 'Something went wrong', error, onRetry, className }) {
  return (
    <div role="alert" className={cx('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-coral-50 text-coral-700">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[14px] text-slate-600">{error?.message || 'We couldn’t load this. Check your connection and try again.'}</p>
      {onRetry && (
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  )
}
