import { Baby } from 'lucide-react'
import Button from './Button'
import Card from './Card'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import { SkeletonCard } from './Skeleton'
import { useChildren } from '../context/ChildContext'

/** Renders children(selectedChild) once the family's children have loaded. */
export default function RequireChild({ children }) {
  const { selectedChild, loading, error, reload } = useChildren()
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
        <ErrorState title="We couldn’t load your children" error={error} onRetry={reload} />
      </Card>
    )
  }
  if (!selectedChild) {
    return (
      <Card>
        <EmptyState
          icon={Baby}
          title="Add your first child"
          description="Link a record your clinic already has, or enter your child’s details yourself."
          action={<Button to="/family/children/new">Add a child</Button>}
        />
      </Card>
    )
  }
  return children(selectedChild)
}
