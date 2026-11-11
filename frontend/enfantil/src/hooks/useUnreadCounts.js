import { getUnreadCounts } from '../api/notifications'
import { useAsync } from './useAsync'
import { useDataVersion } from './useDataVersion'

export function useUnreadCounts() {
  const version = useDataVersion()
  const { data } = useAsync(getUnreadCounts, [], version)
  return data ?? { messages: 0, notifications: 0 }
}
