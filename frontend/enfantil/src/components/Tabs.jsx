import { useRef } from 'react'
import { cx } from '../utils/cx'

/**
 * Tab list (role="tablist"/"tab") with arrow-key navigation.
 * Pair with <TabPanel idPrefix value> around the content it controls.
 * variant: 'underline' (Notifications) | 'pill' (Visits, Vaccination card)
 */
export default function Tabs({ tabs, value, onChange, label, idPrefix, variant = 'underline', className }) {
  const refs = useRef([])
  const onKeyDown = (event, index) => {
    let next = null
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    onChange(tabs[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cx(
        variant === 'underline'
          ? 'scrollbar-thin flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-4'
          : 'inline-flex max-w-full overflow-x-auto rounded-xl bg-sand p-1',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[index] = el
            }}
            id={`${idPrefix}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              'shrink-0 whitespace-nowrap text-[14px] transition-colors',
              variant === 'underline'
                ? cx(
                    'relative min-h-12 px-3 font-medium after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full',
                    selected ? 'font-semibold text-teal-700 after:bg-teal-700' : 'text-slate-600 hover:text-ink',
                  )
                : cx('min-h-10 rounded-[10px] px-4 font-semibold', selected ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'),
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idPrefix, value, className, children }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${value}`} className={className}>
      {children}
    </div>
  )
}
