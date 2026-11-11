import { Inbox } from 'lucide-react'
import { cx } from '../utils/cx'

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-10 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[14px] text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
