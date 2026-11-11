import { cx } from '../utils/cx'

/** White card, 16px radius, subtle shadow. */
export default function Card({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag className={cx('rounded-2xl bg-white shadow-card', className)} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, as: Heading = 'h2', id, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <Heading id={id} className="text-h2 text-ink">
          {title}
        </Heading>
        {subtitle && <p className="mt-0.5 text-small text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
