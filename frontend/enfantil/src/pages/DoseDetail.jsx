import { Check, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDose } from '../api/immunizations'
import { openConversationWith } from '../api/messages'
import Accordion from '../components/Accordion'
import AsyncContent from '../components/AsyncContent'
import Badge, { StatusBadge } from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import Card from '../components/Card'
import { SkeletonCard } from '../components/Skeleton'
import { linkClass } from '../components/fieldStyles'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { formatAge, formatDate, formatTime, relativeDay } from '../utils/dates'
import { possessive } from '../utils/format'

export default function DoseDetail() {
  const { doseId } = useParams()
  const version = useDataVersion()
  const state = useAsync(() => getDose(doseId), [doseId], version)
  useDocumentTitle(state.data?.dose.title ?? 'Vaccine')

  return (
    <AsyncContent
      state={state}
      errorTitle="We couldn’t load this dose"
      skeleton={
        <div className="space-y-5">
          <SkeletonCard lines={2} className="h-[180px]" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      }
    >
      {(data) => <DoseContent {...data} />}
    </AsyncContent>
  )
}

function doseLabel(dose, series) {
  const v = dose.vaccine
  if (v.numbered && v.totalDoses) {
    // OPV starts at OPV 0 (birth), so "OPV 1" is the 2nd of 4 polio drops.
    if (v.firstDose === 0) return `${dose.short} · ${dose.doseNumber + 1} of ${v.totalDoses}`
    return `Dose ${dose.doseNumber} of ${v.totalDoses}`
  }
  if (series.length > 1) return `${dose.ageLabel} dose`
  return 'Single dose'
}

function DoseContent({ dose, child, series, sameVisit }) {
  const navigate = useNavigate()
  const [asking, setAsking] = useState(false)
  const v = dose.vaccine
  const appt = dose.appointment
  const keyDate = dose.givenOn ?? dose.dueOn
  const unwellFaq = v.faqs.find((f) => /unwell/i.test(f.q))

  const askCareTeam = async () => {
    setAsking(true)
    try {
      const clinicianId = appt?.clinicianId ?? child.mainClinicianId ?? 'kl4-reception'
      const { id } = await openConversationWith({ clinicianId, childId: child.id })
      navigate(`/family/messages/${id}`)
    } catch {
      navigate('/family/messages')
    }
  }

  return (
    <>
      <Breadcrumb items={[{ label: 'Vaccines', to: '/family/vaccines' }, { label: dose.title }]} />

      <section className="relative isolate overflow-hidden rounded-2xl bg-teal-700 p-6 text-white sm:p-7">
        <span aria-hidden="true" className="absolute -right-16 -top-24 -z-10 size-64 rounded-full bg-teal-800" />
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Badge tone="inverse">
              {dose.status} · {doseLabel(dose, series)}
            </Badge>
            <h1 className="mt-3 text-[28px] font-bold leading-9 sm:text-[32px] sm:leading-10">{v.name}</h1>
            <p className="mt-2 text-[15px] leading-6 text-teal-50">
              {v.supplement ? 'Helps protect' : 'Protects'} {child.firstName} against {v.protects}. {v.how}
            </p>
          </div>
          <dl className="flex shrink-0 gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3">
              <dt className="text-[12px] text-teal-50">{dose.givenOn ? 'Given' : 'Due'}</dt>
              <dd className="text-[17px] font-semibold">{formatDate(keyDate, 'weekday')}</dd>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3">
              <dt className="text-[12px] text-teal-50">{possessive(child.firstName)} age</dt>
              <dd className="text-[17px] font-semibold">{formatAge(child.dob, keyDate)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-h2">On the Kenya KEPI schedule</h2>
            <SeriesTimeline series={series} currentId={dose.id} />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-h2">{v.supplement ? 'After the dose' : 'After the vaccine'}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-page p-4">
                <h3 className="text-[15px] font-semibold text-ink">Common and mild</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-600">
                  {v.common.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-coral-50 p-4">
                <h3 className="text-[15px] font-semibold text-coral-700">Get help straight away if</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-ink">
                  {v.getHelp.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {v.faqs.length > 0 && (
            <Card className="overflow-hidden">
              <h2 className="px-5 pb-2 pt-5 text-h2 sm:px-6">Common questions</h2>
              <Accordion
                className="border-t border-line"
                defaultOpenId={unwellFaq?.q ?? null}
                items={v.faqs.map((f) => ({ id: f.q, title: f.q, content: f.a }))}
              />
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          {dose.givenOn ? (
            <Card className="p-5">
              <p className="text-caption uppercase text-muted">Recorded dose</p>
              <dl className="mt-2 divide-y divide-line text-[14px]">
                {[
                  ['Given on', formatDate(dose.givenOn)],
                  ['Batch no.', dose.batch, 'font-mono'],
                  ['Given by', dose.givenBy],
                  ['Clinic', dose.facilityLabel],
                ].map(([label, value, extra]) => (
                  <div key={label} className="flex justify-between gap-3 py-2">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className={cx('text-right font-semibold text-ink', extra)}>{value}</dd>
                  </div>
                ))}
              </dl>
              {appt && (
                <Link to={`/family/visits?visit=${appt.id}`} className={`${linkClass} mt-2 inline-flex min-h-11 items-center text-[14px]`}>
                  View visit →
                </Link>
              )}
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-caption uppercase text-muted">Linked appointment</p>
              {appt ? (
                <>
                  <p className="mt-2 text-[20px] font-bold leading-7 text-ink">
                    {formatDate(appt.start, 'weekday')} · {formatTime(appt.start, { twelveHour: true })}
                  </p>
                  <p className="mt-1 text-[14px] text-slate-600">
                    {appt.clinician ? `${appt.clinician.name} · ` : ''}
                    {appt.facility.name}
                    {appt.location ? `, ${appt.location.split(', ').pop()}` : ''}
                  </p>
                  <Link to={`/family/visits?visit=${appt.id}`} className={`${linkClass} mt-1 inline-flex min-h-11 items-center text-[14px]`}>
                    View visit →
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[16px] font-semibold text-ink">No appointment yet</p>
                  <p className="mt-1 text-[14px] text-slate-600">Your clinic will book it closer to the due date, or you can ask for one now.</p>
                  <Button to={`/family/visits/new?child=${child.id}&reason=vaccination`} variant="secondary" className="mt-3">
                    Request appointment
                  </Button>
                </>
              )}
            </Card>
          )}

          {sameVisit.length > 0 && (
            <Card className="p-5">
              <h2 className="text-h2">{dose.givenOn ? 'Also given that day' : 'Also planned that day'}</h2>
              <ul className="mt-2 divide-y divide-line border-t border-line">
                {sameVisit.map((d) => (
                  <li key={d.id}>
                    <Link to={`/family/vaccines/${d.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-[15px] font-semibold text-ink hover:text-teal-700">
                      {d.title}
                      <StatusBadge status={d.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Button icon={MessageCircle} size="lg" fullWidth onClick={askCareTeam} loading={asking}>
            Ask the care team
          </Button>
          <p className="text-small text-muted">
            General information based on the Kenya Ministry of Health immunization schedule. Your clinician will advise on your child.
          </p>
        </aside>
      </div>
    </>
  )
}

function SeriesTimeline({ series, currentId }) {
  return (
    <div className="scrollbar-thin mt-5 overflow-x-auto pb-1">
      <ol className="flex min-w-full">
        {series.map((d, i) => {
          const current = d.id === currentId
          const rel = !d.givenOn && relativeDay(d.dueOn)
          const label = d.vaccine.numbered ? d.doseNumber : i + 1
          return (
            <li key={d.id} className="relative flex min-w-[120px] flex-1 flex-col items-center text-center">
              {i < series.length - 1 && <span aria-hidden="true" className="absolute left-1/2 top-[18px] h-px w-full bg-[#D9D5CD]" />}
              <Link
                to={`/family/vaccines/${d.id}`}
                aria-current={current ? 'page' : undefined}
                aria-label={`${d.title}, ${d.status}`}
                className={cx(
                  'relative z-10 flex size-9 items-center justify-center rounded-full text-[14px] font-semibold',
                  current && 'bg-teal-700 text-white',
                  !current && d.status === 'Given' && 'bg-teal-100 text-teal-800',
                  !current && d.status === 'Overdue' && 'border-[1.5px] border-coral-700 bg-coral-50 text-coral-700',
                  !current && d.status === 'Planned' && 'border-[1.5px] border-[#94A3B8] bg-white text-slate-600',
                )}
              >
                {d.status === 'Given' && !current ? <Check className="size-4" aria-hidden="true" /> : label}
              </Link>
              <p className="mt-2 text-[14px] font-semibold text-ink">{d.ageLabel}</p>
              <div className="mt-1 text-small text-slate-600">
                {d.givenOn ? (
                  `Given ${formatDate(d.givenOn, 'short')}`
                ) : d.status === 'Overdue' ? (
                  <StatusBadge status="Overdue" />
                ) : rel === 'Today' || rel === 'Tomorrow' ? (
                  <StatusBadge status="Planned" label={rel} />
                ) : (
                  formatDate(d.dueOn)
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
