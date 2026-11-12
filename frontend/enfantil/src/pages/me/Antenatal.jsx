import { Check, ChevronDown, HeartPulse, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAncSchedule } from '../../api/maternal'
import Alert from '../../components/Alert'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import ProgressBar from '../../components/ProgressBar'
import RequireMe from '../../components/RequireMe'
import { SkeletonCard, SkeletonList } from '../../components/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime } from '../../utils/dates'

/** M5 — the 8 antenatal contacts with status and what is checked at each. */
export default function Antenatal() {
  useDocumentTitle('Antenatal care')
  return <RequireMe>{() => <Schedule />}</RequireMe>
}

function Schedule() {
  const version = useDataVersion()
  const state = useAsync(getAncSchedule, [], version)
  const done = state.data?.contacts.filter((c) => c.status === 'Completed').length ?? 0
  return (
    <>
      <PageHeader
        title="Antenatal care"
        subtitle={state.data ? `8 visits recommended · ${done} done` : 'Your pregnancy check-ups'}
        actions={
          !state.data?.pregnancy.delivered && (
            <Button to="/family/visits/new?for=me&type=antenatal" icon={Plus}>
              Book antenatal visit
            </Button>
          )
        }
      />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your antenatal schedule"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="p-2">
              <SkeletonList rows={6} label="Loading antenatal visits" />
            </Card>
            <SkeletonCard lines={3} />
          </div>
        }
        isEmpty={(d) => !d}
        empty={
          <Card>
            <EmptyState
              icon={HeartPulse}
              title="No pregnancy on record"
              description="When you are pregnant, your 8 antenatal visits and what is checked at each appear here."
              action={<Button to="/family/visits/new?for=me&type=antenatal">Book antenatal visit</Button>}
            />
          </Card>
        }
      >
        {(data) => (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {data.pregnancy.delivered && (
                <Alert tone="info" className="mb-5">
                  These are the antenatal visits from your last pregnancy. Your baby was born at {data.pregnancy.ga.weeks}+{data.pregnancy.ga.days} weeks, so visit 8 was not needed.
                </Alert>
              )}
              <Card className="p-5 sm:p-6">
                <ol className="relative" aria-label="Antenatal visits">
                  {data.contacts.map((c, i) => (
                    <ContactRow key={c.n} c={c} last={i === data.contacts.length - 1} />
                  ))}
                </ol>
              </Card>
            </div>
            <aside className="space-y-5">
              <Card className="p-5">
                <p className="text-caption uppercase text-muted">Progress</p>
                <p className="mt-1 text-[22px] font-bold text-ink">{done} of 8 visits</p>
                <ProgressBar value={done} max={8} label="Antenatal visits done" className="mt-3" />
                {!data.pregnancy.delivered && (
                  <p className="mt-3 text-[14px] text-slate-600">
                    You are {data.pregnancy.ga.weeks} weeks pregnant. Due {formatDate(data.pregnancy.edd)}.
                  </p>
                )}
              </Card>
              <Card className="p-5">
                <h2 className="text-h2">Why 8 visits?</h2>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">
                  Regular checks find problems such as high blood pressure, anaemia or diabetes early, when they are easiest to treat. Bring your MCH handbook to every visit.
                </p>
              </Card>
            </aside>
          </div>
        )}
      </AsyncContent>
    </>
  )
}

function ContactRow({ c, last }) {
  const [open, setOpen] = useState(c.status === 'Upcoming' && !c.visit)
  const completed = c.status === 'Completed'
  const overdue = c.status === 'Overdue'
  const notNeeded = c.status === 'Not needed'
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span aria-hidden="true" className="absolute left-[17px] top-10 h-[calc(100%-36px)] w-0.5 bg-line" />}
      <span
        aria-hidden="true"
        className={cx(
          'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold',
          completed && 'bg-teal-700 text-white',
          overdue && 'border-[1.5px] border-coral-700 bg-coral-50 text-coral-700',
          c.status === 'Upcoming' && 'border-[1.5px] border-teal-700 bg-white text-teal-700',
          notNeeded && 'bg-[#F1F0EC] text-muted',
        )}
      >
        {completed ? <Check className="size-4" /> : c.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-semibold text-ink">
            Visit {c.n} · {c.weeks} weeks <span className="font-normal text-slate-600">— {c.title}</span>
          </h3>
          <StatusBadge status={c.status} />
        </div>
        <p className={cx('mt-0.5 text-[14px]', overdue ? 'font-medium text-coral-700' : 'text-slate-600')}>
          {completed
            ? `${formatDate(c.visit.date, 'weekdayYear')} · ${c.visit.clinician.name}`
            : overdue
              ? `Was due around ${formatDate(c.dueOn)} — book it as soon as you can`
              : notNeeded
                ? 'Baby arrived before this visit'
                : `Around ${formatDate(c.dueOn, 'weekdayYear')}`}
        </p>
        {completed && (
          <p className="mt-1 text-[14px] text-ink">
            BP {c.visit.bpSystolic}/{c.visit.bpDiastolic} · {c.visit.weightKg} kg
            {c.visit.fetalHeartRate && ` · baby’s heartbeat ${c.visit.fetalHeartRate}`}
          </p>
        )}
        {c.appointment && (
          <Link to={`/family/visits?visit=${c.appointment.id}`} className="mt-1 inline-flex min-h-9 items-center text-[13px] font-semibold text-teal-700 hover:underline">
            {c.appointment.displayStatus === 'Pending' ? 'Requested' : 'Booked'}: {formatDate(c.appointment.start, 'weekday')}, {formatTime(c.appointment.start)}
            {c.appointment.clinician && ` with ${c.appointment.clinician.name}`} →
          </Link>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          {completed && (
            <Link to={`/family/me/antenatal/${c.visit.id}`} className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline">
              Open visit<span className="sr-only"> {c.n}</span> →
            </Link>
          )}
          {!completed && !notNeeded && !c.appointment && (
            <Link to="/family/visits/new?for=me&type=antenatal" className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline">
              Book this visit
            </Link>
          )}
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-10 items-center gap-1 text-[14px] font-medium text-slate-600 hover:text-ink"
          >
            What’s checked
            <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
        {open && (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[14px] text-slate-600">
            {c.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
