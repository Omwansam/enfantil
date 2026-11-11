import { cx } from '../utils/cx'

function pageList(page, count) {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i + 1)
  const pages = new Set([1, count, page, page - 1, page + 1])
  if (page <= 3) [2, 3].forEach((p) => pages.add(p))
  if (page >= count - 2) [count - 1, count - 2].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`)
    out.push(p)
  })
  return out
}

const box = 'inline-flex size-10 items-center justify-center rounded-[10px] text-[14px] font-semibold transition-colors'

/** "‹ 1 2 3 … 25 ›" — the current page is a teal square. */
export default function Pagination({ page, pageCount, onChange, label = 'Pages' }) {
  if (pageCount <= 1) return null
  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            aria-label="Previous page"
            className={cx(
              box,
              'border border-line bg-white text-ink hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:text-[#A8A398] disabled:hover:bg-white',
            )}
          >
            ‹
          </button>
        </li>
        {pageList(page, pageCount).map((p) =>
          typeof p === 'string' ? (
            <li key={p} aria-hidden="true" className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
                className={cx(box, p === page ? 'bg-teal-700 text-white' : 'border border-line bg-white text-ink hover:bg-[#F7F6F3]')}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page === pageCount}
            aria-label="Next page"
            className={cx(
              box,
              'border border-line bg-white text-ink hover:bg-[#F7F6F3] disabled:cursor-not-allowed disabled:text-[#A8A398] disabled:hover:bg-white',
            )}
          >
            ›
          </button>
        </li>
      </ul>
    </nav>
  )
}
