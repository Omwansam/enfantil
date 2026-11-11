import { cx } from '../utils/cx'

/** Page title (h1) with an optional subtitle and actions on the right. */
export default function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx('mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="text-h1 text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
