import { useEffect, useRef } from 'react'

/** Left slide-over panel (the sidebar below 1024px). Built on <dialog> for focus trapping and Escape. */
export default function Drawer({ open, onClose, label, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 h-dvh max-h-dvh w-[288px] max-w-[85vw] bg-white p-0 text-ink shadow-pop open:animate-drawer-in"
    >
      {open && children}
    </dialog>
  )
}
