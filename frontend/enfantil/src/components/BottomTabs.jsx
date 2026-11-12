import { CalendarDays, HeartPulse, House, MessageCircle, Syringe } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useChildren } from '../context/ChildContext'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import { cx } from '../utils/cx'

/**
 * Bottom tab bar on phones (as in the mobile frames). Health and Vaccines open
 * the mother's own pages when "Me" is selected, the child's otherwise.
 */
export default function BottomTabs() {
  const { isMe } = useChildren()
  const counts = useUnreadCounts()
  const { pathname } = useLocation()
  const tabs = [
    { to: '/family', label: 'Home', icon: House, match: (p) => p === '/family' },
    {
      to: isMe ? '/family/me' : '/family/health',
      label: 'Health',
      icon: HeartPulse,
      match: (p) => p.startsWith('/family/health') || (p.startsWith('/family/me') && !p.startsWith('/family/me/vaccines')),
    },
    { to: isMe ? '/family/me/vaccines' : '/family/vaccines', label: 'Vaccines', icon: Syringe, match: (p) => p.includes('vaccines') || p.startsWith('/family/card') },
    { to: '/family/visits', label: 'Visits', icon: CalendarDays, match: (p) => p.startsWith('/family/visits') },
    { to: '/family/messages', label: 'Messages', icon: MessageCircle, match: (p) => p.startsWith('/family/messages'), count: counts.messages },
  ]
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname)
          return (
            <li key={tab.label}>
              <NavLink
                to={tab.to}
                end={tab.to === '/family'}
                aria-current={active ? 'page' : undefined}
                className={cx('relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', active ? 'text-teal-700' : 'text-slate-600')}
              >
                <tab.icon className="size-[22px]" aria-hidden="true" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="absolute right-[calc(50%-20px)] top-1.5 min-w-[18px] rounded-full bg-coral-700 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                    {tab.count}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
