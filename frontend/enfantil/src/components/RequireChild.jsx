import { Baby } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import Avatar from './Avatar'
import Button from './Button'
import Card from './Card'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import { SkeletonCard } from './Skeleton'
import { useChildren } from '../context/ChildContext'

/**
 * Renders children(selectedChild) once profiles have loaded. When the mother
 * is viewing "Me", child pages send her to the matching "Me" page (meRoute)
 * or ask which child to show.
 */
export default function RequireChild({ children, meRoute }) {
  const { selectedChild, childList, isMe, selectChild, loading, error, reload } = useChildren()
  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="lg:col-span-2" lines={5} />
        <SkeletonCard lines={3} />
      </div>
    )
  }
  if (error) {
    return (
      <Card>
        <ErrorState title="We couldn’t load your profiles" error={error} onRetry={reload} />
      </Card>
    )
  }
  if (isMe && meRoute) return <Navigate to={meRoute} replace />
  if (isMe && childList.length) {
    return (
      <Card className="p-6">
        <h2 className="text-h2">Which child?</h2>
        <p className="mt-1 text-[14px] text-slate-600">This page is about your children. Choose one to continue.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {childList.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectChild(c.id)}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-line bg-white py-1 pl-1.5 pr-4 text-[14px] font-semibold text-ink hover:border-teal-700 hover:bg-teal-50"
            >
              <Avatar initials={c.initials} tone={c.tone} size="sm" />
              {c.firstName}
            </button>
          ))}
        </div>
      </Card>
    )
  }
  if (!selectedChild) {
    return (
      <Card>
        <EmptyState
          icon={Baby}
          title="Add your first child"
          description="Link the record Tumaini Family Hospital already has, or enter your child’s details yourself."
          action={<Button to="/family/children/new">Add a child</Button>}
        />
      </Card>
    )
  }
  return children(selectedChild)
}
