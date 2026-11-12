import { CalendarDays, CircleAlert, CircleCheck, Eye, MapPin, Stethoscope } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createAppointment, getAvailability, getBookingOptions, slotWords, validateBooking } from '../../api/appointments'
import { getPatientOptions } from '../../api/patients'
import AsyncContent from '../../components/AsyncContent'
import Badge from '../../components/Badge'
import Banner from '../../components/Banner'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { SkeletonCard } from '../../components/Skeleton'
import Textarea from '../../components/Textarea'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, isValidISODate, TODAY_ISO } from '../../utils/dates'
import { pluralize } from '../../utils/format'

const FIELD_ORDER = ['patientId', 'clinicianId', 'room', 'date', 'time', 'note']
const NOTE_MAX = 200

export default function NewAppointment() {
  useDocumentTitle('New appointment')
  const options = useAsync(() => Promise.all([getBookingOptions(), getPatientOptions()]).then(([booking, patients]) => ({ ...booking, patients })), [])
  const [booked, setBooked] = useState(null)

  return (
    <>
      <Breadcrumb items={[{ label: 'Appointments', to: '/clinic/appointments' }, { label: 'New appointment' }]} />
      <h1 className="mb-5 text-h1 text-ink">Book an appointment</h1>
      {booked && (
        <Banner
          tone="success"
          icon={CircleCheck}
          role="status"
          className="mb-5"
          title={`Appointment booked for ${booked.patient.fullName} ${/^(today|tomorrow)/.test(slotWords(booked.start)) ? '' : 'on '}${slotWords(booked.start)}.`}
          onDismiss={() => setBooked(null)}
          action={
            <Link
              to={`/clinic/appointments?week=${booked.date}&focus=${booked.id}`}
              className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline"
            >
              View in schedule
            </Link>
          }
        >
          {booked.caregiver
            ? `${booked.caregiver.name} gets an SMS${booked.caregiver.hasApp ? ' and an in-app reminder' : ' reminder'} 1 day before.`
            : 'No caregiver phone on record, so no reminder will be sent.'}
        </Banner>
      )}
      <AsyncContent
        state={options}
        errorTitle="We couldn’t open the booking form"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <SkeletonCard lines={7} className="min-h-[460px]" />
            <SkeletonCard lines={4} />
          </div>
        }
      >
        {(data) => <BookingForm key={booked?.id ?? 'new'} data={data} onBooked={setBooked} />}
      </AsyncContent>
    </>
  )
}

function BookingForm({ data, onBooked }) {
  const { user, facility } = useAuth()
  const [params] = useSearchParams()
  const presetPatient = data.patients.some((p) => p.id === params.get('patient')) ? params.get('patient') : ''
  const presetDate = isValidISODate(params.get('date') ?? '') && params.get('date') >= TODAY_ISO ? params.get('date') : ''
  const [form, setForm] = useState({
    patientId: presetPatient,
    clinicianId: data.clinicians.some((c) => c.id === user.id) ? user.id : (data.clinicians[0]?.id ?? ''),
    room: '',
    date: presetDate,
    time: '',
    note: '',
    reason: params.get('reason') ?? '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const summaryRef = useRef(null)

  const availability = useAsync(
    () =>
      form.date && form.clinicianId && isValidISODate(form.date) ? getAvailability({ date: form.date, clinicianId: form.clinicianId }) : Promise.resolve(null),
    [form.date, form.clinicianId],
  )
  const slots = availability.data?.slots ?? null

  const patient = data.patients.find((p) => p.id === form.patientId)
  const clinician = data.clinicians.find((c) => c.id === form.clinicianId)

  const set = (field, value) => {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'date' || field === 'clinicianId') next.time = ''
      return next
    })
    if (submitted) {
      setErrors((e) => {
        const next = { ...e }
        delete next[field]
        if (field === 'date' || field === 'clinicianId') delete next.time
        return next
      })
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setServerError('')
    const found = validateBooking(null, form)
    if (!found.time && slots?.find((s) => s.time === form.time)?.taken) found.time = 'This clinician already has a patient at that time. Choose another time.'
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSaving(true)
    try {
      const appt = await createAppointment(form)
      onBooked(appt)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields)
        requestAnimationFrame(() => summaryRef.current?.focus())
      } else setServerError(err.message)
      setSaving(false)
    }
  }

  const errorKeys = FIELD_ORDER.filter((k) => errors[k])
  const timeLabel = (s) => (s.taken ? `${s.time} (booked)` : s.past ? `${s.time} (passed)` : s.time)

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 outline-none lg:col-span-2">
          <p className="flex items-start gap-2.5 text-[14px] text-ink">
            <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-coral-700" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-coral-700">{pluralize(errorKeys.length, 'field needs', 'fields need')} attention.</strong> Check the
              highlighted fields below.
            </span>
          </p>
          {errorKeys.length > 1 && (
            <ul className="mt-1.5 list-disc pl-12 text-[13px] text-coral-700">
              {errorKeys.map((k) => (
                <li key={k}>
                  <a href={`#book-${k}`} className="underline underline-offset-2">
                    {errors[k]}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Card as="form" onSubmit={onSubmit} noValidate className="p-5 sm:p-6" aria-label="Book an appointment">
        <Select id="book-patientId" label="Patient" required value={form.patientId} onChange={(e) => set('patientId', e.target.value)} error={errors.patientId}>
          <option value="">Choose a patient</option>
          {data.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select
            id="book-clinicianId"
            label="Clinician"
            required
            value={form.clinicianId}
            onChange={(e) => set('clinicianId', e.target.value)}
            error={errors.clinicianId}
          >
            {data.clinicians.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.title}
              </option>
            ))}
          </Select>
          <Select id="book-room" label="Room" required value={form.room} onChange={(e) => set('room', e.target.value)} error={errors.room}>
            <option value="">Select a room</option>
            {data.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
          <Input
            id="book-date"
            type="date"
            label="Date"
            required
            min={TODAY_ISO}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <Select
            id="book-time"
            label="Time"
            required
            value={form.time}
            onChange={(e) => set('time', e.target.value)}
            error={errors.time}
            disabled={!form.date}
            hint={!form.date ? 'Choose a date first.' : availability.data?.closed ? 'Closed on Sundays.' : undefined}
          >
            <option value="">{availability.loading && form.date ? 'Checking free times…' : 'Choose a time'}</option>
            {(slots ?? data.times.map((t) => ({ time: t }))).map((s) => (
              <option key={s.time} value={s.time} disabled={s.taken || s.past}>
                {timeLabel(s)}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          id="book-note"
          label="Note visible to caregiver"
          className="mt-4"
          rows={3}
          maxLength={NOTE_MAX}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          error={errors.note}
          placeholder="For example: 12-month Vitamin A dose and growth check. Please bring the MCH handbook."
        />
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted">
          <Eye className="size-4 shrink-0" aria-hidden="true" />
          {patient?.caregiverName
            ? `Shown to ${patient.caregiverName} ${patient.caregiverHasApp ? 'in the family app' : 'by SMS'}. Don't include clinical notes.`
            : 'Shown to the caregiver in the family app. Don’t include clinical notes.'}
        </p>
        {serverError && (
          <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
            {serverError}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <Button variant="neutral" to="/clinic/appointments">
            Cancel
          </Button>
          <Button type="submit" icon={CalendarDays} loading={saving}>
            Book appointment
          </Button>
        </div>
      </Card>

      <aside aria-labelledby="preview-title">
        <p id="preview-title" className="mb-2 text-caption uppercase text-muted">
          Caregiver preview
        </p>
        <div className="rounded-[26px] border-[10px] border-ink bg-page p-4">
          <p className="text-[13px] font-semibold text-ink">Enfantil · Upcoming visit</p>
          <div className="mt-3 rounded-xl bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[16px] font-bold leading-6 text-ink">
                {form.date && form.time
                  ? `${formatDate(form.date, 'weekdayYear')}, ${form.time}`
                  : form.date
                    ? formatDate(form.date, 'weekdayYear')
                    : 'Date and time'}
              </p>
              <Badge tone="upcoming">Upcoming</Badge>
            </div>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-slate-600">
              <Stethoscope className="size-4 shrink-0" aria-hidden="true" />
              {clinician?.name ?? 'Clinician'}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-slate-600">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {facility?.name}
            </p>
            {form.note.trim() && (
              <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-teal-50 px-3 py-2.5 text-[13px] leading-5 text-teal-800">{form.note.trim()}</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-slate-600">The caregiver gets an SMS and an in-app reminder 1 day before.</p>
      </aside>
    </div>
  )
}
