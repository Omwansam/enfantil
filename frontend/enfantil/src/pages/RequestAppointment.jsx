import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAppointment, getClinicians, getFacilities, requestAppointment } from '../api/appointments'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import Card from '../components/Card'
import ChoicePill from '../components/ChoicePill'
import FieldMessage from '../components/FieldMessage'
import IconButton from '../components/IconButton'
import OptionCard from '../components/OptionCard'
import PageHeader from '../components/PageHeader'
import RequireChild from '../components/RequireChild'
import Select from '../components/Select'
import Textarea from '../components/Textarea'
import { labelClass } from '../components/fieldStyles'
import { useChildren } from '../context/ChildContext'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { addDays, formatDate, nextMonday, toDate, toISODate, TODAY } from '../utils/dates'

const REASONS = [
  { value: 'vaccination', title: 'Vaccination', description: 'A due or missed dose' },
  { value: 'growth', title: 'Growth check', description: 'Weight, height, feeding' },
  { value: 'unwell', title: 'Child is unwell', description: 'Fever, cough, rash' },
  { value: 'followup', title: 'Follow-up', description: 'After a recent visit' },
]
const TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'any', label: 'Any time' },
]
// The clinic needs a working day to confirm, so the first bookable week starts after that.
const FIRST_WEEK = nextMonday(addDays(TODAY, 2))

export default function RequestAppointment() {
  useDocumentTitle('Request an appointment')
  return (
    <>
      <Breadcrumb items={[{ label: 'Visits', to: '/family/visits' }, { label: 'Request an appointment' }]} />
      <PageHeader title="Request an appointment" subtitle="Your clinic confirms the exact time, usually within one working day." />
      <RequireChild>{(child) => <RequestForm defaultChild={child} />}</RequireChild>
    </>
  )
}

function RequestForm({ defaultChild }) {
  const [params] = useSearchParams()
  const { childList } = useChildren()
  const rescheduleId = params.get('reschedule')
  const reschedule = useAsync(() => (rescheduleId ? getAppointment(rescheduleId) : Promise.resolve(null)), [rescheduleId])
  const facilities = useAsync(getFacilities, [])

  const startChild = childList.find((c) => c.id === params.get('child')) ?? defaultChild
  const blank = (child) => ({
    childId: child.id,
    reason: REASONS.some((r) => r.value === params.get('reason')) ? params.get('reason') : rescheduleId ? 'followup' : '',
    facilityId: child.facilityId ?? 'kl4',
    clinicianId: '',
    day: toISODate(addDays(FIRST_WEEK, 1)),
    timeOfDay: 'morning',
    note: '',
  })
  const [form, setForm] = useState(() => blank(startChild))
  const [weekOffset, setWeekOffset] = useState(0)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [sent, setSent] = useState(null)
  const topRef = useRef(null)
  const clinicians = useAsync(() => getClinicians(form.facilityId), [form.facilityId])

  const child = childList.find((c) => c.id === form.childId) ?? startChild
  const facility = facilities.data?.find((f) => f.id === form.facilityId)
  const clinician = clinicians.data?.find((c) => c.id === form.clinicianId)
  const weekStart = addDays(FIRST_WEEK, weekOffset * 7)
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const chooseChild = (id) => {
    const next = childList.find((c) => c.id === id)
    setForm((f) => ({ ...f, childId: id, facilityId: next?.facilityId ?? f.facilityId, clinicianId: '' }))
  }

  const changeWeek = (delta) => {
    const offset = Math.max(0, Math.min(5, weekOffset + delta))
    setWeekOffset(offset)
    set('day', toISODate(addDays(FIRST_WEEK, offset * 7)))
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    if (!form.reason) found.reason = 'Choose a reason for the visit'
    if (!form.facilityId) found.facilityId = 'Choose a clinic'
    if (!form.day) found.day = 'Choose a preferred day'
    setErrors(found)
    setSubmitError('')
    if (Object.keys(found).length) {
      document.getElementById(found.reason ? 'reason-group' : 'day-group')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitting(true)
    try {
      const appt = await requestAppointment({ ...form, rescheduleOf: reschedule.data ?? null })
      setSent({ appt, facilityName: facility?.name ?? 'Your clinic' })
      setForm((f) => ({ ...f, reason: '', note: '' }))
      topRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reasonLabel = REASONS.find((r) => r.value === form.reason)?.title

  return (
    <div ref={topRef} className="scroll-mt-6">
      {sent && (
        <Alert
          tone="success"
          role="status"
          className="mb-5"
          title="Request sent."
          action={<Button to={`/family/visits?visit=${sent.appt.id}`} variant="secondary">View in Visits</Button>}
          onDismiss={() => setSent(null)}
        >
          {sent.facilityName} will confirm the time by SMS, usually within one working day.
        </Alert>
      )}
      {reschedule.data && !sent && (
        <Alert tone="info" className="mb-5">
          You’re asking for a new time for <strong className="font-semibold text-ink">{reschedule.data.title}</strong> on{' '}
          {formatDate(reschedule.data.start, 'weekday')} ({reschedule.data.ref}). Your current appointment stays booked until the clinic confirms.
        </Alert>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card as="form" onSubmit={submit} noValidate className="p-5 sm:p-6" aria-label="Appointment request">
          <fieldset>
            <legend className={`mb-2 ${labelClass} text-[15px]`}>Which child?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {childList.map((c) => (
                <OptionCard
                  key={c.id}
                  name="child"
                  value={c.id}
                  checked={form.childId === c.id}
                  onChange={chooseChild}
                  leading={<Avatar initials={c.initials} tone={c.tone} size="md" />}
                  title={c.fullName}
                  description={c.age}
                />
              ))}
            </div>
          </fieldset>

          <fieldset id="reason-group" className="mt-6" aria-describedby={errors.reason ? 'reason-error' : undefined}>
            <legend className={`mb-2 ${labelClass} text-[15px]`}>
              Reason for the visit <span className="text-coral-700" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {REASONS.map((r) => (
                <OptionCard
                  key={r.value}
                  name="reason"
                  value={r.value}
                  checked={form.reason === r.value}
                  onChange={(v) => set('reason', v)}
                  title={r.title}
                  description={r.description}
                  error={Boolean(errors.reason)}
                />
              ))}
            </div>
            <FieldMessage id="reason-error" error={errors.reason} />
          </fieldset>

          {form.reason === 'unwell' && (
            <Alert tone="coral" role="alert" className="mt-4" title={`If ${child.firstName} has trouble breathing, a seizure, is very drowsy or cannot drink,`}>
              go to the nearest hospital now. Do not wait for an appointment.
            </Alert>
          )}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Select label="Clinic" value={form.facilityId} onChange={(e) => setForm((f) => ({ ...f, facilityId: e.target.value, clinicianId: '' }))} error={errors.facilityId}>
              {(facilities.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              {!facilities.data && <option value={form.facilityId}>Loading clinics…</option>}
            </Select>
            <Select label="Clinician" optional value={form.clinicianId} onChange={(e) => set('clinicianId', e.target.value)} disabled={clinicians.loading}>
              <option value="">Any available</option>
              {(clinicians.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <fieldset id="day-group" className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <legend className={`${labelClass} text-[15px]`}>Preferred day · week of {formatDate(weekStart, 'short')}</legend>
              <div className="flex gap-1">
                <IconButton icon={ChevronLeft} label="Previous week" onClick={() => changeWeek(-1)} disabled={weekOffset === 0} className="disabled:opacity-40" />
                <IconButton icon={ChevronRight} label="Next week" onClick={() => changeWeek(1)} disabled={weekOffset === 5} className="disabled:opacity-40" />
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {days.map((d) => {
                const iso = toISODate(d)
                const checked = form.day === iso
                return (
                  <label
                    key={iso}
                    className={cx(
                      'focus-within-ring flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border-[1.5px] py-2 transition-colors',
                      checked ? 'border-teal-700 bg-teal-700 text-white' : 'border-line bg-white text-ink hover:border-[#CFCAC1]',
                    )}
                  >
                    <input type="radio" name="day" value={iso} checked={checked} onChange={() => set('day', iso)} className="sr-only" />
                    <span className={cx('text-[12px] font-semibold', checked ? 'text-teal-50' : 'text-slate-600')}>{formatDate(d, 'weekday').split(' ')[0]}</span>
                    <span className="text-[18px] font-bold leading-6">{d.getDate()}</span>
                    <span className="sr-only">{formatDate(d, 'weekdayYear')}</span>
                  </label>
                )
              })}
            </div>
            <FieldMessage error={errors.day} />
          </fieldset>

          <fieldset className="mt-4">
            <legend className="sr-only">Time of day</legend>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <ChoicePill key={t.value} name="time" value={t.value} checked={form.timeOfDay === t.value} onChange={(v) => set('timeOfDay', v)}>
                  {t.label}
                </ChoicePill>
              ))}
            </div>
          </fieldset>

          <Textarea
            className="mt-6"
            label="Anything the clinic should know?"
            optional
            maxLength={500}
            placeholder={`For example: ${child.pronoun === 'her' ? 'she has' : 'he has'} had a cough for 3 days`}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />

          {submitError && (
            <Alert tone="coral" role="alert" className="mt-5">
              {submitError}
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <Button to="/family/visits" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Send request
            </Button>
          </div>
        </Card>

        <Card as="aside" className="p-5 lg:sticky lg:top-8" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="text-h2">
            Your request
          </h2>
          <dl className="mt-2 divide-y divide-line border-t border-line text-[14px]" aria-live="polite">
            {[
              ['Child', child.fullName],
              ['Reason', reasonLabel],
              ['Clinic', facility?.name],
              ...(clinician ? [['Clinician', clinician.name]] : []),
              ['Preferred', `${formatDate(toDate(form.day), 'weekday')} · ${TIMES.find((t) => t.value === form.timeOfDay)?.label}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2.5">
                <dt className="text-slate-600">{label}</dt>
                <dd className={cx('text-right font-semibold', value ? 'text-ink' : 'text-muted')}>{value ?? 'Not chosen yet'}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-small text-slate-600">You&apos;ll get an SMS with the confirmed time. You can change or cancel it from Visits.</p>
        </Card>
      </div>
    </div>
  )
}
