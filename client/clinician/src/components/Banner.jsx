import { CircleAlert, CircleCheck, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react'
import IconButton from './IconButton'
import { cx } from '../utils/cx'

const TONES = {
  coral: { box: 'border-coral-200 bg-coral-50 text-ink', icon: TriangleAlert, iconClass: 'text-coral-700', title: 'text-coral-700' },
  error: { box: 'border-coral-200 bg-coral-50 text-ink', icon: CircleAlert, iconClass: 'text-coral-700', title: 'text-coral-700' },
  warning: { box: 'border-amber-200 bg-amber-50 text-ink', icon: ShieldAlert, iconClass: 'text-amber-700', title: 'text-amber-800' },
  blue: { box: 'border-info-line bg-info-bg text-ink', icon: Info, iconClass: 'text-info', title: 'text-info' },
  success: { box: 'border-[#A7F3D0] bg-completed-bg text-ink', icon: CircleCheck, iconClass: 'text-completed', title: 'text-completed' },
  info: { box: 'border-teal-100 bg-teal-50 text-ink', icon: Info, iconClass: 'text-teal-700', title: 'text-teal-800' },
}

/** Banner for overdue alerts, errors, warnings, success and info messages. */
export default function Banner({ tone = 'info', title, children, action, icon, onDismiss, role, className }) {
  const t = TONES[tone]
  const Icon = icon ?? t.icon
  return (
    <div role={role} className={cx('flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center', t.box, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cx('mt-0.5 size-5 shrink-0', t.iconClass)} aria-hidden="true" />
        <div className="text-[14px] leading-[22px] text-slate-600">
          {title && <strong className={cx('font-semibold', t.title)}>{title} </strong>}
          {children}
        </div>
      </div>
      {action && <div className="shrink-0 pl-8 sm:pl-0">{action}</div>}
      {onDismiss && <IconButton icon={X} label="Dismiss" onClick={onDismiss} className="-my-2 self-end sm:self-auto" />}
    </div>
  )
}
