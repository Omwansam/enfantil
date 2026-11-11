import { ArrowLeft, CalendarDays, CalendarPlus, Clock, MapPin, MessageCircle, Plus, Repeat } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cancelAppointmentRequest, getAppointments } from '../api/appointments'
import { openConversationWith } from '../api/messages'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import DateTile from '../components/DateTile'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'
import Tabs, { TabPanel } from '../components/Tabs'
import { useChildren } from '../context/ChildContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { downloadAppointmentIcs } from '../utils/calendar'
import { cx } from '../utils/cx'
import { formatDate, formatTime } from '../utils/dates'
import { joinNames } from '../utils/format'

const TIME_OF_DAY = { morning: 'Morning', afternoon: 'Afternoon', any: 'Any time' }

export default function Visits() {
  useDocumentTitle('Visits')
  const version = useDataVersion()
  const { childList } = useChildren()
  const [params, setParams] = useSearchParams()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const state = useAsync(() => getAppointments({ when: 'all' }), [], version)

  const all = state.data ?? []
  const upcoming = all.filter((a) => a.upcoming)
  const past = all.filter((a) => !a.upcoming).reverse()
  const visitId = params.get('visit')
  const linked = all.find((a) => a.id === visitId)
  const tab = params.get('tab') ?? (linked && !linked.upcoming ? 'past' : 'upcoming')
  const list = tab === 'past' ? past : upcoming
  const selected = list.find((a) => a.id === visitId) ?? (isDesktop ? list[0] : null)

  const setTab = (value) => setParams({ tab: value }, { replace: true })
  const select = (id) => setParams({ tab, visit: id }, { replace: isDesktop })

  const showList = isDesktop || !selected
  const showDetail = Boolean(selected)

  return (
    <>
      <PageHeader
        title="Appointments & visits"
        subtitle={childList.length ? `For ${joinNames(childList.map((c) => c.firstName))}` : undefined}
        actions={
          <>
            <Button to="/family/visits/new" icon={Plus}>
              Request appointment
            </Button>
            <Tabs
              variant="pill"
              label="Visits"
              idPrefix="visits"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'upcoming', label: `Upcoming · ${state.data ? upcoming.length : '–'}` },
                { value: 'past', label: `Past · ${state.data ? past.length : '–'}` },
              ]}
            />
          </>
        }
      />

      <TabPanel idPrefix="visits" value={tab}>
        <AsyncContent
          state={state}
          errorTitle="We couldn’t load visits"
          skeleton={
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              <Card>
                <SkeletonList rows={3} label="Loading visits" />
              </Card>
              <SkeletonCard lines={5} className="hidden lg:block" />
            </div>
          }
          isEmpty={() => list.length === 0}
          empty={
            <Card>
              {tab === 'upcoming' ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming visits"
                  description="When your clinic books a visit, or you request one, it will appear here."
                  action={<Button to="/family/visits/new" icon={Plus}>Request appointment</Button>}
                />
              ) : (
                <EmptyState icon={CalendarDays} title="No past visits yet" description="Completed and cancelled visits will be listed here." />
              )}
            </Card>
          }
        >
          {() => (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              {showList && (
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line" aria-label={tab === 'past' ? 'Past visits' : 'Upcoming visits'}>
                    {list.map((appt) => {
                      const active = selected?.id === appt.id
                      return (
                        <li key={appt.id}>
                          <button
                            type="button"
                            aria-current={active ? 'true' : undefined}
                            onClick={() => select(appt.id)}
                            className={cx(
                              'flex w-full items-center gap-4 px-4 py-4 text-left transition-colors',
                              active ? 'bg-teal-50 shadow-[inset_4px_0_0_#0F766E]' : 'hover:bg-[#FAFAF8]',
                            )}
                          >
                            <DateTile date={appt.start} variant={active ? 'solid' : 'neutral'} />
                            <span className="min-w-0 flex-1">
                              <StatusBadge status={appt.displayStatus} className="mb-1 sm:hidden" />
                              <span className="block text-[15px] font-semibold leading-6 text-ink">{appt.title}</span>
                              <span className="block text-[14px] text-slate-600">
                                {appt.child.firstName} · {appt.status === 'requested' ? TIME_OF_DAY[appt.timeOfDay] : formatTime(appt.start)}
                                {appt.clinician ? ` · ${appt.clinician.name}` : ` · ${appt.facility.shortName}`}
                              </span>
                            </span>
                            <span className="hidden sm:block">
                              <StatusBadge status={appt.displayStatus} />
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              )}
              {showDetail && (
                <div>
                  {!isDesktop && (
                    <Button variant="ghost" icon={ArrowLeft} className="-ml-3 mb-2" onClick={() => setParams({ tab })}>
                      All {tab === 'past' ? 'past' : 'upcoming'} visits
                    </Button>
                  )}
                  <VisitDetail key={selected.id} appt={selected} />
                </div>
              )}
            </div>
          )}
        </AsyncContent>
      </TabPanel>
    </>
  )
}

function VisitDetail({ appt }) {
  const navigate = useNavigate()
  const [messaging, setMessaging] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const requested = appt.status === 'requested'
  const isUpcoming = appt.displayStatus === 'Upcoming'

  const message = async () => {
    setMessaging(true)
    setError('')
    try {
      const { id } = await openConversationWith({ clinicianId: appt.clinicianId ?? 'kl4-reception', childId: appt.childId })
      navigate(`/family/messages/${id}`)
    } catch (err) {
      setError(err.message)
      setMessaging(false)
    }
  }

  const cancelRequest = async () => {
    setCancelling(true)
    try {
      await cancelAppointmentRequest(appt.id)
      setConfirmCancel(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="visit-heading">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={appt.displayStatus} />
        <span className="font-mono text-[13px] text-muted">{appt.ref}</span>
      </div>
      <h2 id="visit-heading" className="mt-3 text-[22px] font-bold leading-8 text-ink sm:text-[24px]">
        {requested
          ? `Preferred ${formatDate(appt.start, 'weekdayYear')} · ${TIME_OF_DAY[appt.timeOfDay]}`
          : `${formatDate(appt.start, 'weekdayYear')} · ${formatTime(appt.start, { twelveHour: true })}`}
      </h2>
      <p className="mt-0.5 text-[15px] text-slate-600">
        {appt.title} · {appt.child.firstName}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl bg-page p-3.5">
          {appt.clinician ? (
            <>
              <Avatar initials={appt.clinician.initials} tone={appt.clinician.tone} size="md" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{appt.clinician.name}</p>
                <p className="text-small text-slate-600">{appt.clinician.role}</p>
              </div>
            </>
          ) : (
            <>
              <span className="flex size-10 items-center justify-center rounded-full bg-white text-slate-600">
                <Clock className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">Any available clinician</p>
                <p className="text-small text-slate-600">The clinic will assign one</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-page p-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-coral-700">
            <MapPin className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink">{appt.facility.name}</p>
            <p className="text-small text-slate-600">{appt.location ?? 'Room confirmed by SMS'}</p>
          </div>
        </div>
      </div>

      {requested && (
        <Alert tone="info" className="mt-4">
          Waiting for {appt.facility.shortName} to confirm. You’ll get an SMS with the exact time, usually within one working day.
        </Alert>
      )}
      {appt.note && (
        <p className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-[14px] text-slate-600">
          <strong className="font-semibold text-teal-800">{requested ? 'Your note:' : 'Note from your clinic:'}</strong> {appt.note}
        </p>
      )}
      {appt.summary && (
        <p className="mt-4 rounded-xl bg-page px-4 py-3 text-[14px] text-slate-600">
          <strong className="font-semibold text-ink">Visit summary:</strong> {appt.summary}
        </p>
      )}
      {appt.doses?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-[14px] font-semibold text-ink">{isUpcoming ? 'Doses planned at this visit' : 'Doses at this visit'}</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {appt.doses.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/family/vaccines/${d.id}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-teal-700 hover:text-teal-800"
                >
                  {d.name}
                  <StatusBadge status={d.status} className="-mr-1.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <Alert tone="coral" role="alert" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-5 border-t border-line pt-5">
        {isUpcoming && (
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={CalendarPlus} onClick={() => downloadAppointmentIcs(appt)}>
              Add to calendar
            </Button>
            <Button variant="secondary" icon={Repeat} to={`/family/visits/new?child=${appt.childId}&reschedule=${appt.id}`}>
              Request a different time
            </Button>
          </div>
        )}
        <div className={cx('flex flex-wrap gap-3', isUpcoming && 'mt-3')}>
          {requested && (
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancel request
            </Button>
          )}
          {!isUpcoming && !requested && (
            <Button variant="secondary" icon={Plus} to={`/family/visits/new?child=${appt.childId}&reason=followup`}>
              Book a follow-up
            </Button>
          )}
          <Button icon={MessageCircle} onClick={message} loading={messaging}>
            Message {appt.clinician ? appt.clinician.shortName : appt.facility.shortName}
          </Button>
        </div>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel this request?"
        description={`${appt.facility.name} will not book this visit. You can send a new request at any time.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep request
            </Button>
            <Button variant="dangerSolid" loading={cancelling} onClick={cancelRequest}>
              Cancel request
            </Button>
          </>
        }
      />
    </Card>
  )
}
