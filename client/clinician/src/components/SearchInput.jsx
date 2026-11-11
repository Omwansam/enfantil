import { Search, X } from 'lucide-react'
import { forwardRef } from 'react'
import { cx } from '../utils/cx'

/** Search field with a magnifier and a clear button. */
const SearchInput = forwardRef(function SearchInput({ value, onChange, label, placeholder, className, inputClassName, ...props }, ref) {
  return (
    <div role="search" className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-600" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cx(
          'block min-h-11 w-full rounded-xl border border-line bg-white pl-10 pr-10 text-[14px] text-ink placeholder:text-[#6B7480] hover:border-[#D3CFC7] [&::-webkit-search-cancel-button]:hidden',
          inputClassName,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-[#F1F0EC] hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
})

export default SearchInput
