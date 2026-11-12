import { Baby, CalendarDays, Droplets, HeartPulse, Pill, Ruler, Scale, Syringe, TestTube } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { getAncVisit } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge, { StatusBadge } from '../../components/Badge'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import RequireMe from '../../components/RequireMe'
import { SkeletonCard } from '../../components/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime } from '../../utils/dates'
import { isHighBp } from '../../utils/pregnancy'

/** M6 — one antenatal visit, as the mother sees it. */
export default function AntenatalVisit() {
  const { visitId } = useParams()
  useDocumentTitle('Antenatal visit')
  return <RequireMe>{() => <Visit id={visitId} />}</RequireMe>
}

function Visit({ id }) {
  const version = useDataVersion()
  const state = useAsync(() => getAncVisit(id), [id], version)
  return (
    <>
      <Breadcrumb items={[{ label: 'Antenatal care', to: '/family/me/antenatal' }, { label: state.data ? `Visit ${state.data.visit.contact}` : 'Visit' }]} />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load this visit"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={3} />
          </div>
        }
      >
        {(data) => <VisitContent data={data} />}
      </AsyncContent>
    </>
  )
}

function Measure({ icon: Icon, label, value, note, alert }) {
  return (
    <div className={cx('rounded-xl p-4', alert ? 'bg-coral-50' : 'bg-page')}>
      <dt className="flex items-center gap-1.5 text-small text-slate-600">
        <Icon className={cx('size-4', alert ? 'text-coral-700' : 'text-teal-700')} aria-hidden="true" />
        {label}
      </dt>
      <dd className={cx('mt-1 text-[20px] font-bold leading-7', alert ? 'text-coral-700' : 'text-ink')}>{value}</dd>
      {note && <dd className="text-[12px] text-slate-600">{note}</dd>}
    </div>
  )
}

function VisitContent({ data }) {
  const { visit, contact, previous, weightGain, nextAppointment, delivered } = data
  const highBp = isHighBp(visit.bpSystolic, visit.bpDiastolic)
  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[14px] text-slate-600">{formatDate(visit.date, 'long')}</p>
          <h1 className="text-h1 sm:text-[30px] sm:leading-[38px]">
            Antenatal visit {visit.contact} · {visit.ga} weeks
          </h1>
          <p className="mt-0.5 text-[15px] text-slate-600">{contact.title}</p>
        </div>
        <StatusBadge status="Completed" />
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Avatar initials={visit.clinician.initials} tone={visit.clinician.tone} size="md" />
              <div>
                <p className="text-[15px] font-semibold text-ink">{visit.clinician.name}</p>
                <p className="text-small text-slate-600">{visit.clinician.role || 'Tumaini Family Hospital'}</p>
              </div>
            </div>
            <h2 className="mt-5 text-h2">Your checks</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              <Measure
                icon={HeartPulse}
                label="Blood pressure"
                value={`${visit.bpSystolic}/${visit.bpDiastolic}`}
                note={highBp ? 'Higher than normal — your doctor will follow up' : previous ? `Normal · was ${previous.bpSystolic}/${previous.bpDiastolic}` : 'Normal'}
                alert={highBp}
              />
              <Measure icon={Scale} label="Weight" value={`${visit.weightKg} kg`} note={weightGain ? `+${weightGain} kg since your first visit` : 'Your starting weight'} />
              <Measure icon={Ruler} label="Fundal height" value={visit.fundalHeightCm ? `${visit.fundalHeightCm} cm` : '—'} note={visit.fundalHeightCm ? 'Baby’s growth — matches your weeks' : 'Measured from 20 weeks'} />
              <Measure icon={Baby} label="Baby’s heartbeat" value={visit.fetalHeartRate ? `${visit.fetalHeartRate} bpm` : '—'} note="Normal is 110–160" />
              <Measure icon={Droplets} label="Haemoglobin" value={visit.hb ? `${visit.hb} g/dL` : 'Not tested'} note={visit.hb ? (visit.hb < 11 ? 'A little low — keep taking iron' : 'Normal (11 or more)') : 'Checked at visits 1, 3 and 4'} alert={visit.hb && visit.hb < 11} />
              <Measure
                icon={TestTube}
                label="Urine test"
                value={visit.urineProtein === 'Negative' && visit.urineGlucose === 'Negative' ? 'Clear' : 'See note'}
                note={`Protein: ${visit.urineProtein.toLowerCase()} · Sugar: ${visit.urineGlucose.toLowerCase()}`}
                alert={visit.urineProtein !== 'Negative'}
              />
            </dl>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-h2">Given at this visit</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {visit.supplements.map((s) => (
                <li key={s} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink">
                  <Pill className="size-4 text-teal-700" aria-hidden="true" />
                  {s}
                </li>
              ))}
              {visit.tdGiven && (
                <li className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink">
                  <Syringe className="size-4 text-teal-700" aria-hidden="true" />
                  {visit.tdGiven} vaccine
                  <Badge tone="given">Given</Badge>
                </li>
              )}
            </ul>
          </Card>

          {visit.noteForMother && (
            <section className="rounded-2xl border border-teal-100 bg-teal-50 p-5 sm:p-6" aria-labelledby="note-heading">
              <h2 id="note-heading" className="text-h2 text-teal-800">
                Note from {visit.clinician.name.split(' ').slice(0, 2).join(' ')}
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-ink">{visit.noteForMother}</p>
            </section>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <p className="text-caption uppercase text-muted">Next visit</p>
            {delivered ? (
              <p className="mt-2 text-[14px] text-slate-600">Your baby was born — no more antenatal visits for this pregnancy.</p>
            ) : nextAppointment ? (
              <>
                <p className="mt-2 text-[19px] font-bold text-ink">
                  {formatDate(nextAppointment.start, 'weekday')}, {formatTime(nextAppointment.start)}
                </p>
                <p className="text-[14px] text-slate-600">
                  {nextAppointment.title}
                  {nextAppointment.clinician && ` · ${nextAppointment.clinician.name}`}
                </p>
                <Button to={`/family/visits?visit=${nextAppointment.id}`} variant="secondary" icon={CalendarDays} className="mt-3">
                  View visit
                </Button>
              </>
            ) : visit.nextVisitOn ? (
              <>
                <p className="mt-2 text-[19px] font-bold text-ink">{formatDate(visit.nextVisitOn, 'weekdayYear')}</p>
                <Button to="/family/visits/new?for=me&type=antenatal" className="mt-3" size="sm">
                  Book it
                </Button>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-slate-600">Your doctor will tell you.</p>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-h2">What this visit covers</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-600">
              {contact.checks.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
