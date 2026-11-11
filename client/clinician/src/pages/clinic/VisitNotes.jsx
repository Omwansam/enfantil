import { FileCheck2 } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { getNotesQueue } from '../../api/visitNotes'
import AsyncContent from '../../components/AsyncContent'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import { SkeletonList } from '../../components/Skeleton'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

/** "Visit notes" in the sidebar opens the first unfinished note, or says everything is signed. */
export default function VisitNotes() {
  useDocumentTitle('Visit notes')
  const { user } = useAuth()
  const state = useAsync(() => getNotesQueue(user.id), [user.id])
  return (
    <AsyncContent
      state={state}
      errorTitle="We couldn’t load your visit notes"
      skeleton={
        <Card className="p-2">
          <SkeletonList rows={3} label="Loading visit notes" />
        </Card>
      }
      isEmpty={(list) => list.length === 0}
      empty={
        <>
          <PageHeader title="Visit notes" />
          <Card>
            <EmptyState
              icon={FileCheck2}
              title="Every visit note is signed"
              description="Notes for visits you complete will appear here until you sign them."
              action={<Button to="/clinic">Back to dashboard</Button>}
            />
          </Card>
        </>
      }
    >
      {(list) => <Navigate to={`/clinic/visits/${list[0].id}/note`} replace />}
    </AsyncContent>
  )
}
