import { cx } from '../utils/cx'

const TONES = {
  teal: 'bg-teal-100 text-teal-800',
  mint: 'bg-teal-100 text-teal-800',
  coral: 'bg-coral-100 text-coral-700',
  peach: 'bg-coral-100 text-coral-700',
  pink: 'bg-[#FCE7F3] text-[#9D174D]',
  indigo: 'bg-[#E0E7FF] text-[#3730A3]',
  blue: 'bg-[#DBEAFE] text-[#1E40AF]',
  sky: 'bg-[#E0F2FE] text-[#075985]',
  violet: 'bg-[#EDE9FE] text-[#5B21B6]',
  amber: 'bg-[#FEF3C7] text-[#92400E]',
  slate: 'bg-[#F1F5F9] text-slate-600',
}

const SIZES = {
  xs: 'size-7 text-[11px]',
  sm: 'size-9 text-[12px]',
  md: 'size-10 text-[13px]',
  lg: 'size-14 text-[17px]',
  xl: 'size-[72px] text-[24px]',
  '2xl': 'size-[88px] text-[28px]',
}

/** Initials avatar (or photo when `src` is set). Decorative by default: the name is shown next to it. */
export default function Avatar({ initials, tone = 'teal', size = 'md', src, alt = '', className }) {
  if (src) {
    return <img src={src} alt={alt} className={cx('shrink-0 rounded-full object-cover', SIZES[size], className)} />
  }
  return (
    <span
      aria-hidden={alt ? undefined : true}
      aria-label={alt || undefined}
      role={alt ? 'img' : undefined}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        TONES[tone] ?? TONES.teal,
        SIZES[size],
        className,
      )}
    >
      {initials}
    </span>
  )
}
