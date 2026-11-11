import { cx } from '../utils/cx'

/**
 * Table that scrolls horizontally inside its card on narrow screens.
 * Use with Th / Td; rows are plain <tr>s so pages control hover and tinting.
 */
export default function DataTable({ caption, minWidth = 720, className, children }) {
  return (
    <div className={cx('scrollbar-thin relative overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

export function Th({ className, children, ...props }) {
  return (
    <th
      scope="col"
      className={cx('whitespace-nowrap border-b border-line bg-[#FAF9F7] px-3.5 py-2.5 text-caption uppercase text-muted first:pl-5 last:pr-5', className)}
      {...props}
    >
      {children}
    </th>
  )
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cx('border-b border-line px-3.5 py-3 align-middle text-ink first:pl-5 last:pr-5', className)} {...props}>
      {children}
    </td>
  )
}

/** Full-width row for loading, empty and error states inside a table body. */
export function TableMessage({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {children}
      </td>
    </tr>
  )
}
