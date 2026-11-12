import { getNavCounts } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import { useAsync } from './useAsync'
import { useDataVersion } from './useDataVersion'

/** Sidebar badges; refreshes whenever mock data changes (a thread is read, a note is signed…). */
export function useNavCounts() {
  const { user } = useAuth()
  const version = useDataVersion()
  const { data } = useAsync(() => getNavCounts(user?.id), [user?.id], version)
  return data ?? { messages: 0, visitNotes: 0, requests: 0, notifications: 0 }
}
