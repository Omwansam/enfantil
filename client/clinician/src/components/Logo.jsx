import { Heart } from 'lucide-react'
import { cx } from '../utils/cx'

/** White rounded-square heart + "Enfantil" + "CLINICIAN PORTAL", for the deep-teal sidebar and sign-in panel. */
export default function Logo({ badge = false, size = 'md', className }) {
  const large = size === 'lg'
  return (
    <span className={cx('inline-flex items-center gap-3', className)}>
      <span className={cx('flex shrink-0 items-center justify-center bg-white text-portal', large ? 'size-11 rounded-xl' : 'size-9 rounded-[10px]')}>
        <Heart className={large ? 'size-6' : 'size-5'} strokeWidth={2.2} aria-hidden="true" />
      </span>
      {badge ? (
        <span className="flex items-center gap-3">
          <span className={cx('font-bold tracking-[-0.01em] text-white', large ? 'text-[22px]' : 'text-[18px]')}>Enfantil</span>
          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-white">CLINICIAN PORTAL</span>
        </span>
      ) : (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-bold tracking-[-0.01em] text-white">Enfantil</span>
          <span className="mt-1 text-[10.5px] font-semibold tracking-[0.08em] text-portal-text">CLINICIAN PORTAL</span>
        </span>
      )}
    </span>
  )
}
