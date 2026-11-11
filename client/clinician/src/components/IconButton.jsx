import { cx } from '../utils/cx'

/** Icon-only button. `label` becomes the aria-label (required for screen readers). */
export default function IconButton({ icon: Icon, label, className, variant = 'ghost', type = 'button', ...props }) {
  const variants = {
    ghost: 'text-slate-600 hover:bg-[#F1F0EC] hover:text-ink',
    outline: 'border border-line bg-white text-slate-600 hover:bg-[#F4F3F0] hover:text-ink',
  }
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx('inline-flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors', variants[variant], className)}
      {...props}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
