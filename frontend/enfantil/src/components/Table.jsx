import { cx } from '../utils/cx'

/** Table that scrolls horizontally inside its card on small screens. */
export default function Table({ caption, minWidth = 640, className, children }) {
  return (
    <div className={cx('scrollbar-thin print-table-full relative overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[14px]" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

export function Th({ className, children, ...props }) {
  return (
    <th scope="col" className={cx('bg-[#F8F7F4] px-4 py-2.5 text-caption uppercase text-muted first:rounded-l-lg last:rounded-r-lg', className)} {...props}>
      {children}
    </th>
  )
}

export function Td({ className, children, ...props }) {
  return (
    <td className={cx('border-b border-line px-4 py-3 align-middle text-ink', className)} {...props}>
      {children}
    </td>
  )
}
