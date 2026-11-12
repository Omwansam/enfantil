import { useEffect } from 'react'
import Card from './Card'
import ErrorState from './ErrorState'
import { SkeletonCard } from './Skeleton'
import { useChildren } from '../context/ChildContext'

/** Wraps the mother's own pages: switches the profile to "Me" and renders children(me). */
export default function RequireMe({ children }) {
  const { me, isMe, selectChild, loading, error, reload } = useChildren()

  useEffect(() => {
    if (me && !isMe) selectChild('me')
  }, [me, isMe, selectChild])

  if (loading || (me && !isMe)) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" lines={5} />
        <SkeletonCard lines={3} />
      </div>
    )
  }
  if (error || !me) {
    return (
      <Card>
        <ErrorState title="We couldn’t load your profile" error={error} onRetry={reload} />
      </Card>
    )
  }
  return children(me)
}
