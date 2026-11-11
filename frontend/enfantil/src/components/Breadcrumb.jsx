import { Link } from 'react-router-dom'

export default function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 print:hidden">
      <ol className="flex flex-wrap items-center gap-2 text-[14px]">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-2">
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined} className="font-semibold text-ink">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="font-medium text-teal-700 underline-offset-2 hover:underline">
                  {item.label}
                </Link>
              )}
              {!last && (
                <span aria-hidden="true" className="text-muted">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
