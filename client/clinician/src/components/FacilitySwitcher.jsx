import { Building2, Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { cx } from '../utils/cx'

/**
 * Facility and department the clinician is working in. Patient access is
 * limited to this facility; other facilities are granted by the health
 * records officer, so the menu explains that rather than offering a switch.
 */
export default function FacilitySwitcher() {
  const { facility } = useAuth()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-left transition-colors hover:bg-white/6"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-white">{facility?.name}</span>
          <span className="block truncate text-[12px] text-portal-text">{facility?.department}</span>
        </span>
        <ChevronDown className={cx('size-4 shrink-0 text-portal-text transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} className="animate-fade-in absolute inset-x-0 top-full z-40 mt-2 rounded-xl bg-white p-2 text-ink shadow-pop">
          <p className="px-2 pb-1 pt-1 text-caption uppercase text-muted">Working at</p>
          <div className="flex items-start gap-2.5 rounded-lg bg-teal-50 px-2.5 py-2">
            <Building2 className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{facility?.name}</span>
              <span className="block text-[12px] text-slate-600">{facility?.department}</span>
            </span>
            <Check className="mt-0.5 size-4 shrink-0 text-teal-700" aria-label="Current facility" />
          </div>
          <p className="px-2 pb-1 pt-2.5 text-[12px] leading-[18px] text-slate-600">
            You can see patients at this facility only. Ask your health records officer for access to another facility.
          </p>
        </div>
      )}
    </div>
  )
}
