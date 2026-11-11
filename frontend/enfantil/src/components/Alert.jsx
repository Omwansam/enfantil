import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import IconButton from './IconButton'
import { cx } from '../utils/cx'

const TONES = {
  coral: { box: 'border-coral-200 bg-coral-50 text-ink', icon: TriangleAlert, iconClass: 'text-coral-700', title: 'text-coral-700' },
  success: { box: 'border-[#A7F3D0] bg-completed-bg text-ink', icon: CircleCheck, iconClass: 'text-completed', title: 'text-completed' },
  info: { box: 'border-teal-100 bg-teal-50 text-ink', icon: Info, iconClass: 'text-teal-700', title: 'text-teal-800' },
}

/** Banner for overdue doses, emergencies, success and info messages. */
export default function Alert({ tone = 'info', title, children, action, icon, onDismiss, role, className }) {
  const t = TONES[tone]
  const Icon = icon ?? t.icon
  return (
    <div role={role} className={cx('flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', t.box, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cx('mt-0.5 size-5 shrink-0', t.iconClass)} aria-hidden="true" />
        <p className="text-[14px] leading-6 text-slate-600 sm:text-[15px]">
          {title && <strong className={cx('font-semibold', t.title)}>{title} </strong>}
          {children}
        </p>
      </div>
      {action && <div className="shrink-0 pl-8 sm:pl-0">{action}</div>}
      {onDismiss && <IconButton icon={X} label="Dismiss" onClick={onDismiss} className="-my-2 self-end sm:self-auto" />}
    </div>
  )
}
