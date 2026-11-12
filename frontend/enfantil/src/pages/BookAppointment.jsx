import { ArrowLeft, ArrowRight, CalendarCheck, Check, CircleCheck, Clock, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAvailability, getBookingOptions, requestAppointment, validateBooking } from '../api/appointments'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import { StatusBadge } from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import Card from '../components/Card'
import FieldMessage from '../components/FieldMessage'
import OptionCard from '../components/OptionCard'
import Skeleton, { SkeletonCard } from '../components/Skeleton'
import Textarea from '../components/Textarea'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { dateTileParts, formatDate } from '../utils/dates'

const STEPS = ['Who', 'Visit', 'Doctor', 'Time', 'Note', 'Review']
const LEGACY_REASONS = { vaccination: 'vaccination', growth: 'growth', unwell: 'sick', followup: 'general' }

/** M10 — book an appointment: a request the hospital confirms. */
export default function BookAppointment() {
  useDocumentTitle('Book an appointment')
  const options = useAsync(getBookingOptions, [])
  return (
    <>
      <Breadcrumb items={[{ label: 'Visits', to: '/family/visits' }, { label: 'Book an appointment' }]} />
      <AsyncContent
        state={options}
        errorTitle="We couldn’t open booking"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={3} />
          </div>
        }
      >
        {(data) => <Booking data={data} />}
      </AsyncContent>
    </>
  )
}

function Stepper({ step }) {
  return (
    <ol className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
        return (
          <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
            <span
              className={cx(
                'flex size-7 items-center justify-center rounded-full text-[13px] font-semibold',
                current && 'bg-teal-700 text-white',
                done && 'bg-teal-100 text-teal-800',
                !current && !done && 'border-[1.5px] border-[#CFCAC1] text-slate-600',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cx('text-[14px]', current ? 'font-semibold text-teal-700' : 'text-slate-600')}>
              <span className="sr-only">Step {i + 1} of {STEPS.length}: </span>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Booking({ data }) {
  const [params] = useSearchParams()
  const requestedFor = params.get('for') ?? params.get('child')
  const initialFor = data.profiles.some((p) => p.id === requestedFor) ? requestedFor : ''
  const initialProfile = data.profiles.find((p) => p.id === initialFor)
  const requestedType = params.get('type') ?? LEGACY_REASONS[params.get('reason')] ?? ''
  const initialType = initialProfile?.visitTypes.some((t) => t.value === requestedType) ? requestedType : ''
  const [form, setForm] = useState({ forId: initialFor, visitType: initialType, clinicianId: '', date: '', time: '', note: '' })
  const [step, setStep] = useState(initialFor ? (initialType ? 2 : 1) : 0)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const rescheduleOf = params.get('reschedule')

  const profile = data.profiles.find((p) => p.id === form.forId)
  const type = profile?.visitTypes.find((t) => t.value === form.visitType)
  const doctorsForType = data.clinicians.filter((c) => (form.forId === 'me' ? c.sees.includes('me') : c.sees.includes('child')))
  const doctor = data.clinicians.find((c) => c.id === form.clinicianId)

  const set = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'forId') Object.assign(next, { visitType: '', clinicianId: '' })
      if (field === 'clinicianId') Object.assign(next, { date: '', time: '' })
      return next
    })
    setErrors({})
  }

  const next = () => {
    const found = {}
    if (step === 0 && !form.forId) found.forId = 'Choose who the visit is for'
    if (step === 1 && !form.visitType) found.visitType = 'Choose the type of visit'
    if (step === 3 && (!form.date || !form.time)) found.slot = 'Choose a day and a free time'
    if (step === 4) Object.assign(found, Object.fromEntries(Object.entries(validateBooking(form)).filter(([k]) => k === 'note')))
    setErrors(found)
    if (Object.keys(found).length) return
    setStep((s) => s + 1)
  }

  const send = async () => {
    setBusy(true)
    setServerError('')
    try {
      const appt = await requestAppointment({ ...form, rescheduleOf })
      setSent(appt)
    } catch (err) {
      setServerError(err.message)
      setBusy(false)
    }
  }

  if (sent) return <Sent appt={sent} />

  return (
    <>
      <h1 className="mb-1 text-h1 sm:text-[30px] sm:leading-[38px]">{rescheduleOf ? 'Ask for a different time' : 'Book an appointment'}</h1>
      <p className="mb-5 text-[15px] text-slate-600">At {data.facility.name}, {data.facility.address}. The hospital confirms your request, usually within one working day.</p>
      <Stepper step={step} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-7">
          {step === 0 && (
            <fieldset>
              <legend className="text-h2">Who is the visit for?</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.profiles.map((p) => (
                  <OptionCard
                    key={p.id}
                    name="for"
                    value={p.id}
                    checked={form.forId === p.id}
                    onChange={(v) => set('forId', v)}
                    leading={<Avatar initials={p.initials} tone={p.tone} size="md" />}
                    title={p.isMe ? `Me · ${p.firstName}` : p.fullName}
                    description={p.isMe ? p.statusLabel : p.age}
                    error={errors.forId}
                  />
                ))}
              </div>
              <FieldMessage error={errors.forId} />
            </fieldset>
          )}

          {step === 1 && profile && (
            <fieldset>
              <legend className="text-h2">What kind of visit?</legend>
              <p className="mt-1 text-[14px] text-slate-600">For {profile.isMe ? 'you' : profile.firstName}.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {profile.visitTypes.map((t) => (
                  <OptionCard key={t.value} name="type" value={t.value} checked={form.visitType === t.value} onChange={(v) => set('visitType', v)} title={t.label} description={t.description} error={errors.visitType} />
                ))}
              </div>
              <FieldMessage error={errors.visitType} />
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="text-h2">Preferred doctor</legend>
              <p className="mt-1 text-[14px] text-slate-600">Optional. With no preference you see the first available clinician.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <OptionCard
                  name="doctor"
                  value=""
                  checked={!form.clinicianId}
                  onChange={() => set('clinicianId', '')}
                  icon={Stethoscope}
                  title="No preference"
                  description="Fastest to confirm"
                />
                {doctorsForType.map((c) => (
                  <OptionCard
                    key={c.id}
                    name="doctor"
                    value={c.id}
                    checked={form.clinicianId === c.id}
                    onChange={(v) => set('clinicianId', v)}
                    leading={<Avatar initials={c.initials} tone={c.tone} size="md" />}
                    title={c.name}
                    description={c.role}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {step === 3 && <SlotPicker form={form} set={set} error={errors.slot} />}

          {step === 4 && (
            <div>
              <h2 className="text-h2">Anything the doctor should know?</h2>
              <Textarea
                className="mt-4"
                label={form.visitType === 'sick' ? 'What is wrong?' : 'Reason or note'}
                optional={form.visitType !== 'sick'}
                rows={4}
                maxLength={300}
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                error={errors.note}
                hint={form.visitType === 'sick' ? 'For example: “Cough and runny nose for 4 days, no fever.”' : 'For example: “I’d like to talk about family planning.”'}
              />
              <Alert tone="coral" className="mt-4" title="Is it an emergency?">
                Don’t wait for an appointment. Go to the hospital now, or call 0709 600 400 (24 hours).
              </Alert>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="text-h2">Check your request</h2>
              <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
                {[
                  ['For', profile.isMe ? `Me · ${profile.fullName}` : profile.fullName, 0],
                  ['Visit', type?.label, 1],
                  ['Doctor', doctor ? doctor.name : 'No preference', 2],
                  ['Day and time', `${formatDate(form.date, 'weekdayYear')} at ${form.time}`, 3],
                  ['Note', form.note || 'None', 4],
                ].map(([label, value, target]) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <dt className="w-28 shrink-0 text-[14px] text-slate-600">{label}</dt>
                    <dd className="min-w-0 flex-1 text-[14px] font-semibold text-ink">{value}</dd>
                    <button type="button" onClick={() => setStep(target)} className="min-h-9 shrink-0 text-[14px] font-semibold text-teal-700 hover:underline">
                      Change<span className="sr-only"> {label.toLowerCase()}</span>
                    </button>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[14px] text-slate-600">
                Your request shows as <StatusBadge status="Pending" /> until a doctor confirms it or proposes another time. You’ll get an SMS and a notification.
              </p>
              {serverError && (
                <Alert tone="coral" role="alert" className="mt-4">
                  {serverError}
                </Alert>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            {step > 0 ? (
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <Button variant="secondary" to="/family/visits">
                Cancel
              </Button>
            )}
            {step < 5 ? (
              <Button iconRight={ArrowRight} onClick={next}>
                Continue
              </Button>
            ) : (
              <Button icon={CalendarCheck} onClick={send} loading={busy}>
                Send request
              </Button>
            )}
          </div>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <p className="text-caption uppercase text-muted">Your request</p>
            <dl className="mt-2 space-y-2 text-[14px]">
              <div>
                <dt className="text-slate-600">For</dt>
                <dd className="font-semibold text-ink">{profile ? (profile.isMe ? 'You' : profile.fullName) : '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Visit</dt>
                <dd className="font-semibold text-ink">{type?.label ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Doctor</dt>
                <dd className="font-semibold text-ink">{step >= 2 ? (doctor?.name ?? 'No preference') : '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">When</dt>
                <dd className="font-semibold text-ink">{form.date && form.time ? `${formatDate(form.date, 'weekday')}, ${form.time}` : '—'}</dd>
              </div>
            </dl>
          </Card>
          <Card className="flex items-start gap-3 p-5">
            <Clock className="mt-0.5 size-5 shrink-0 text-teal-700" aria-hidden="true" />
            <p className="text-[14px] leading-6 text-slate-600">Open Monday to Friday 8:30–16:30 and Saturday mornings. Closed on Sundays. Maternity is open 24 hours.</p>
          </Card>
        </aside>
      </div>
    </>
  )
}

function SlotPicker({ form, set, error }) {
  const availability = useAsync(
    () => getAvailability({ clinicianId: form.clinicianId || undefined, forId: form.forId || undefined }),
    [form.clinicianId, form.forId],
  )
  const day = availability.data?.find((d) => d.date === form.date)
  return (
    <div>
      <h2 className="text-h2">Choose a day and time</h2>
      <p className="mt-1 text-[14px] text-slate-600">Free times at Tumaini Family Hospital over the next two weeks.</p>
      <AsyncContent
        state={availability}
        errorTitle="We couldn’t load free times"
        skeleton={
          <div className="mt-4 space-y-4" role="status" aria-label="Loading free times">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[76px] w-[72px] rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-28 rounded-xl" />
          </div>
        }
      >
        {(days) => (
          <>
            <div className="scrollbar-thin -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2" role="radiogroup" aria-label="Day">
              {days.map((d) => {
                const parts = dateTileParts(d.date)
                const selected = form.date === d.date
                const disabled = d.freeCount === 0
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => {
                      set('date', d.date)
                    }}
                    className={cx(
                      'flex w-[76px] shrink-0 flex-col items-center rounded-xl border-[1.5px] px-2 py-2 transition-colors',
                      selected ? 'border-teal-700 bg-teal-700 text-white' : disabled ? 'border-line bg-[#F4F3F0] text-muted' : 'border-line bg-white text-ink hover:border-teal-700',
                    )}
                  >
                    <span className="text-[12px] font-semibold">{parts.weekday}</span>
                    <span className="text-[20px] font-bold leading-7">{parts.day}</span>
                    <span className={cx('text-[11px]', selected ? 'text-teal-50' : 'text-slate-600')}>{disabled ? 'Full' : `${d.freeCount} free`}</span>
                  </button>
                )
              })}
            </div>
            {day ? (
              <fieldset className="mt-4">
                <legend className="mb-2 text-[14px] font-semibold text-ink">
                  {formatDate(day.date, 'weekdayYear')}
                  {day.saturday && ' · morning clinic'}
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {day.slots.map((s) => {
                    const selected = form.time === s.time
                    return (
                      <label
                        key={s.time}
                        className={cx(
                          'focus-within-ring flex min-h-11 items-center justify-center rounded-xl border text-[14px] font-semibold tabular-nums',
                          !s.free && 'cursor-not-allowed border-line bg-[#F4F3F0] text-muted line-through',
                          s.free && !selected && 'cursor-pointer border-line bg-white text-ink hover:border-teal-700 hover:bg-teal-50',
                          selected && 'border-teal-700 bg-teal-700 text-white',
                        )}
                      >
                        <input type="radio" name="time" value={s.time} checked={selected} disabled={!s.free} onChange={() => set('time', s.time)} className="sr-only" />
                        {s.time}
                        {!s.free && <span className="sr-only"> (taken)</span>}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="mt-4 rounded-xl bg-page px-4 py-3 text-[14px] text-slate-600">Choose a day to see its free times.</p>
            )}
            <FieldMessage error={error} />
          </>
        )}
      </AsyncContent>
    </div>
  )
}

function Sent({ appt }) {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-6 text-center sm:p-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-completed-bg text-completed">
          <CircleCheck className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-h1" role="status">
          Request sent — waiting for confirmation
        </h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Tumaini Family Hospital will confirm by SMS and in the app, usually within one working day. If the time isn’t free, they’ll propose another.
        </p>
        <div className="mt-5 rounded-xl border border-line p-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[16px] font-semibold text-ink">{appt.title}</p>
            <StatusBadge status="Pending" />
          </div>
          <p className="mt-1 text-[14px] text-slate-600">
            {appt.child.isMe ? 'For you' : `For ${appt.child.firstName}`} · {formatDate(appt.start, 'weekdayYear')} at {appt.start.slice(11, 16)}
            {appt.clinician && ` · ${appt.clinician.name}`}
          </p>
          <p className="mt-1 font-mono text-[12px] text-muted">{appt.ref}</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to={`/family/visits?visit=${appt.id}`}>View in Visits</Button>
          <Button to="/family" variant="secondary">
            Back to overview
          </Button>
        </div>
      </Card>
    </div>
  )
}
