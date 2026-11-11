import { CalendarDays, Download, MessageCircle, Plus, Syringe } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAppointments } from '../api/appointments'
import { getChildOverview } from '../api/children'
import { getConversations } from '../api/messages'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card, { CardHeader } from '../components/Card'
import { UnreadDot } from '../components/CountPill'
import DateTile from '../components/DateTile'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import RequireChild from '../components/RequireChild'
import Skeleton, { SkeletonList } from '../components/Skeleton'
import { linkClass } from '../components/fieldStyles'
import { useAuth } from '../context/AuthContext'
import { useChildren } from '../context/ChildContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { formatDate, formatListTime, formatTime, relativeDay, TODAY } from '../utils/dates'
import { possessive } from '../utils/format'

const num = (value) => String(Number(value))

export default function Dashboard() {
  useDocumentTitle('Overview')
  const { user } = useAuth()
  const { childList, selectedChild, selectChild } = useChildren()
  const location = useLocation()
  const navigate = useNavigate()
  const flash = location.state?.flash

  return (
    <>
      <PageHeader
        eyebrow={formatDate(TODAY, 'long')}
        title={`Habari, ${user?.firstName ?? ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a child">
            {childList.map((child) => {
              const active = child.id === selectedChild?.id
              return (
                <button
                  key={child.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectChild(child.id)}
                  className={cx(
                    'inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] py-1 pl-1.5 pr-4 text-[14px] transition-colors',
                    active ? 'border-teal-700 bg-teal-50' : 'border-line bg-white hover:border-[#CFCAC1]',
                  )}
                >
                  <Avatar initials={child.initials} tone={child.tone} size="sm" />
                  <span className="font-semibold text-ink">{child.firstName}</span>
                  <span className="text-muted">· {child.ageShort}</span>
                </button>
              )
            })}
            <Button to="/family/children/new" variant="dashed" icon={Plus} className="min-h-12 rounded-full">
              Add child
            </Button>
          </div>
        }
      />

      {flash && (
        <Alert tone="success" role="status" className="mb-5" onDismiss={() => navigate(location.pathname, { replace: true, state: null })}>
          {flash}
        </Alert>
      )}

      <RequireChild>{(child) => <Overview child={child} />}</RequireChild>
    </>
  )
}

function Overview({ child }) {
  const version = useDataVersion()
  const overview = useAsync(() => getChildOverview(child.id), [child.id], version)
  const upcoming = useAsync(() => getAppointments({ when: 'upcoming' }), [], version)
  const conversations = useAsync(getConversations, [], version)

  return (
    <div className="space-y-5">
      {overview.data && overview.data.overdue.length > 0 && <OverdueBanner child={child} overdue={overview.data.overdue} />}

      <AsyncContent
        state={overview}
        errorTitle="We couldn’t load the summary"
        skeleton={
          <div className="grid gap-5 md:grid-cols-3" role="status" aria-label="Loading summary">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[124px] rounded-2xl" />
            ))}
          </div>
        }
      >
        {(data) => <SummaryCards child={child} data={data} />}
      </AsyncContent>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 sm:p-6">
          <CardHeader
            title="Coming up for your family"
            action={
              <Link to="/family/visits" className={`${linkClass} text-[14px]`}>
                All visits
              </Link>
            }
          />
          <div className="mt-4 border-t border-line">
            <AsyncContent
              state={upcoming}
              errorTitle="We couldn’t load upcoming visits"
              skeleton={<SkeletonList rows={3} label="Loading upcoming visits" className="-mx-5" />}
              isEmpty={(list) => list.length === 0}
              empty={
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing booked yet"
                  description="When your clinic books a visit for any of your children, it will show here."
                  action={<Button to="/family/visits/new">Request appointment</Button>}
                />
              }
            >
              {(list) => (
                <ul className="divide-y divide-line">
                  {list.slice(0, 5).map((appt, index) => {
                    const rel = relativeDay(appt.start)
                    const status = appt.displayStatus === 'Requested' ? 'Requested' : rel === 'Today' || rel === 'Tomorrow' ? rel : 'Upcoming'
                    return (
                      <li key={appt.id}>
                        <Link
                          to={`/family/visits?visit=${appt.id}`}
                          className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 transition-colors hover:bg-[#FAFAF8]"
                        >
                          <DateTile date={appt.start} variant={index === 0 ? 'solid' : appt.child.tone === 'coral' ? 'coral' : 'teal'} />
                          <span className="min-w-0 flex-1">
                            <StatusBadge status={status} className="mb-1 sm:hidden" />
                            <span className="block text-[15px] font-semibold text-ink">{appt.title}</span>
                            <span className="block text-[14px] text-slate-600">
                              {appt.child.firstName} · {formatTime(appt.start)}
                              {appt.clinician && ` · ${appt.clinician.name}`} · {appt.facility.name}
                            </span>
                          </span>
                          <span className="hidden sm:block">
                            <StatusBadge status={status} />
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </AsyncContent>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <CardHeader
              title="Care-team messages"
              action={
                <Link to="/family/messages" className={`${linkClass} text-[14px]`}>
                  Open
                </Link>
              }
            />
            <div className="mt-3 border-t border-line">
              <AsyncContent
                state={conversations}
                errorTitle="We couldn’t load messages"
                skeleton={<SkeletonList rows={3} label="Loading messages" className="-mx-5" />}
                isEmpty={(list) => list.length === 0}
                empty={<EmptyState icon={MessageCircle} title="No messages yet" description="Messages from your children’s care team will show here." />}
              >
                {(list) => (
                  <ul className="divide-y divide-line">
                    {list.slice(0, 3).map((c) => {
                      const unread = c.unread > 0
                      const preview = `${c.lastMessage?.from === 'caregiver' ? 'You: ' : ''}${c.lastMessage?.body ?? ''}`
                      return (
                        <li key={c.id}>
                          <Link to={`/family/messages/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-[#FAFAF8]">
                            <Avatar initials={c.clinician.initials} tone={c.clinician.tone} size="md" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[14px] font-semibold text-ink">{c.clinician.name}</span>
                                <span className={cx('shrink-0 text-[12px]', unread ? 'font-semibold text-teal-700' : 'text-muted')}>
                                  {c.lastMessage && formatListTime(c.lastMessage.sentAt)}
                                </span>
                              </span>
                              <span className={cx('block truncate text-[13px]', unread ? 'font-semibold text-ink' : 'text-slate-600')}>{preview}</span>
                            </span>
                            {unread ? <UnreadDot /> : <span className="size-2.5 shrink-0" />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </AsyncContent>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-h2">Quick actions</h2>
            <div className="mt-3 space-y-2.5">
              <Button to="/family/card" variant="secondary" icon={Download} fullWidth className="justify-start">
                Download vaccination card
              </Button>
              <Button to="/family/messages" variant="secondary" icon={MessageCircle} fullWidth className="justify-start">
                Message the clinic
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function OverdueBanner({ child, overdue }) {
  const [first] = overdue
  let detail = 'Ask your clinic to book a catch-up dose.'
  if (first.appointment) {
    const rel = relativeDay(first.appointment.start)
    const when = rel === 'Today' || rel === 'Tomorrow' ? `${rel.toLowerCase()}'s` : `your ${formatDate(first.appointment.start, 'weekday')}`
    detail = `Ask for it at ${when} visit at ${formatTime(first.appointment.start)}.`
  }
  const title =
    overdue.length === 1
      ? `${possessive(child.firstName)} ${first.name} is overdue.`
      : `${child.firstName} has ${overdue.length} overdue doses: ${overdue.map((d) => d.name).join(', ')}.`
  return (
    <Alert tone="coral" title={title} action={<Button to="/family/vaccines" variant="secondary">View vaccines</Button>}>
      {overdue.length === 1 ? `It was due on ${formatDate(first.dueOn, 'short')}. ${detail}` : detail}
    </Alert>
  )
}

function SummaryCards({ child, data }) {
  const { latestMeasurement: latest, nextDose, nextVisit } = data
  const doseRel = nextDose && relativeDay(nextDose.dueOn)
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Card className="flex items-center gap-4 p-5">
        <Avatar initials={child.initials} tone={child.tone} size="xl" />
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold leading-7 text-ink">{child.fullName}</h2>
          <p className="text-[14px] text-slate-600">
            {child.age} · {child.sexLabel} · Born {formatDate(child.dob)}
          </p>
          {latest ? (
            <p className="mt-2 flex flex-wrap gap-x-4 text-[14px] text-slate-600">
              <span>
                <strong className="font-semibold text-ink">{num(latest.weightKg)} kg</strong> weight
              </span>
              <span>
                <strong className="font-semibold text-ink">{num(latest.heightCm)} cm</strong> height
              </span>
            </p>
          ) : (
            <p className="mt-2 text-[14px] text-muted">No measurements yet</p>
          )}
        </div>
      </Card>

      <Card className="relative p-5 transition-shadow hover:shadow-pop">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption uppercase text-muted">Next vaccine</p>
          {nextDose && <StatusBadge status="Planned" />}
        </div>
        {nextDose ? (
          <>
            <h2 className="mt-2 text-[20px] font-bold leading-7 text-ink">
              <Link to={`/family/vaccines/${nextDose.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
                {nextDose.name}
              </Link>
            </h2>
            <p className="mt-1 text-[14px] text-slate-600">
              Due {doseRel === 'Today' || doseRel === 'Tomorrow' ? `${doseRel.toLowerCase()}, ` : ''}
              {formatDate(nextDose.dueOn, doseRel ? 'weekday' : 'medium')}
            </p>
          </>
        ) : (
          <div className="mt-2">
            <p className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              <Syringe className="size-5 text-teal-700" aria-hidden="true" />
              Nothing planned
            </p>
            <p className="mt-1 text-[14px] text-slate-600">{child.firstName} is up to date on the schedule.</p>
          </div>
        )}
      </Card>

      <Card className="relative p-5 transition-shadow hover:shadow-pop">
        <div className="flex items-center justify-between gap-2">
          <p className="text-caption uppercase text-muted">Next visit</p>
          {nextVisit && <StatusBadge status={nextVisit.displayStatus} />}
        </div>
        {nextVisit ? (
          <>
            <h2 className="mt-2 text-[20px] font-bold leading-7 text-ink">
              <Link to={`/family/visits?visit=${nextVisit.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
                {formatDate(nextVisit.start, 'weekday')}, {formatTime(nextVisit.start)}
              </Link>
            </h2>
            <p className="mt-1 text-[14px] text-slate-600">
              {nextVisit.clinician ? `${nextVisit.clinician.name} · ` : ''}
              {nextVisit.facility.shortName}
            </p>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-[16px] font-semibold text-ink">No visit booked</p>
            <Link to="/family/visits/new" className={`${linkClass} relative mt-1 inline-flex min-h-11 items-center text-[14px]`}>
              Request appointment
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
