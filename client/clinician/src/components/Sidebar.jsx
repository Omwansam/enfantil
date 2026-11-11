import { CalendarDays, ChartLine, FileText, LayoutDashboard, LogOut, MessageCircle, Users } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import CountPill from './CountPill'
import FacilitySwitcher from './FacilitySwitcher'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'
import { useNavCounts } from '../hooks/useNavCounts'
import { cx } from '../utils/cx'

function NavItem({ to, icon: Icon, label, count, countTone, countLabel, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
          isActive ? 'bg-white/14 font-semibold text-white' : 'font-medium text-portal-text hover:bg-white/6 hover:text-white',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {count > 0 && (
        <>
          <CountPill count={count} tone={countTone} />
          <span className="sr-only">
            , {count} {countLabel}
          </span>
        </>
      )}
    </NavLink>
  )
}

/** Deep-teal portal sidebar: logo, facility, navigation with counts, signed-in clinician. */
export default function Sidebar({ onNavigate }) {
  const { user, signOut } = useAuth()
  const counts = useNavCounts()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut({ notice: 'signed-out' })
    navigate('/clinic/sign-in', { replace: true })
  }

  return (
    <div className="on-portal flex h-full w-full flex-col overflow-y-auto px-3 pb-4 pt-5">
      <NavLink to="/clinic" onClick={onNavigate} className="mb-5 self-start rounded-lg px-2" aria-label="Enfantil clinician portal, dashboard">
        <Logo />
      </NavLink>

      <FacilitySwitcher />

      <nav aria-label="Main" className="mt-5 flex flex-col gap-1">
        <NavItem to="/clinic" end icon={LayoutDashboard} label="Dashboard" onNavigate={onNavigate} />
        <NavItem to="/clinic/patients" icon={Users} label="Patients" onNavigate={onNavigate} />
        <NavItem to="/clinic/appointments" icon={CalendarDays} label="Appointments" onNavigate={onNavigate} />
        <NavItem
          to="/clinic/messages"
          icon={MessageCircle}
          label="Messages"
          count={counts.messages}
          countTone="coral"
          countLabel="unread conversations"
          onNavigate={onNavigate}
        />
        <NavItem
          to="/clinic/visits"
          icon={FileText}
          label="Visit notes"
          count={counts.visitNotes}
          countTone="amber"
          countLabel="unfinished"
          onNavigate={onNavigate}
        />
        <NavItem to="/clinic/coverage" icon={ChartLine} label="Coverage" onNavigate={onNavigate} />
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/12 px-2 pt-4">
        <Avatar initials={user?.initials} tone={user?.tone ?? 'indigo'} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-5 text-white">{user?.name}</p>
          <p className="text-[12px] text-portal-text">{user?.title}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-portal-text transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
