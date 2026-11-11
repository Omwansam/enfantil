import ErrorState from './ErrorState'
import { SkeletonList } from './Skeleton'

/**
 * Renders the loading skeleton, the error-with-retry state, the empty state or
 * the content for one `useAsync` result.
 */
export default function AsyncContent({ state, skeleton, isEmpty, empty, errorTitle, children }) {
  if (state.error && state.data === undefined) {
    return <ErrorState title={errorTitle} error={state.error} onRetry={state.reload} />
  }
  if (state.data === undefined) return skeleton ?? <SkeletonList />
  if (isEmpty?.(state.data)) return empty ?? null
  return children(state.data)
}
