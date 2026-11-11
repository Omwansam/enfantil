import { CalendarDays, MessageCircle, Phone, Pill, Syringe, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { openConversationWithCaregiver } from '../../api/messages'
import { getPatient } from '../../api/patients'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge, { StatusBadge } from '../../components/Badge'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DataTable, { Td, Th } from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import Skeleton, { SkeletonCard, SkeletonTable } from '../../components/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatSlot, formatTime, isSameDay, relativeDay, TODAY } from '../../utils/dates'
import { pluralize, telHref } from '../../utils/format'

export default function PatientProfile() {
  const { patientId } = useParams()
  const version = useDataVersion()
  const state = useAsync(() => getPatient(patientId), [patientId], version)
  useDocumentTitle(state.data?.fullName ?? 'Patient')

  return (
    <>
      <Breadcrumb items={[{ label: 'Patients', to: '/clinic/patients' }, { label: state.data?.fullName ?? 'Patient' }]} />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t open this patient"
        skeleton={
          <div className="space-y-5">
            <Card className="flex items-center gap-5 p-6">
              <Skeleton className="size-[88px] rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-96 max-w-full" />
                <Skeleton className="h-4 w-64" />
              </div>
            </Card>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="p-5">
                <SkeletonTable rows={5} cols={5} label="Loading doses" />
              </Card>
              <SkeletonCard lines={4} />
            </div>
          </div>
        }
      >
        {(p) => <Profile p={p} />}
      </AsyncContent>
    </>
  )
}

function Profile({ p }) {
  const navigate = useNavigate()
  const [opening, setOpening] = useState(false)
  const [messageError, setMessageError] = useState('')

  const messageCaregiver = async () => {
    setOpening(true)
    setMessageError('')
    try {
      const { id } = await openConversationWithCaregiver(p.id)
      navigate(`/clinic/messages/${id}`)
    } catch (err) {
      setMessageError(err.message)
      setOpening(false)
    }
  }

  const m = p.lastMeasurement
  return (
    <>
      <Card className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <span className="hidden sm:block">
            <Avatar initials={p.initials} tone={p.tone} size="xl" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold leading-8 tracking-[-0.01em] text-ink">{p.fullName}</h1>
              {p.overdueCount > 0 && <Badge tone="overdue">{pluralize(p.overdueCount, 'overdue dose')}</Badge>}
            </div>
            {p.todayAppointment && (
              <Badge tone="upcoming" className="mt-1.5">
                Seen today {p.todayAppointment.time}
              </Badge>
            )}
            <p className="mt-1.5 text-[14px] text-slate-600">
              {p.sexLabel} · {p.age} · Born {formatDate(p.dob)} ·{' '}
              <span className="whitespace-nowrap">
                Patient ID <span className="font-mono text-[13px]">{p.patientId}</span>
              </span>
            </p>
            <p className="text-[14px] text-slate-600">
              {m ? (
                <>
                  Last measured {formatDate(m.date, 'auto')}:{' '}
                  {m.weightKg && <strong className="whitespace-nowrap font-semibold text-ink">{m.weightKg.toFixed(1)} kg</strong>}
                  {m.weightKg && m.heightCm && ' · '}
                  {m.heightCm && <strong className="whitespace-nowrap font-semibold text-ink">{m.heightCm.toFixed(1)} cm</strong>}
                </>
              ) : (
                'No measurements recorded yet'
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={MessageCircle} onClick={messageCaregiver} loading={opening}>
            Message caregiver
          </Button>
          <Button variant="secondary" size="sm" icon={CalendarDays} to={`/clinic/appointments/new?patient=${p.id}`}>
            Book appointment
          </Button>
          <Button size="sm" icon={Syringe} to={`/clinic/patients/${p.id}/immunizations/new`}>
            Record immunization
          </Button>
        </div>
      </Card>
      {messageError && (
        <p role="alert" className="mt-3 text-[14px] text-coral-700">
          {messageError}
        </p>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <PlannedDoses p={p} />
          <Administered p={p} />
        </div>
        <aside className="space-y-5" aria-label={`${p.firstName}’s visit, caregivers and allergies`}>
          <NextAppointment p={p} />
          <Caregivers p={p} onMessage={messageCaregiver} />
          <Allergies p={p} />
        </aside>
      </div>
    </>
  )
}

function apptLink(appt) {
  return `/clinic/appointments?week=${appt.start.slice(0, 10)}&focus=${appt.id}`
}

function PlannedDoses({ p }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-h2">Planned doses</h2>
        <p className="text-small text-slate-600">Kenya KEPI schedule</p>
      </div>
      {p.planned.length === 0 ? (
        <EmptyState title="Schedule complete" description={`${p.firstName} has had every KEPI dose for children under 5.`} />
      ) : (
        <DataTable caption="Planned doses" minWidth={560}>
          <thead>
            <tr>
              <Th>Vaccine</Th>
              <Th>Dose</Th>
              <Th>Due</Th>
              <Th>Appointment</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {p.planned.map((d) => {
              const overdue = d.status === 'Overdue'
              return (
                <tr key={d.key} className={cx(overdue && 'bg-coral-50/70')}>
                  <Td className="whitespace-nowrap font-semibold">{d.vaccine}</Td>
                  <Td className="whitespace-nowrap text-slate-600">{d.doseLabel}</Td>
                  <Td className={cx('whitespace-nowrap', overdue ? 'font-semibold text-coral-700' : 'text-slate-600')}>{formatDate(d.dueOn)}</Td>
                  <Td className="whitespace-nowrap">
                    {d.appointment ? (
                      <Link to={apptLink(d.appointment)} className="font-semibold text-teal-700 hover:underline">
                        {formatSlot(d.appointment.start)}
                      </Link>
                    ) : (
                      <Link
                        to={`/clinic/appointments/new?patient=${p.id}&date=${d.dueOn < formatISO(TODAY) ? formatISO(TODAY) : d.dueOn}`}
                        className="font-semibold text-teal-700 hover:underline"
                        aria-label={`Book ${d.label}`}
                      >
                        Book
                      </Link>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={d.status} label={overdue ? `Overdue · ${d.daysLate} d` : d.status} />
                    {overdue && <span className="sr-only">, {d.daysLate} days late</span>}
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

function formatISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function Administered({ p }) {
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? p.administered : p.administered.slice(0, 6)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-h2">Administered</h2>
        <Badge tone="given">{pluralize(p.administered.length, 'dose')}</Badge>
      </div>
      {p.administered.length === 0 ? (
        <EmptyState icon={Syringe} title="No doses recorded yet" description="Doses you record appear here with their batch numbers." />
      ) : (
        <>
          <DataTable caption="Administered doses" minWidth={600} className="text-[13px] [&_td]:text-[13px]">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Vaccine</Th>
                <Th>Batch no.</Th>
                <Th>Site · Route</Th>
                <Th>Given by</Th>
              </tr>
            </thead>
            <tbody id="administered-rows">
              {rows.map((d) => (
                <tr key={d.id}>
                  <Td className="whitespace-nowrap">{formatDate(d.givenOn)}</Td>
                  <Td className="whitespace-nowrap font-semibold">{d.name}</Td>
                  <Td className="whitespace-nowrap font-mono text-[13px] text-slate-600">{d.batch}</Td>
                  <Td className="whitespace-nowrap">
                    {d.site} · {d.route}
                  </Td>
                  <Td className="whitespace-nowrap">{d.givenBy}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          {p.administered.length > 6 && (
            <div className="px-5 py-3">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                aria-expanded={showAll}
                aria-controls="administered-rows"
                className="min-h-10 text-[14px] font-semibold text-teal-700 hover:underline"
              >
                {showAll ? 'Show fewer' : `Show all ${p.administered.length} doses`}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

function NextAppointment({ p }) {
  const a = p.nextAppointment
  if (!a) {
    return (
      <Card className="p-5">
        <p className="text-caption uppercase text-muted">Next appointment</p>
        <p className="mt-2 text-[16px] font-semibold text-ink">Nothing booked</p>
        <p className="mt-1 text-[14px] text-slate-600">
          {p.planned[0] ? `Next dose: ${p.planned[0].label}, due ${formatDate(p.planned[0].dueOn)}.` : 'No doses are due.'}
        </p>
        <Button variant="secondary" icon={CalendarDays} to={`/clinic/appointments/new?patient=${p.id}`} className="mt-4">
          Book appointment
        </Button>
      </Card>
    )
  }
  const rel = relativeDay(a.start)
  const day = rel === 'Today' || rel === 'Tomorrow' ? rel : formatDate(a.start, 'weekdayYear')
  return (
    <section className="rounded-2xl bg-teal-700 p-5 text-white shadow-card" aria-labelledby="next-appt">
      <p id="next-appt" className="text-caption uppercase text-teal-100">
        Next appointment
      </p>
      <p className="mt-1.5 text-[22px] font-bold leading-8">
        {day} · {formatTime(a.start, { twelveHour: true })}
      </p>
      <p className="text-[14px] text-teal-50">
        {a.reasonLong} · {a.room}
      </p>
      {!isSameDay(a.start, TODAY) && a.clinician && <p className="text-[14px] text-teal-50">{a.clinician.name}</p>}
      {a.clinicalNote && <p className="mt-3 rounded-xl bg-white/12 px-3.5 py-3 text-[13px] leading-5 text-white">{a.clinicalNote}</p>}
    </section>
  )
}

function Caregivers({ p, onMessage }) {
  return (
    <Card className="p-5">
      <h2 className="text-h2">Caregivers</h2>
      <ul className="mt-3 space-y-3">
        {p.caregivers.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <Avatar initials={c.initials} tone={c.tone} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{c.name}</p>
              <p className="text-[12px] text-slate-600">
                {c.relationship}
                {c.primary && ' · Primary'} · <span className="whitespace-nowrap">{c.phoneLabel}</span>
              </p>
            </div>
            {c.primary && c.hasApp ? (
              <button
                type="button"
                onClick={onMessage}
                aria-label={`Message ${c.name}`}
                title={`Message ${c.name}`}
                className="inline-flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100"
              >
                <MessageCircle className="size-5" aria-hidden="true" />
              </button>
            ) : (
              <a
                href={telHref(c.phone)}
                aria-label={`Call ${c.name}`}
                title={`Call ${c.name}`}
                className="inline-flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100"
              >
                <Phone className="size-5" aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Allergies({ p }) {
  return (
    <Card className="p-5">
      <h2 className="text-h2">Allergies &amp; medicines</h2>
      <div className="mt-3 space-y-3">
        {p.allergies.length === 0 ? (
          <p className="text-[14px] text-slate-600">No known allergies</p>
        ) : (
          p.allergies.map((a) => (
            <div key={a.substance} className="flex gap-2.5 rounded-xl bg-coral-50 px-3.5 py-3">
              <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-coral-700" aria-hidden="true" />
              <div>
                <p className="text-[14px] text-ink">
                  <span className="sr-only">Allergy: </span>
                  <strong className="font-semibold text-coral-700">{a.substance}</strong> — {a.reaction}
                </p>
                <p className="text-[12px] text-slate-600">Recorded {formatDate(a.recordedOn)}</p>
              </div>
            </div>
          ))
        )}
        <dl className="divide-y divide-line text-[14px]">
          {p.medicines.map((med) => (
            <div key={med.name} className="flex items-center justify-between gap-3 py-2">
              <dt className="flex items-center gap-2 text-ink">
                <Pill className="size-4 text-teal-700" aria-hidden="true" />
                {med.name}
              </dt>
              <dd className="text-slate-600">{med.dose}</dd>
            </div>
          ))}
          {p.medicines.length === 0 && (
            <div className="py-2">
              <dt className="sr-only">Medicines</dt>
              <dd className="text-slate-600">No regular medicines</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-2">
            <dt className="text-slate-600">Birth weight</dt>
            <dd className="font-semibold text-ink">{p.birthWeightKg ? `${p.birthWeightKg.toFixed(1)} kg` : 'Not recorded'}</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
