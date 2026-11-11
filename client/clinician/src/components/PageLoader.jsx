import { LoaderCircle } from 'lucide-react'
import Skeleton from './Skeleton'

/** Shown while a page's code is downloading (routes are code-split). */
export default function PageLoader({ fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page" role="status" aria-label="Loading">
        <LoaderCircle className="size-8 animate-spin text-teal-700" aria-hidden="true" />
      </div>
    )
  }
  return (
    <div role="status" aria-label="Loading page" className="space-y-5">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-5 md:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}
