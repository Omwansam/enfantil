import { Check, ChevronDown, ChevronsUpDown, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import Skeleton from './Skeleton'
import { useChildren } from '../context/ChildContext'
import { cx } from '../utils/cx'
import { profileDetail, profileName } from '../utils/profile'

/**
 * Picks the profile every page shows: the mother ("Me") or one of her children.
 * variant: 'sidebar' (VIEWING · Me · Wanjiru), 'button' (Switch profile), 'chip' (avatar + name).
 */
export default function ChildSwitcher({ variant = 'sidebar', onNavigate, align = 'left', className }) {
  const { profiles, selectedProfile, selectChild } = useChildren()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const selectedIndex = Math.max(0, profiles.findIndex((p) => p.id === selectedProfile?.id))
    itemRefs.current[selectedIndex]?.focus()
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open, profiles, selectedProfile])

  if (!selectedProfile) {
    return <Skeleton className={cx(variant === 'sidebar' ? 'h-[60px] w-full rounded-xl' : 'h-11 w-36 rounded-xl', className)} />
  }

  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) buttonRef.current?.focus()
  }

  const onMenuKeyDown = (event) => {
    const items = itemRefs.current.filter(Boolean)
    const index = items.indexOf(document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const choose = (id) => {
    selectChild(id)
    close()
  }

  const trigger = {
    sidebar: (
      <>
        <Avatar initials={selectedProfile.initials} tone={selectedProfile.tone} size="sm" />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[11px] font-semibold tracking-[0.06em] text-muted">VIEWING</span>
          <span className="block truncate text-[14px] font-semibold text-ink">
            {profileName(selectedProfile)}
            {!selectedProfile.isMe && ` · ${selectedProfile.age}`}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-slate-600" aria-hidden="true" />
      </>
    ),
    button: (
      <>
        <span>Switch profile</span>
        <ChevronDown className="size-4 text-slate-600" aria-hidden="true" />
      </>
    ),
    chip: (
      <>
        <Avatar initials={selectedProfile.initials} tone={selectedProfile.tone} size="xs" />
        <span>{selectedProfile.isMe ? 'Me' : selectedProfile.firstName}</span>
        <ChevronDown className="size-4 text-slate-600" aria-hidden="true" />
      </>
    ),
  }[variant]

  return (
    <div ref={rootRef} className={cx('relative', variant === 'sidebar' && 'w-full', className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={variant === 'sidebar' ? undefined : `Switch profile. Viewing ${selectedProfile.isMe ? 'your own records' : selectedProfile.firstName}`}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'flex items-center gap-2.5 transition-colors',
          variant === 'sidebar'
            ? 'w-full rounded-xl border border-line bg-page px-3 py-2.5 hover:bg-[#F1F0EC]'
            : 'min-h-11 rounded-xl border border-line bg-white px-3.5 text-[14px] font-semibold text-ink hover:bg-[#F4F3F0]',
        )}
      >
        {trigger}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Choose a profile"
          onKeyDown={onMenuKeyDown}
          className={cx(
            'animate-fade-in absolute z-40 mt-2 w-64 rounded-xl border border-line bg-white p-1.5 shadow-pop',
            align === 'right' ? 'right-0' : 'left-0',
            variant === 'sidebar' && 'w-full',
          )}
        >
          {profiles.map((profile, index) => {
            const selected = profile.id === selectedProfile.id
            return (
              <button
                key={profile.id}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                tabIndex={-1}
                onClick={() => choose(profile.id)}
                className={cx('flex min-h-12 w-full items-center gap-3 rounded-lg px-2.5 text-left hover:bg-[#F4F3F0]', selected && 'bg-teal-50')}
              >
                <Avatar initials={profile.initials} tone={profile.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{profile.isMe ? `Me · ${profile.firstName}` : profile.fullName}</span>
                  <span className="block text-small text-muted">{profileDetail(profile)}</span>
                </span>
                {selected && <Check className="size-4 text-teal-700" aria-hidden="true" />}
              </button>
            )
          })}
          <div className="my-1 border-t border-line" />
          <Link
            ref={(el) => {
              itemRefs.current[profiles.length] = el
            }}
            to="/family/children/new"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              setOpen(false)
              onNavigate?.()
            }}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 text-[14px] font-semibold text-teal-700 hover:bg-teal-50"
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-teal-700/50">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            Add child
          </Link>
        </div>
      )}
    </div>
  )
}
