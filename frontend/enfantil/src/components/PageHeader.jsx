import { cx } from '../utils/cx'

export default function PageHeader({ eyebrow, title, subtitle, actions, leading, className }) {
  return (
    <header className={cx('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          {eyebrow && <p className="text-[14px] text-slate-600">{eyebrow}</p>}
          <h1 className="text-h1 text-ink sm:text-[30px] sm:leading-[38px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-slate-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
    </header>
  )
}
