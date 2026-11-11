import { useCallback, useEffect, useState } from 'react'

/**
 * Runs an async function and tracks { data, error, loading }.
 *
 * - `deps` identify the data (e.g. [childId]). When they change, the old data
 *   is dropped so a screen never shows one child's records under another's name.
 * - `refreshToken` re-fetches in the background and keeps the current data on
 *   screen (pass the value from useDataVersion for live counts and lists).
 * - `reload()` retries after an error; `setData()` applies optimistic updates.
 */
export function useAsync(asyncFn, deps = [], refreshToken = 0) {
  const key = JSON.stringify(deps)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ key: null, attempt: -1, data: undefined, error: null })

  useEffect(() => {
    let active = true
    asyncFn().then(
      (data) => {
        if (active) setState({ key, attempt, data, error: null })
      },
      (error) => {
        if (active) setState((prev) => ({ key, attempt, data: prev.key === key ? prev.data : undefined, error }))
      },
    )
    return () => {
      active = false
    }
    // asyncFn is intentionally excluded: callers pass inline functions keyed by `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt, refreshToken])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  const setData = useCallback(
    (updater) => setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater })),
    [],
  )

  const current = state.key === key
  const settled = current && state.attempt === attempt
  return {
    data: current ? state.data : undefined,
    error: settled ? state.error : null,
    loading: !settled,
    reload,
    setData,
  }
}
