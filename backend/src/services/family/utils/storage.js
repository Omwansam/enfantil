/** localStorage / sessionStorage access that never throws (private mode, blocked storage). */
function store(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

export function readJSON(key, { kind = 'local', fallback = null } = {}) {
  try {
    const raw = store(kind)?.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value, { kind = 'local' } = {}) {
  try {
    store(kind)?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: the app keeps working without persistence */
  }
}

export function removeKey(key, { kind = 'local' } = {}) {
  try {
    store(kind)?.removeItem(key)
  } catch {
    /* ignore */
  }
}
