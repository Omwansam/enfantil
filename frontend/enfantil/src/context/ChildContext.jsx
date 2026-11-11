import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getChildren } from '../api/children'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { readJSON, writeJSON } from '../utils/storage'

const ChildContext = createContext(null)
const STORAGE_KEY = 'enfantil:selectedChild'

/** The child being viewed. Saved to localStorage so it survives reloads; every page reads it. */
export function ChildProvider({ children }) {
  const version = useDataVersion()
  const { data, error, reload } = useAsync(getChildren, [], version)
  const [selectedId, setSelectedId] = useState(() => readJSON(STORAGE_KEY))

  const childList = useMemo(() => data ?? [], [data])
  const selectedChild = childList.find((c) => c.id === selectedId) ?? childList[0] ?? null

  const selectChild = useCallback((id) => {
    setSelectedId(id)
    writeJSON(STORAGE_KEY, id)
  }, [])

  const value = useMemo(
    () => ({
      childList,
      selectedChild,
      selectChild,
      loading: data === undefined && !error,
      error: data === undefined ? error : null,
      reload,
    }),
    [childList, selectedChild, selectChild, data, error, reload],
  )

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChildren() {
  const ctx = useContext(ChildContext)
  if (!ctx) throw new Error('useChildren must be used inside <ChildProvider>')
  return ctx
}
