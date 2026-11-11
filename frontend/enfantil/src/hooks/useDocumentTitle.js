import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Enfantil` : 'Enfantil for families'
  }, [title])
}
