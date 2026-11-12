import { ArrowRight, Baby, CalendarDays, HeartPulse, Ruler, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPregnancy } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card, { CardHeader } from '../../components/Card'
import DangerSigns from '../../components/DangerSigns'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import RequireMe from '../../components/RequireMe'
import Skeleton, { SkeletonCard } from '../../components/Skeleton'
import { linkClass } from '../../components/fieldStyles'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime } from '../../utils/dates'
import { formatGALong } from '../../utils/pregnancy'

/** M4 — pregnancy tracker. */
export default function Pregnancy() {
  useDocumentTitle('My pregnancy')
  return <RequireMe>{() => <Tracker />}</RequireMe>
}

function Tracker() {
  const version = useDataVersion()
  const state = useAsync(getPregnancy, [], version)
  return (
    <>
      <PageHeader
        title="My pregnancy"
        subtitle={state.data ? `Due ${formatDate(state.data.edd, 'weekdayYear')} · Tumaini Family Hospital` : 'Tumaini Family Hospital'}
        actions={
          <Button to="/family/visits/new?for=me&type=antenatal" icon={CalendarDays}>
            Book antenatal visit
          </Button>
        }
      />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your pregnancy"
        skeleton={
          <div className="space-y-5">
            <Skeleton className="h-[190px] rounded-2xl" />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={5} />
            </div>
          </div>
        }
        isEmpty={(d) => !d}
        empty={
          <Card>
            <EmptyState
              icon={Baby}
              title="You’re not tracking a pregnancy"
              description="Expecting a baby? Book an antenatal visit — once the hospital confirms your due date, your week-by-week tracker starts here."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Button to="/family/visits/new?for=me&type=antenatal">Book antenatal visit</Button>
                  <Button to="/family/me/postnatal" variant="secondary">
                    Postnatal care
                  </Button>
                </div>
              }
            />
          </Card>
        }
      >
        {(p) => <TrackerContent p={p} />}
      </AsyncContent>
    </>
  )
}

function TrackerContent({ p }) {
  const next = p.nextContact
  const last = p.lastVisit
  return (
    <div className="space-y-5">
      <section className="relative isolate overflow-hidden rounded-2xl bg-teal-700 p-6 text-white sm:p-7" aria-labelledby="week-heading">
        <span aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-teal-800" />
        <p className="text-caption uppercase text-teal-100">Trimester {p.trimester} of 3</p>
        <h2 id="week-heading" className="mt-1 text-[34px] font-bold leading-10">
          Week {p.ga.weeks} of 40
        </h2>
        <p className="mt-1 text-[15px] text-teal-50">
          {formatGALong(p.ga)} pregnant · {p.daysToGo} days to go
        </p>
        <div className="mt-5">
          <div className="relative grid h-3 grid-cols-[14fr_14fr_12fr] gap-1" role="img" aria-label={`${p.progress}% of the way to your due date`}>
            {[1, 2, 3].map((t) => (
              <span key={t} className={cx('rounded-full', t < p.trimester ? 'bg-white' : t === p.trimester ? 'bg-white/60' : 'bg-white/20')} />
            ))}
            <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-teal-700 bg-white shadow" style={{ left: `${p.progress}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-[14fr_14fr_12fr] text-[12px] text-teal-50">
            <span>1st · weeks 1–13</span>
            <span>2nd · weeks 14–27</span>
            <span>3rd · weeks 28–40</span>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
              <Baby className="size-10" aria-hidden="true" />
            </span>
            <div>
              <p className="text-caption uppercase text-muted">Your baby this week</p>
              <h2 className="mt-1 text-[20px] font-bold leading-7 text-ink">About the size of {p.size.size}</h2>
              <p className="text-[15px] text-slate-600">
                {p.size.length}
                {p.size.weight && ` and ${p.size.weight}`}
              </p>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <CardHeader title={`Week ${p.ga.weeks}: what to do`} />
            <p className="mt-2 text-[15px] leading-7 text-slate-600">{p.guidance}</p>
          </Card>

          {last && (
            <Card className="p-5 sm:p-6">
              <CardHeader
                title="Your last check"
                subtitle={`Antenatal visit ${last.contact} · ${formatDate(last.date, 'weekdayYear')} · ${last.ga} weeks`}
                action={
                  <Link to={`/family/me/antenatal/${last.id}`} className={`${linkClass} inline-flex min-h-11 items-center text-[14px]`}>
                    Visit details
                  </Link>
                }
              />
              <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  [HeartPulse, 'Blood pressure', `${last.bpSystolic}/${last.bpDiastolic}`],
                  [Scale, 'Weight', `${last.weightKg} kg`],
                  [Ruler, 'Fundal height', last.fundalHeightCm ? `${last.fundalHeightCm} cm` : '—'],
                  [Baby, 'Baby’s heartbeat', last.fetalHeartRate ? `${last.fetalHeartRate} bpm` : '—'],
                ].map(([Icon, label, value]) => (
                  <div key={label} className="rounded-xl bg-page p-3.5">
                    <dt className="flex items-center gap-1.5 text-small text-slate-600">
                      <Icon className="size-4 text-teal-700" aria-hidden="true" />
                      {label}
                    </dt>
                    <dd className="mt-1 text-[18px] font-bold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/family/me/progress" className={`${linkClass} mt-3 inline-flex min-h-11 items-center gap-1 text-[14px]`}>
                See weight and blood pressure charts <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <DangerSigns signs={p.dangerSigns} />

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption uppercase text-muted">Next antenatal visit</p>
              {next && <StatusBadge status={next.appointment ? next.appointment.displayStatus : next.status} />}
            </div>
            {next ? (
              <>
                <h2 className="mt-2 text-[19px] font-bold leading-7 text-ink">
                  {next.appointment ? `${formatDate(next.appointment.start, 'weekday')}, ${formatTime(next.appointment.start)}` : `Around ${formatDate(next.dueOn, 'weekday')}`}
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  Visit {next.n} · {next.weeks} weeks{next.appointment?.clinician && ` · ${next.appointment.clinician.name}`}
                </p>
                {!next.appointment && (
                  <Button to="/family/visits/new?for=me&type=antenatal" size="sm" className="mt-3">
                    Book this visit
                  </Button>
                )}
              </>
            ) : (
              <p className="mt-2 text-[14px] text-slate-600">All 8 antenatal visits are done.</p>
            )}
            <Link to="/family/me/antenatal" className={`${linkClass} mt-2 inline-flex min-h-11 items-center text-[14px]`}>
              Full antenatal schedule
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="text-h2">Pregnancy details</h2>
            <dl className="mt-2 divide-y divide-line text-[14px]">
              {[
                ['Last period started', formatDate(p.lmp)],
                ['Due date', formatDate(p.edd)],
                ['Pregnancies (gravida)', p.gravida ?? 'Confirmed at your first visit'],
                ['Births so far (para)', p.para ?? 'Confirmed at your first visit'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2">
                  <dt className="text-slate-600">{label}</dt>
                  <dd className="text-right font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  )
}
