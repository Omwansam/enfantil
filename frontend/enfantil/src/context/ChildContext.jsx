import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getProfiles } from '../api/children'
import { useAuth } from './AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { readJSON, writeJSON } from '../utils/storage'

const ChildContext = createContext(null)
const STORAGE_KEY = 'enfantil:selectedChild'

/**
 * The profile being viewed: the mother herself ("me") or one of her children.
 * Saved to localStorage so it survives reloads; every page reads it.
 * A pregnant mother starts on "Me"; otherwise on her first child.
 */
export function ChildProvider({ children }) {
  const { user } = useAuth()
  const version = useDataVersion()
  const { data, error, reload } = useAsync(getProfiles, [user?.id], version)
  const [selectedId, setSelectedId] = useState(() => readJSON(STORAGE_KEY))

  const childList = useMemo(() => data?.children ?? [], [data])
  const me = data?.me ?? null
  const fallback = me?.statusKind === 'pregnant' || !childList.length ? 'me' : childList[0].id
  const validId = selectedId === 'me' || childList.some((c) => c.id === selectedId) ? selectedId : fallback
  const isMe = Boolean(data) && validId === 'me'
  const selectedChild = isMe ? null : (childList.find((c) => c.id === validId) ?? null)

  const selectChild = useCallback((id) => {
    setSelectedId(id)
    writeJSON(STORAGE_KEY, id)
  }, [])

  const value = useMemo(
    () => ({
      me,
      isMe,
      childList,
      profiles: me ? [me, ...childList] : childList,
      selectedChild,
      selectedProfile: isMe ? me : selectedChild,
      selectChild,
      loading: data === undefined && !error,
      error: data === undefined ? error : null,
      reload,
    }),
    [me, isMe, childList, selectedChild, selectChild, data, error, reload],
  )

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChildren() {
  const ctx = useContext(ChildContext)
  if (!ctx) throw new Error('useChildren must be used inside <ChildProvider>')
  return ctx
}
