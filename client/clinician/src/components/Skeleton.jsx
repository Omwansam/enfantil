import { cx } from '../utils/cx'

export default function Skeleton({ className, style }) {
  return <div aria-hidden="true" style={style} className={cx('animate-pulse rounded-lg bg-[#ECEAE5]', className)} />
}

/** Rows with an avatar and two lines: lists of messages, visits, notifications. */
export function SkeletonList({ rows = 4, label = 'Loading', className, avatar = true }) {
  return (
    <div role="status" aria-label={label} className={cx('divide-y divide-line', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-xl" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, label = 'Loading table', className }) {
  return (
    <div role="status" aria-label={label} className={cx('space-y-3', className)}>
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard({ lines = 3, className, label = 'Loading' }) {
  return (
    <div role="status" aria-label={label} className={cx('rounded-2xl bg-white p-6 shadow-card', className)}>
      <Skeleton className="h-5 w-1/3" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cx('h-4', i % 2 ? 'w-3/5' : 'w-4/5')} />
        ))}
      </div>
    </div>
  )
}
