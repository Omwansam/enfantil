import { CalendarDays, ChevronRight, FileText, MessageCircle, Plus, Syringe, TriangleAlert, Users } from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboard } from '../../api/dashboard'
import { searchPatients } from '../../api/patients'
import { getNotesQueue } from '../../api/visitNotes'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DataTable, { Td, Th } from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import SearchInput from '../../components/SearchInput'
import Skeleton, { SkeletonList, SkeletonTable } from '../../components/Skeleton'
import StatCard from '../../components/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, greeting, TODAY } from '../../utils/dates'
import { pluralize } from '../../utils/format'

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const version = useDataVersion()
  const state = useAsync(() => getDashboard(user.id), [user.id], version)
  // Started alongside the dashboard request so both cards fill in together.
  const notes = useAsync(() => getNotesQueue(user.id), [user.id], version)
  const [recordOpen, setRecordOpen] = useState(false)

  return (
    <>
      <div className="mb-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PatientSearch />
        <p className="text-[14px] text-slate-600">{formatDate(TODAY, 'long')}</p>
      </div>

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-ink">
            {greeting(TODAY)}, {user.shortName}
          </h1>
          <p className="mt-0.5 text-[15px] text-slate-600">
            {state.data ? (
              state.data.next ? (
                <>
                  You have {pluralize(state.data.remaining, 'more child', 'more children')} to see today. Next: {state.data.next.patient.fullName} at{' '}
                  {state.data.next.time}.
                </>
              ) : (
                'No more children booked for today.'
              )
            ) : (
              <Skeleton className="mt-1 h-4 w-80" />
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setRecordOpen(true)}>
            Record immunization
          </Button>
          <Button icon={Plus} to="/clinic/appointments/new">
            Book appointment
          </Button>
        </div>
      </div>

      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your dashboard"
        skeleton={
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[118px] rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="p-5">
                <SkeletonTable rows={7} cols={5} label="Loading today’s schedule" />
              </Card>
              <Card className="p-2">
                <SkeletonList rows={3} label="Loading visit notes" />
              </Card>
            </div>
          </div>
        }
      >
        {(data) => <DashboardContent data={data} notes={notes} />}
      </AsyncContent>

      <RecordPicker open={recordOpen} onClose={() => setRecordOpen(false)} today={state.data?.today ?? []} />
    </>
  )
}

function DashboardContent({ data, notes }) {
  const { stats } = data
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Authorised patients"
          value={stats.authorised}
          note={`${stats.addedThisWeek} added this week`}
          icon={Users}
          iconTone="teal"
          to="/clinic/patients"
        />
        <StatCard
          label="Today’s appointments"
          value={stats.todayTotal}
          note={`${stats.todayCompleted} completed · ${stats.todayCancelled} cancelled`}
          icon={CalendarDays}
          iconTone="blue"
          to="/clinic/appointments"
        />
        <StatCard
          label="Unread conversations"
          value={stats.unreadConversations}
          note={stats.unreadConversations ? `Oldest waiting ${stats.oldestWaitingHours} h` : 'All caught up'}
          noteTone={stats.unreadConversations ? 'alert' : 'muted'}
          icon={MessageCircle}
          iconTone="coral"
          to="/clinic/messages"
        />
        <StatCard
          label="Unfinished visit notes"
          value={stats.unfinishedNotes}
          note={stats.unfinishedNotes ? `${stats.notesFromLastWeek} from last week` : 'All signed'}
          icon={FileText}
          iconTone="amber"
          to="/clinic/visits"
        />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <TodaySchedule today={data.today} nextId={data.next?.id} />
        <PendingNotes state={notes} overdueToday={data.overdueToday} />
      </div>
    </>
  )
}

function TodaySchedule({ today, nextId }) {
  const navigate = useNavigate()
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-h2">Today&apos;s schedule</h2>
        <Link to="/clinic/appointments" className="-my-2 inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline">
          Open full schedule
        </Link>
      </div>
      {today.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments today"
          description="Book a visit and it will appear here."
          action={<Button to="/clinic/appointments/new">Book appointment</Button>}
        />
      ) : (
        <DataTable caption="Today’s schedule" minWidth={640}>
          <thead>
            <tr>
              <Th>Time</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th>Room</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {today.map((a) => {
              const isNext = a.id === nextId
              const cancelled = a.status === 'cancelled'
              return (
                <tr
                  key={a.id}
                  onClick={() => navigate(`/clinic/patients/${a.patientId}`)}
                  className={cx('cursor-pointer transition-colors', isNext ? 'bg-teal-50' : 'hover:bg-[#FAF9F7]')}
                >
                  <Td className={cx('text-[15px] font-bold tabular-nums', isNext ? 'text-teal-700' : cancelled ? 'text-slate-600' : 'text-ink')}>
                    {a.time}
                    {isNext && <span className="sr-only"> (next patient)</span>}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={a.patient.initials} tone={a.patient.tone} size="sm" />
                      <div className="min-w-0">
                        <Link
                          to={`/clinic/patients/${a.patientId}`}
                          onClick={(e) => e.stopPropagation()}
                          className={cx('block text-[14px] font-semibold leading-5 hover:underline', cancelled ? 'text-slate-600' : 'text-ink')}
                        >
                          {a.patient.fullName}
                        </Link>
                        <span className="text-[12px] text-muted">{a.patient.age}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className={cx('max-w-[180px]', cancelled ? 'text-slate-600' : 'text-slate-600')}>{a.reason}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{a.room}</Td>
                  <Td>
                    <StatusBadge status={a.displayStatus} />
                  </Td>
                  <Td className="w-10">
                    <ChevronRight className="size-5 text-slate-600" aria-hidden="true" />
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </Card>
  )
}

function PendingNotes({ state, overdueToday }) {
  const notes = state.data ?? []
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 px-1 pb-3">
        <h2 className="text-h2">Pending visit notes</h2>
        {state.data && <Badge tone={notes.length ? 'overdue' : 'completed'}>{notes.length ? `${notes.length} open` : 'All signed'}</Badge>}
      </div>
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your notes"
        skeleton={<SkeletonList rows={3} label="Loading visit notes" />}
        isEmpty={(d) => d.length === 0}
        empty={<p className="border-t border-line px-1 py-4 text-[14px] text-slate-600">Every visit note is signed. Nice work.</p>}
      >
        {(list) => (
          <ul className="divide-y divide-line border-t border-line">
            {list.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-1 py-3">
                <Avatar initials={n.patient.initials} tone={n.patient.tone} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{n.patient.fullName}</p>
                  <p className={cx('text-[12px]', n.daysOld > 0 ? 'font-semibold text-coral-700' : 'text-slate-600')}>
                    {n.reason} · {n.when}
                    {n.daysOld > 0 && ` · ${pluralize(n.daysOld, 'day')}`}
                  </p>
                </div>
                <Button variant="secondary" size="xs" to={`/clinic/visits/${n.id}/note`} aria-label={`Finish visit note for ${n.patient.fullName}`}>
                  Finish
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>

      {overdueToday.length > 0 && (
        <div className="mt-3 flex gap-2.5 rounded-xl bg-coral-50 px-3.5 py-3 text-[13px] leading-5 text-ink">
          <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-coral-700" aria-hidden="true" />
          <p>
            <strong className="font-semibold text-coral-700">
              {pluralize(overdueToday.length, 'patient')} today {overdueToday.length === 1 ? 'has' : 'have'} overdue doses.
            </strong>{' '}
            {overdueToday.map((o, i) => (
              <Fragment key={o.patientId}>
                {i > 0 && (i === overdueToday.length - 1 ? ' and ' : ', ')}
                <Link to={`/clinic/patients/${o.patientId}`} className="font-medium underline-offset-2 hover:underline">
                  {o.name}
                </Link>{' '}
                ({o.dose})
              </Fragment>
            ))}
            .
          </p>
        </div>
      )}
    </Card>
  )
}

/** Search box with live results; Enter opens the full patient list. */
function PatientSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebouncedValue(q, 200)
  const listId = useId()
  const wrapper = useRef(null)
  const state = useAsync(() => searchPatients(debounced), [debounced])
  const results = debounced.trim() ? (state.data ?? []) : []

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!wrapper.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const showList = open && q.trim().length > 0

  return (
    <form
      ref={wrapper}
      className="relative w-full sm:max-w-[360px]"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/clinic/patients?q=${encodeURIComponent(q.trim())}`)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <SearchInput
        value={q}
        onChange={(v) => {
          setQ(v)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        label="Search patients"
        placeholder="Search patients by name, ID or caregiver phone"
        aria-expanded={showList}
        aria-controls={listId}
        autoComplete="off"
      />
      {showList && (
        <div id={listId} className="animate-fade-in absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-white shadow-pop">
          {state.loading && results.length === 0 ? (
            <SkeletonList rows={2} label="Searching" />
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-[14px] text-slate-600" role="status">
              No authorised patients match “{q.trim()}”.
            </p>
          ) : (
            <ul aria-label="Matching patients">
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={`/clinic/patients/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F6F3]" onClick={() => setOpen(false)}>
                    <Avatar initials={p.initials} tone={p.tone} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{p.fullName}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {p.ageShort} · <span className="font-mono">{p.patientId}</span> · {p.caregiverName}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-line">
                <button type="submit" className="flex min-h-11 w-full items-center px-4 text-left text-[14px] font-semibold text-teal-700 hover:bg-teal-50">
                  See all results in Patients
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </form>
  )
}

/** "Record immunization": pick one of today's patients with doses due, or search for another. */
function RecordPicker({ open, onClose, today }) {
  const due = today.filter((a) => a.status === 'upcoming' && a.doseKeys.length > 0)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record immunization"
      description="Choose the child. Patients booked today with doses due are listed first."
      size="sm"
    >
      {due.length > 0 ? (
        <ul className="-mx-2 divide-y divide-line">
          {due.map((a) => (
            <li key={a.id}>
              <Link to={`/clinic/patients/${a.patientId}/immunizations/new`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-[#F7F6F3]">
                <Avatar initials={a.patient.initials} tone={a.patient.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{a.patient.fullName}</span>
                  <span className="block text-[12px] text-slate-600">
                    {a.time} · {a.reason}
                  </span>
                </span>
                <Syringe className="size-4 text-teal-700" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-slate-600">No one booked today has doses due.</p>
      )}
      <div className="mt-5 flex justify-end">
        <Button variant="neutral" to="/clinic/patients">
          Find another patient
        </Button>
      </div>
    </Modal>
  )
}
