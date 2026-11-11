import { cx } from '../utils/cx'

/** White toolbar card above a table: navigation on the left, filters on the right. */
export default function FilterBar({ start, end, className }) {
  return (
    <div className={cx('flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-card lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-2">{start}</div>
      {end && <div className="flex flex-wrap items-center gap-2">{end}</div>}
    </div>
  )
}

/** Compact select used inside the filter bar. */
export function FilterSelect({ label, value, onChange, options, className }) {
  return (
    <label className={cx('relative inline-flex', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 w-full appearance-none rounded-[10px] border border-line bg-white pl-3 pr-9 text-[14px] text-ink hover:border-[#D3CFC7]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-600">
        <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}
