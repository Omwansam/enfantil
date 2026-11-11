import { useCallback, useState } from 'react'

/** Returns [ref, width]; the width follows the element as the window resizes. */
export function useElementWidth() {
  const [width, setWidth] = useState(0)
  const ref = useCallback((node) => {
    if (!node) return undefined
    setWidth(node.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
