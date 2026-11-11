import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Enfantil Clinician Portal` : 'Enfantil Clinician Portal'
  }, [title])
}
