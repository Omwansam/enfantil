import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

/** Right-hand slide-over panel on <dialog>: traps focus and closes on Escape or backdrop click. */
export default function SidePanel({ open, onClose, title, description, children, footer }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(520px,100vw)] max-w-full bg-white p-0 text-ink shadow-pop"
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 id={titleId} className="text-h2">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[14px] text-slate-600">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-[#F1F0EC]"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
