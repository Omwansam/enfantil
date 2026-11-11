import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import IconButton from './IconButton'
import { cx } from '../utils/cx'

/** Accessible dialog built on <dialog>: traps focus, closes on Escape and on backdrop click. */
export default function Modal({ open, onClose, title, description, children, footer, className }) {
  const ref = useRef(null)
  const titleId = useId()
  const descId = useId()

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
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cx('m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl bg-white p-0 text-ink shadow-pop', className)}
    >
      {open && (
        <div className="animate-fade-in p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-h2">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[14px] text-slate-600">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mr-2 -mt-2" />
          </div>
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
