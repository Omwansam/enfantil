import { ArrowRight, Baby, Check, ChevronDown, ShieldPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPostnatalCare } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card, { CardHeader } from '../../components/Card'
import DangerSigns from '../../components/DangerSigns'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import RequireMe from '../../components/RequireMe'
import { SkeletonCard } from '../../components/Skeleton'
import { useChildren } from '../../context/ChildContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime } from '../../utils/dates'

/** M9 — delivery summary and postnatal visits. */
export default function Postnatal() {
  useDocumentTitle('Postnatal care')
  return <RequireMe>{() => <Care />}</RequireMe>
}

function Care() {
  const version = useDataVersion()
  const state = useAsync(getPostnatalCare, [], version)
  return (
    <>
      <PageHeader title="Postnatal care" subtitle="Your checks after birth at Tumaini Family Hospital" />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your postnatal care"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={4} />
          </div>
        }
        isEmpty={(d) => !d}
        empty={
          <Card>
            <EmptyState
              icon={ShieldPlus}
              title="Postnatal care starts after your baby is born"
              description="You will have checks within 48 hours, at 1–2 weeks and at 4–6 weeks. They will appear here with your delivery summary."
              action={<Button to="/family/me/pregnancy">Back to my pregnancy</Button>}
            />
          </Card>
        }
      >
        {(d) => <CareContent d={d} />}
      </AsyncContent>
    </>
  )
}

function CareContent({ d }) {
  const { delivery } = d
  const { selectChild } = useChildren()
  const navigate = useNavigate()
  const done = d.visits.filter((v) => v.status === 'Completed').length
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <CardHeader title="Delivery summary" subtitle={`${formatDate(delivery.date, 'long')} at ${delivery.time}`} />
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Place', delivery.place],
              ['Type of delivery', delivery.mode],
              ['Gestational age', `${delivery.gestation} weeks`],
              ['Outcome', delivery.outcome],
              ['Baby’s weight', `${delivery.babyWeightKg} kg`],
              ['Baby’s length', delivery.babyLengthCm ? `${delivery.babyLengthCm} cm` : '—'],
              ['Apgar score', delivery.apgar],
              ['Blood loss', delivery.bloodLoss],
              ['Attended by', delivery.attendedBy.join(', ')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {d.child && (
            <button
              type="button"
              onClick={() => {
                selectChild(d.child.id)
                navigate('/family/health')
              }}
              className="mt-5 flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-teal-700 hover:bg-teal-50"
            >
              <Avatar initials={d.child.initials} tone={d.child.tone} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{d.child.fullName}</span>
                <span className="block text-small text-slate-600">{d.child.age} · open her vaccines and growth</span>
              </span>
              <ArrowRight className="size-5 text-teal-700" aria-hidden="true" />
            </button>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <CardHeader title="Postnatal visits" subtitle={`${done} of ${d.visits.length} done`} />
          <ol className="mt-4 space-y-3">
            {d.visits.map((v) => (
              <VisitRow key={v.key} v={v} />
            ))}
          </ol>
        </Card>
      </div>

      <aside className="space-y-5">
        {d.familyPlanning && (
          <section className="rounded-2xl border border-teal-100 bg-teal-50 p-5" aria-labelledby="fp-heading">
            <h2 id="fp-heading" className="text-h2 text-teal-800">
              Family planning
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-ink">{d.familyPlanning.note}</p>
            <p className="mt-2 text-small text-slate-600">
              {d.familyPlanning.clinician} · {formatDate(d.familyPlanning.date)}
            </p>
            <Button to="/family/visits/new?for=me&type=postnatal" variant="secondary" size="sm" className="mt-3">
              Book a review
            </Button>
          </section>
        )}
        <DangerSigns signs={d.dangerSigns} title="After birth — get help straight away if" />
        <Card className="flex items-start gap-3 p-5">
          <Baby className="mt-0.5 size-5 shrink-0 text-teal-700" aria-hidden="true" />
          <p className="text-[14px] leading-6 text-slate-600">Your baby’s own vaccines and growth checks continue on the KEPI schedule. Switch to their profile to see them.</p>
        </Card>
      </aside>
    </div>
  )
}

function VisitRow({ v }) {
  const [open, setOpen] = useState(false)
  const done = v.status === 'Completed'
  return (
    <li className={cx('rounded-xl border p-4', done ? 'border-line bg-white' : v.status === 'Overdue' ? 'border-coral-200 bg-coral-50' : 'border-line bg-page')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={cx('flex size-9 items-center justify-center rounded-full', done ? 'bg-teal-700 text-white' : 'border-[1.5px] border-teal-700 text-teal-700')} aria-hidden="true">
          {done ? <Check className="size-4" /> : <ShieldPlus className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">{v.label}</h3>
          <p className="text-[13px] text-slate-600">
            {done ? `${formatDate(v.visit.date, 'weekdayYear')}, ${formatTime(v.visit.date)} · ${v.visit.clinician.name}` : `Due around ${formatDate(v.dueOn)}`}
          </p>
        </div>
        <StatusBadge status={v.status} />
      </div>
      {done && (
        <>
          <p className="mt-3 text-[14px] text-ink">{v.visit.note}</p>
          <button type="button" aria-expanded={open} onClick={() => setOpen((x) => !x)} className="mt-1 inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold text-teal-700">
            {open ? 'Hide checks' : 'Show your checks and baby’s checks'}
            <ChevronDown className={cx('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
          {open && (
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <dl className="rounded-xl bg-page p-3.5 text-[13px]">
                <p className="mb-1 text-caption uppercase text-muted">Your recovery</p>
                {[
                  ['Blood pressure', v.visit.mother.bp],
                  ['Temperature', `${v.visit.mother.tempC} °C`],
                  ['Weight', `${v.visit.mother.weightKg} kg`],
                  ['Womb', v.visit.mother.uterus],
                  ['Bleeding', v.visit.mother.bleeding],
                  ['Stitches / perineum', v.visit.mother.perineum],
                  ['Breasts', v.visit.mother.breasts],
                  ['Mood', v.visit.mother.mood],
                  ['Haemoglobin', v.visit.mother.hb ? `${v.visit.mother.hb} g/dL` : 'Not tested'],
                ].map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-3 py-0.5">
                    <dt className="text-slate-600">{k}</dt>
                    <dd className="text-right font-medium text-ink">{val}</dd>
                  </div>
                ))}
              </dl>
              <dl className="rounded-xl bg-page p-3.5 text-[13px]">
                <p className="mb-1 text-caption uppercase text-muted">Baby’s checks</p>
                {[
                  ['Weight', `${v.visit.baby.weightKg} kg`],
                  ['Feeding', v.visit.baby.feeding],
                  ['Cord', v.visit.baby.cord],
                  ['Jaundice', v.visit.baby.jaundice],
                  ['Temperature', `${v.visit.baby.tempC} °C`],
                ].map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-3 py-0.5">
                    <dt className="text-slate-600">{k}</dt>
                    <dd className="text-right font-medium text-ink">{val}</dd>
                  </div>
                ))}
                {v.visit.familyPlanning && <p className="mt-2 border-t border-line pt-2 text-ink">Family planning: {v.visit.familyPlanning}</p>}
              </dl>
            </div>
          )}
        </>
      )}
    </li>
  )
}
