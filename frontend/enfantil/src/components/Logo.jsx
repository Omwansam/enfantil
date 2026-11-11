import { Heart } from 'lucide-react'
import { cx } from '../utils/cx'

/** Teal rounded-square heart mark + "Enfantil" (+ "FOR FAMILIES" when `tagline`). */
export default function Logo({ tagline = false, inverted = false, size = 'md', className }) {
  const mark = size === 'lg' ? 'size-11 rounded-xl' : 'size-9 rounded-[10px]'
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <span className={cx('flex shrink-0 items-center justify-center', mark, inverted ? 'bg-white text-teal-700' : 'bg-teal-700 text-white')}>
        <Heart className={size === 'lg' ? 'size-6' : 'size-5'} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cx('font-bold tracking-[-0.01em]', size === 'lg' ? 'text-[22px]' : 'text-[18px]', inverted ? 'text-white' : 'text-ink')}>
          Enfantil
        </span>
        {tagline && (
          <span className={cx('mt-1 text-[11px] font-semibold tracking-[0.06em]', inverted ? 'text-teal-100' : 'text-teal-700')}>FOR FAMILIES</span>
        )}
      </span>
    </span>
  )
}
