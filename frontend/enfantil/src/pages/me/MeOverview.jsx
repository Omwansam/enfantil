import { ArrowRight, Baby, CalendarDays, Plus, Syringe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAppointments } from '../../api/appointments'
import { getMeOverview } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card, { CardHeader } from '../../components/Card'
import DangerSigns from '../../components/DangerSigns'
import DateTile from '../../components/DateTile'
import EmptyState from '../../components/EmptyState'
import Skeleton, { SkeletonList } from '../../components/Skeleton'
import { linkClass } from '../../components/fieldStyles'
import { useChildren } from '../../context/ChildContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { cx } from '../../utils/cx'
import { formatDate, formatTime } from '../../utils/dates'
import { formatGALong } from '../../utils/pregnancy'

/** M2 — the mother's own overview, shown on the dashboard when "Me" is selected. */
export default function MeOverview() {
  const version = useDataVersion()
  const state = useAsync(getMeOverview, [], version)
  return (
    <AsyncContent
      state={state}
      errorTitle="We couldn’t load your overview"
      skeleton={
        <div className="space-y-5" role="status" aria-label="Loading your overview">
          <Skeleton className="h-[180px] rounded-2xl" />
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[132px] rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      {(data) => <Content data={data} />}
    </AsyncContent>
  )
}

function Content({ data }) {
  const { status } = data
  return (
    <div className="space-y-5">
      {status.kind === 'pregnant' ? <PregnancyHero data={data} /> : status.kind === 'postnatal' ? <PostnatalHero data={data} /> : <WelcomeHero data={data} />}
      <div className="grid gap-5 md:grid-cols-3">
        <NextVisitCard data={data} />
        <VaccineCard data={data} />
        <VitalsCard data={data} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <UpcomingForMe />
        <div className="space-y-5">
          <DangerSigns signs={data.dangerSigns} />
          <ChildrenCard childrenList={data.children} />
        </div>
      </div>
    </div>
  )
}

function PregnancyHero({ data }) {
  const p = data.pregnancy
  const marker = Math.min(100, p.progress)
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-teal-700 p-6 text-white sm:p-7" aria-labelledby="preg-hero">
      <span aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-teal-800" />
      <p className="text-caption uppercase text-teal-100">My pregnancy</p>
      <h2 id="preg-hero" className="mt-1 text-[30px] font-bold leading-9">
        Week {p.ga.weeks} of 40
      </h2>
      <p className="mt-1 text-[15px] text-teal-50">
        {formatGALong(p.ga)} · Due {formatDate(p.edd, 'weekdayYear')} · {p.daysToGo} days to go
      </p>
      <div className="mt-5 max-w-xl">
        <div className="relative flex h-2.5 gap-1" role="img" aria-label={`${p.progress}% of the way through pregnancy, trimester ${p.trimester}`}>
          {[0, 1, 2].map((t) => (
            <span key={t} className={cx('h-full flex-1 rounded-full', t < p.trimester ? 'bg-white' : 'bg-white/25')} />
          ))}
          <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-teal-700 bg-white" style={{ left: `${marker}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-3 text-[12px] text-teal-50">
          <span>1st trimester</span>
          <span className="text-center">2nd trimester</span>
          <span className="text-right">3rd trimester</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button to="/family/me/pregnancy" variant="white" iconRight={ArrowRight}>
          Open pregnancy tracker
        </Button>
        <Button to="/family/me/antenatal" variant="white" className="bg-white/15 text-white hover:bg-white/25">
          Antenatal schedule
        </Button>
      </div>
    </section>
  )
}

function PostnatalHero({ data }) {
  const pn = data.postnatal
  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-teal-700 p-6 text-white sm:p-7" aria-labelledby="pn-hero">
      <span aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-teal-800" />
      <p className="text-caption uppercase text-teal-100">After birth</p>
      <h2 id="pn-hero" className="mt-1 text-[28px] font-bold leading-9">
        {data.status.label}
      </h2>
      <p className="mt-1 text-[15px] text-teal-50">
        {pn.child ? `${pn.child.firstName} was born` : 'Your baby was born'} {formatDate(pn.delivery.date)} at Tumaini Family Hospital · {pn.delivery.mode.toLowerCase()} · {pn.delivery.babyWeightKg} kg
      </p>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Postnatal checks">
        {pn.visits.map((v) => (
          <li key={v.key} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold">
            <span className={cx('size-2 rounded-full', v.status === 'Completed' ? 'bg-teal-100' : v.status === 'Overdue' ? 'bg-coral-200' : 'bg-white')} aria-hidden="true" />
            {v.label}: {v.status}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button to="/family/me/postnatal" variant="white" iconRight={ArrowRight}>
          Postnatal care
        </Button>
        {pn.child && (
          <Button to="/family/health" variant="white" className="bg-white/15 text-white hover:bg-white/25">
            {pn.child.firstName}’s record
          </Button>
        )}
      </div>
    </section>
  )
}

function WelcomeHero({ data }) {
  return (
    <Card className="p-6">
      <h2 className="text-h2">Your health, in one place</h2>
      <p className="mt-1 text-[15px] text-slate-600">
        Tumaini Family Hospital will add your records at your next visit. Expecting a baby? Book an antenatal visit and your pregnancy tracker will start.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button to="/family/visits/new?for=me" icon={Plus}>
          Book appointment
        </Button>
        <Button to="/family/me" variant="secondary">
          My health record
        </Button>
      </div>
      <span className="sr-only">{data.me.fullName}</span>
    </Card>
  )
}

function NextVisitCard({ data }) {
  const appt = data.nextAppointment
  const contact = data.nextContact
  return (
    <Card className="relative p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption uppercase text-muted">Next visit</p>
        {appt ? <StatusBadge status={appt.displayStatus} /> : contact && <StatusBadge status={contact.status} />}
      </div>
      {appt ? (
        <>
          <h3 className="mt-2 text-[19px] font-bold leading-7 text-ink">
            <Link to={`/family/visits?visit=${appt.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
              {formatDate(appt.start, 'weekday')}, {formatTime(appt.start)}
            </Link>
          </h3>
          <p className="mt-1 text-[14px] text-slate-600">
            {appt.title}
            {appt.clinician && ` · ${appt.clinician.name}`}
          </p>
          {appt.displayStatus === 'Pending' && <p className="mt-1 text-small text-planned">Waiting for the hospital to confirm</p>}
        </>
      ) : contact ? (
        <>
          <h3 className="mt-2 text-[19px] font-bold leading-7 text-ink">
            <Link to="/family/me/antenatal" className="after:absolute after:inset-0 after:rounded-2xl">
              Antenatal visit {contact.n}
            </Link>
          </h3>
          <p className="mt-1 text-[14px] text-slate-600">Around {contact.weeks} weeks · {formatDate(contact.dueOn, 'weekday')}</p>
          <Link to="/family/visits/new?for=me&type=antenatal" className={`${linkClass} relative mt-1 inline-flex min-h-11 items-center text-[14px]`}>
            Book it now
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-[16px] font-semibold text-ink">No visit booked</p>
          <Link to="/family/visits/new?for=me" className={`${linkClass} relative mt-1 inline-flex min-h-11 items-center text-[14px]`}>
            Book appointment
          </Link>
        </>
      )}
    </Card>
  )
}

function VaccineCard({ data }) {
  const v = data.vaccineDue
  return (
    <Card className="relative p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption uppercase text-muted">My vaccines</p>
        {v && <StatusBadge status={v.status} />}
      </div>
      {v ? (
        <>
          <h3 className="mt-2 text-[19px] font-bold leading-7 text-ink">
            <Link to="/family/me/vaccines" className="after:absolute after:inset-0 after:rounded-2xl">
              {v.name} (tetanus-diphtheria)
            </Link>
          </h3>
          <p className="mt-1 text-[14px] text-slate-600">
            {v.dueOn ? `Due ${formatDate(v.dueOn, 'weekday')}` : v.canGiveNow ? 'Can be given now — ask at any visit' : `From ${formatDate(v.earliestOn)}`}
          </p>
        </>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-[16px] font-semibold text-ink">
          <Syringe className="size-5 text-teal-700" aria-hidden="true" />
          All done for now
        </p>
      )}
    </Card>
  )
}

function VitalsCard({ data }) {
  const v = data.vitals
  const visits = data.pregnancy?.ancVisits ?? []
  const gain = data.status.kind === 'pregnant' && v && visits.length ? Math.round((v.weightKg - visits[0].weightKg) * 10) / 10 : null
  return (
    <Card className="relative p-5 transition-shadow hover:shadow-pop">
      <p className="text-caption uppercase text-muted">Latest checks</p>
      {v ? (
        <>
          <dl className="mt-2 flex gap-6">
            <div>
              <dt className="text-small text-slate-600">Blood pressure</dt>
              <dd className="text-[20px] font-bold leading-7 text-ink">{v.bp}</dd>
            </div>
            <div>
              <dt className="text-small text-slate-600">Weight</dt>
              <dd className="text-[20px] font-bold leading-7 text-ink">{v.weightKg} kg</dd>
            </div>
          </dl>
          <p className="mt-1 text-[13px] text-slate-600">
            {gain !== null && `+${gain} kg since your first visit · `}
            {v.where}, {formatDate(v.date, 'short')}
          </p>
          {data.status.kind === 'pregnant' && (
            <Link to="/family/me/progress" className="after:absolute after:inset-0 after:rounded-2xl">
              <span className="sr-only">See your progress charts</span>
            </Link>
          )}
        </>
      ) : (
        <p className="mt-2 text-[14px] text-slate-600">Your blood pressure and weight appear here after your first visit.</p>
      )}
    </Card>
  )
}

function UpcomingForMe() {
  const version = useDataVersion()
  const state = useAsync(() => getAppointments({ when: 'upcoming', childId: 'me' }), [], version)
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Coming up for you"
        action={
          <Button to="/family/visits/new?for=me" size="sm" variant="secondary" icon={Plus}>
            Book
          </Button>
        }
      />
      <div className="mt-4 border-t border-line">
        <AsyncContent
          state={state}
          errorTitle="We couldn’t load your visits"
          skeleton={<SkeletonList rows={2} label="Loading visits" className="-mx-5" />}
          isEmpty={(list) => list.length === 0}
          empty={<EmptyState icon={CalendarDays} title="Nothing booked for you" description="Antenatal and postnatal visits you book appear here." />}
        >
          {(list) => (
            <ul className="divide-y divide-line">
              {list.map((appt, index) => (
                <li key={appt.id}>
                  <Link to={`/family/visits?visit=${appt.id}`} className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3.5 hover:bg-[#FAFAF8]">
                    <DateTile date={appt.proposal?.start ?? appt.start} variant={index === 0 ? 'solid' : 'teal'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-ink">{appt.title}</span>
                      <span className="block text-[14px] text-slate-600">
                        {formatTime(appt.start)}
                        {appt.clinician ? ` · ${appt.clinician.name}` : ' · Any available doctor'}
                      </span>
                    </span>
                    <StatusBadge status={appt.displayStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AsyncContent>
      </div>
    </Card>
  )
}

function ChildrenCard({ childrenList }) {
  const { selectChild } = useChildren()
  return (
    <Card className="p-5">
      <CardHeader title="Your children" />
      {childrenList.length ? (
        <ul className="mt-3 space-y-2">
          {childrenList.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectChild(c.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:border-teal-700 hover:bg-teal-50"
              >
                <Avatar initials={c.initials} tone={c.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{c.fullName}</span>
                  <span className="block text-small text-slate-600">{c.age}</span>
                </span>
                <Baby className="size-4 text-teal-700" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-slate-600">After your baby is born, the hospital links their record here.</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-[14px]">
        <Link to="/family/children/new" className={`${linkClass} inline-flex min-h-11 items-center gap-1`}>
          <Plus className="size-4" aria-hidden="true" /> Add child
        </Link>
      </div>
    </Card>
  )
}
