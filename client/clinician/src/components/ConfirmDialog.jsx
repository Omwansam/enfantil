import Button from './Button'
import Modal from './Modal'

/**
 * Confirmation for destructive actions (role="alertdialog"). The cancel
 * button is the safe choice; the confirm button is coral.
 */
export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, cancelLabel = 'Back', loading = false, error, children }) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      role="alertdialog"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="dangerSolid" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
          {error}
        </p>
      )}
    </Modal>
  )
}
