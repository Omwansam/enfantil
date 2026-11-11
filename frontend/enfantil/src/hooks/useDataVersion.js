import { useSyncExternalStore } from 'react'
import { getVersion, subscribe } from '../api/client'

/** A number that increases whenever mock data changes (message sent, notification read, etc.). */
export function useDataVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion)
}
