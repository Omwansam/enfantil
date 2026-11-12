import { Activity, Baby, Bell, CalendarDays, CircleHelp, HeartPulse, House, IdCard, LineChart, LogOut, MessageCircle, NotebookPen, Settings, ShieldPlus, Syringe } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import ChildSwitcher from './ChildSwitcher'
import CountPill from './CountPill'
import IconButton from './IconButton'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useChildren } from '../context/ChildContext'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import { cx } from '../utils/cx'
import { initials } from '../utils/format'

function NavItem({ to, icon: Icon, label, count, end, activeMatch, onNavigate }) {
  const location = useLocation()
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => {
        const active = activeMatch ? activeMatch.some((p) => location.pathname.startsWith(p)) : isActive
        return cx(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
          active ? 'bg-teal-50 font-semibold text-teal-800' : 'font-medium text-slate-600 hover:bg-[#F4F3F0] hover:text-ink',
        )
      }}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        <>
          <CountPill count={count} />
          <span className="sr-only">, {count} unread</span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Family sidebar. The profile switcher picks "Me" or a child, and the
 * navigation follows: the mother's own records for "Me", the child's for a child.
 */
export default function Sidebar({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { isMe, me } = useChildren()
  const counts = useUnreadCounts()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  const pregnant = me?.statusKind === 'pregnant'
  const postnatal = me?.statusKind === 'postnatal'

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-3 pb-4 pt-5">
      <NavLink to="/family" onClick={onNavigate} className="mb-5 self-start rounded-lg px-2" aria-label="Enfantil for families, overview">
        <Logo tagline />
      </NavLink>

      <ChildSwitcher variant="sidebar" onNavigate={onNavigate} />

      <nav aria-label="Main" className="mt-5 flex flex-col gap-1">
        <NavItem to="/family" end icon={House} label="Overview" onNavigate={onNavigate} />
        {isMe ? (
          <>
            <NavItem to="/family/me" end icon={NotebookPen} label="My health record" onNavigate={onNavigate} />
            {pregnant && <NavItem to="/family/me/pregnancy" icon={Baby} label="My pregnancy" onNavigate={onNavigate} />}
            {(pregnant || postnatal) && (
              <NavItem to="/family/me/antenatal" icon={HeartPulse} label="Antenatal care" activeMatch={['/family/me/antenatal']} onNavigate={onNavigate} />
            )}
            {(pregnant || postnatal) && <NavItem to="/family/me/progress" icon={LineChart} label="My progress" onNavigate={onNavigate} />}
            {postnatal && <NavItem to="/family/me/postnatal" icon={ShieldPlus} label="Postnatal care" onNavigate={onNavigate} />}
            <NavItem to="/family/me/vaccines" icon={Syringe} label="My vaccines" onNavigate={onNavigate} />
          </>
        ) : (
          <>
            <NavItem to="/family/health" icon={Activity} label="Health profile" onNavigate={onNavigate} />
            <NavItem to="/family/vaccines" icon={Syringe} label="Vaccines" onNavigate={onNavigate} />
          </>
        )}
        <NavItem to="/family/visits" icon={CalendarDays} label="Visits" onNavigate={onNavigate} />
        <NavItem to="/family/messages" icon={MessageCircle} label="Messages" count={counts.messages} onNavigate={onNavigate} />
        <NavItem to="/family/notifications" icon={Bell} label="Notifications" count={counts.notifications} onNavigate={onNavigate} />
        {!isMe && <NavItem to="/family/card" icon={IdCard} label="Vaccination card" onNavigate={onNavigate} />}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-6">
        <NavItem to="/family/settings" icon={Settings} label="Settings" activeMatch={['/family/settings', '/family/children']} onNavigate={onNavigate} />
        <NavItem to="/family/help" icon={CircleHelp} label="Help & support" onNavigate={onNavigate} />

        <div className="mt-3 flex items-center gap-3 border-t border-line px-2 pt-4">
          <Avatar initials={initials(user?.fullName ?? '')} tone={user?.avatarTone ?? 'pink'} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{user?.fullName}</p>
            <p className="text-small text-muted">{user?.relationship}</p>
          </div>
          <IconButton icon={LogOut} label="Sign out" onClick={handleSignOut} />
        </div>
      </div>
    </div>
  )
}
