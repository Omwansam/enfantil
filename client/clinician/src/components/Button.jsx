import { LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '../utils/cx'

const BASE = 'inline-flex select-none items-center justify-center whitespace-nowrap rounded-xl font-semibold transition-colors disabled:cursor-not-allowed'

const VARIANTS = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 disabled:bg-[#94A3B8] disabled:text-white',
  secondary: 'border-[1.5px] border-teal-700 bg-white text-teal-700 hover:bg-teal-50 disabled:border-[#CBD5E1] disabled:text-[#94A3B8] disabled:hover:bg-white',
  neutral: 'border border-line bg-white text-ink hover:bg-[#F4F3F0]',
  ghost: 'text-teal-700 hover:bg-teal-50',
  danger: 'border border-coral-200 bg-white text-coral-700 hover:bg-coral-50',
  dangerSolid: 'bg-coral-700 text-white hover:bg-[#9A3826]',
  white: 'bg-white text-teal-800 hover:bg-teal-50',
  portal: 'bg-portal text-white hover:bg-portal-700 disabled:bg-[#94A3B8]',
  outlineNeutral: 'border border-line bg-white text-ink hover:border-[#D3CFC7] hover:bg-[#F7F6F3]',
  dangerOutline: 'border border-line bg-white text-coral-700 hover:border-coral-200 hover:bg-coral-50',
  dashed: 'border-[1.5px] border-dashed border-[#9FB8B4] bg-transparent text-teal-700 hover:border-teal-700 hover:bg-teal-50',
}

const SIZES = {
  xs: 'min-h-10 gap-1.5 rounded-[10px] px-2.5 text-[13px]',
  sm: 'min-h-10 gap-2 px-3.5 text-[13px]',
  md: 'min-h-11 gap-2 px-4 text-[14px]',
  lg: 'min-h-12 gap-2 px-5 text-[15px]',
}

/** Button, or a link styled as one when `to` (router) or `href` is passed. */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}) {
  const classes = cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
  const content = (
    <>
      {loading ? (
        <LoaderCircle className={cx('shrink-0 animate-spin', size === 'xs' ? 'size-4' : 'size-[18px]')} aria-hidden="true" />
      ) : (
        Icon && <Icon className={cx('shrink-0', size === 'xs' ? 'size-4' : 'size-[18px]')} aria-hidden="true" />
      )}
      {children}
      {IconRight && <IconRight className="size-[18px] shrink-0" aria-hidden="true" />}
    </>
  )
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  )
}
