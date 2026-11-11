import { CalendarX2, ChevronLeft, ChevronRight, CircleCheck, Clock, Funnel, Plus } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cancelAppointment, getAvailability, getBookingOptions, getSchedule, rescheduleAppointment, slotWords } from '../../api/appointments'
import Avatar from '../../components/Avatar'
import Banner from '../../components/Banner'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Checkbox from '../../components/Checkbox'
import ConfirmDialog from '../../components/ConfirmDialog'
import DataTable, { TableMessage, Td, Th } from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import FilterBar, { FilterSelect } from '../../components/FilterBar'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import SegmentedControl from '../../components/SegmentedControl'
import Select from '../../components/Select'
import Skeleton from '../../components/Skeleton'
import TimeSlotGrid from '../../components/TimeSlotGrid'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { addDays, formatDate, isValidISODate, isWeekend, startOfWeek, TODAY, TODAY_ISO, toDate, toISODate } from '../../utils/dates'
import { pluralize } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function rangeLabel(from, to) {
  const a = toDate(from)
  const b = toDate(to)
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${formatDate(b, 'medium').split(' ').slice(1).join(' ')}`
  if (a.getFullYear() === b.getFullYear()) return `${formatDate(a, 'short')} – ${formatDate(b)}`
  return `${formatDate(a)} – ${formatDate(b)}`
}

export default function Appointments() {
  useDocumentTitle('Appointments')
  const { facility } = useAuth()
  const version = useDataVersion()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'day' ? 'day' : 'week'
  const anchor = isValidISODate(params.get('week') ?? '') ? params.get('week') : TODAY_ISO
  const clinicianId = params.get('clinician') ?? 'all'
  const status = params.get('status') ?? 'all'
  const focus = params.get('focus')

  const monday = startOfWeek(anchor)
  const from = view === 'day' ? anchor : toISODate(monday)
  const to = view === 'day' ? anchor : toISODate(addDays(monday, 6))

  const options = useAsync(() => getBookingOptions(), [])
  const state = useAsync(() => getSchedule({ from, to, clinicianId, status }), [from, to, clinicianId, status], version)

  const [rescheduling, setRescheduling] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [flash, setFlash] = useState(null)

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === 'all') next.delete(k)
      else next.set(k, v)
    })
    next.delete('focus')
    setParams(next)
  }

  const step = (dir) => {
    if (view === 'day') {
      let d = addDays(anchor, dir)
      while (isWeekend(d)) d = addDays(d, dir)
      update({ week: toISODate(d) })
    } else {
      update({ week: toISODate(addDays(monday, dir * 7)) })
    }
  }

  const setView = (v) => {
    if (v === 'day') {
      // Day view opens on today if it's in the week shown, otherwise on that week's Monday.
      const inWeek = TODAY_ISO >= toISODate(monday) && TODAY_ISO <= toISODate(addDays(monday, 6))
      update({ view: 'day', week: inWeek ? TODAY_ISO : toISODate(monday) })
    } else update({ view: null, week: anchor })
  }

  useEffect(() => {
    if (!focus || !state.data) return
    document.getElementById(`appt-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focus, state.data])

  const filtersOn = clinicianId !== 'all' || status !== 'all'
  const clinicians = options.data?.clinicians ?? []
  const label = view === 'day' ? formatDate(anchor, 'weekdayYear') : rangeLabel(from, toISODate(addDays(monday, 4)))

  return (
    <>
      <PageHeader
        title="Clinic schedule"
        subtitle={`${facility?.name} · ${facility?.clinic}`}
        actions={
          <Button icon={Plus} to="/clinic/appointments/new">
            New appointment
          </Button>
        }
      />

      {flash && (
        <Banner tone="success" icon={CircleCheck} role="status" className="mb-4" title={flash.title} onDismiss={() => setFlash(null)}>
          {flash.body}
        </Banner>
      )}

      <FilterBar
        className="mb-4"
        start={
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={view === 'day' ? 'Previous day' : 'Previous week'}
              className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line text-ink hover:bg-[#F7F6F3]"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <p className="min-w-[150px] text-center text-[15px] font-semibold tabular-nums text-ink" aria-live="polite">
              {label}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={view === 'day' ? 'Next day' : 'Next week'}
              className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line text-ink hover:bg-[#F7F6F3]"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <SegmentedControl
              label="Schedule view"
              value={view}
              onChange={setView}
              className="ml-1"
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
              ]}
            />
            {anchor !== TODAY_ISO && toISODate(startOfWeek(TODAY)) !== toISODate(monday) && (
              <Button variant="ghost" size="sm" onClick={() => update({ week: null })}>
                This week
              </Button>
            )}
          </>
        }
        end={
          <>
            <span className="flex items-center gap-1.5 text-[14px] text-slate-600">
              <Funnel className="size-4" aria-hidden="true" />
              Filter
            </span>
            <FilterSelect
              label="Clinician"
              value={clinicianId}
              onChange={(v) => update({ clinician: v })}
              options={[{ value: 'all', label: 'All clinicians' }, ...clinicians.map((c) => ({ value: c.id, label: c.name }))]}
              className="min-w-[170px]"
            />
            <FilterSelect label="Status" value={status} onChange={(v) => update({ status: v })} options={STATUS_OPTIONS} className="min-w-[150px]" />
          </>
        }
      />

      <Card className="overflow-hidden">
        <DataTable caption={`Clinic schedule, ${label}`} minWidth={900}>
          <thead>
            <tr>
              <Th className="w-[84px]">Time</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th>Clinician</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {state.error && !state.data ? (
              <TableMessage colSpan={6}>
                <ErrorState title="We couldn’t load the schedule" error={state.error} onRetry={state.reload} />
              </TableMessage>
            ) : !state.data ? (
              Array.from({ length: 7 }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  {[48, 150, 140, 130, 80, 160].map((w, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" style={{ width: w }} />
                    </Td>
                  ))}
                </tr>
              ))
            ) : state.data.days.length === 0 ? (
              <TableMessage colSpan={6}>
                <EmptyState
                  icon={CalendarX2}
                  title={filtersOn ? 'No appointments match these filters' : `No appointments ${view === 'day' ? 'on this day' : 'this week'}`}
                  description={filtersOn ? 'Try another clinician or status, or clear the filters.' : 'Book a visit and it will show here.'}
                  action={
                    filtersOn ? (
                      <Button variant="neutral" onClick={() => update({ clinician: null, status: null })}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button icon={Plus} to="/clinic/appointments/new">
                        New appointment
                      </Button>
                    )
                  }
                />
              </TableMessage>
            ) : (
              state.data.days.map((day) => (
                <Fragment key={day.date}>
                  <tr>
                    <th scope="colgroup" colSpan={6} className="border-b border-line bg-[#F4F3EF] px-5 py-2 text-left text-[13px] font-semibold text-ink">
                      {formatDate(day.date, 'dayHeading')}
                      {day.date === TODAY_ISO && ' · Today'}
                      <span className="ml-2 font-normal text-slate-600">{pluralize(day.appointments.length, 'appointment')}</span>
                    </th>
                  </tr>
                  {day.appointments.map((a) => (
                    <tr key={a.id} id={`appt-${a.id}`} className={cx('transition-colors hover:bg-[#FAF9F7]', focus === a.id && 'animate-highlight bg-teal-50')}>
                      <Td className="font-bold tabular-nums">{a.time}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={a.patient.initials} tone={a.patient.tone} size="sm" />
                          <div className="min-w-0">
                            <Link to={`/clinic/patients/${a.patientId}`} className="block whitespace-nowrap text-[14px] font-semibold text-ink hover:underline">
                              {a.patient.fullName}
                            </Link>
                            <span className="text-[12px] text-muted">
                              {a.patient.ageShort} · {a.room}
                            </span>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-slate-600">{a.reason}</Td>
                      <Td className="min-w-[132px] text-slate-600">{a.clinician?.name}</Td>
                      <Td>
                        <StatusBadge status={a.displayStatus} className="min-w-[88px] justify-center" />
                      </Td>
                      <Td>
                        <div className="flex gap-1.5">
                          <Button variant="outlineNeutral" size="xs" to={`/clinic/patients/${a.patientId}`} aria-label={`Open ${a.patient.fullName}`}>
                            Open
                          </Button>
                          {a.status === 'upcoming' && (
                            <>
                              <Button
                                variant="outlineNeutral"
                                size="xs"
                                icon={Clock}
                                onClick={() => setRescheduling(a)}
                                aria-label={`Reschedule ${a.patient.fullName}, ${a.time}`}
                              >
                                Reschedule
                              </Button>
                              <Button variant="dangerOutline" size="xs" onClick={() => setCancelling(a)} aria-label={`Cancel ${a.patient.fullName}, ${a.time}`}>
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>

      <RescheduleDialog
        appointment={rescheduling}
        clinicians={clinicians}
        onClose={() => setRescheduling(null)}
        onDone={(result, notify) => {
          setRescheduling(null)
          setFlash({
            title: `${result.appointment.patient.fullName}’s appointment moved to ${slotWords(result.appointment.start)}.`,
            body: notify && result.notified ? `${result.notified} was notified by SMS and in the app.` : 'The caregiver was not notified.',
          })
          setParams((p) => {
            const next = new URLSearchParams(p)
            next.set('week', result.appointment.date)
            next.set('focus', result.appointment.id)
            return next
          })
        }}
      />
      <CancelDialog
        key={cancelling?.id ?? 'none'}
        appointment={cancelling}
        reasons={options.data?.cancelReasons ?? []}
        onClose={() => setCancelling(null)}
        onDone={(result, notify) => {
          setCancelling(null)
          setFlash({
            title: `Appointment cancelled for ${result.appointment.patient.fullName}.`,
            body: notify && result.notified ? `${result.notified} was notified by SMS and in the app.` : 'The caregiver was not notified.',
          })
        }}
      />
    </>
  )
}

function RescheduleDialog({ appointment, clinicians, onClose, onDone }) {
  return (
    <Modal
      open={Boolean(appointment)}
      onClose={onClose}
      title="Reschedule appointment"
      description={appointment ? `${appointment.patient.fullName} · ${appointment.reason}` : ''}
      size="lg"
    >
      {appointment && <RescheduleForm key={appointment.id} appointment={appointment} clinicians={clinicians} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}

function RescheduleForm({ appointment: a, clinicians, onClose, onDone }) {
  const [date, setDate] = useState(a.date < TODAY_ISO ? TODAY_ISO : a.date)
  const [clinicianId, setClinicianId] = useState(a.clinicianId)
  const [time, setTime] = useState('')
  const [notify, setNotify] = useState(true)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const slots = useAsync(() => getAvailability({ date, clinicianId, excludeId: a.id }), [date, clinicianId])

  const save = async () => {
    const found = {}
    if (!date) found.date = 'Choose a date.'
    else if (date < TODAY_ISO) found.date = 'Choose today or a later date.'
    if (!time) found.time = 'Choose one of the available times.'
    if (date === a.date && time === a.time && clinicianId === a.clinicianId) found.time = 'Choose a different time from the current one.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const result = await rescheduleAppointment(a.id, { date, time, clinicianId, notify })
      onDone(result, notify)
    } catch (err) {
      setErrors(err.fields ?? { form: err.message })
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="rounded-xl bg-page px-4 py-3 text-[14px]">
        <span className="text-slate-600">Current: </span>
        <span className="font-semibold text-ink">
          {formatDate(a.start, 'weekdayYear')} · {a.time} · {a.clinician?.name} · {a.room}
        </span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input
          type="date"
          label="New date"
          required
          min={TODAY_ISO}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setTime('')
            setErrors({})
          }}
          error={errors.date}
        />
        <Select
          label="Clinician"
          value={clinicianId}
          onChange={(e) => {
            setClinicianId(e.target.value)
            setTime('')
          }}
        >
          {clinicians.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.title}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-5">
        {slots.error && !slots.data ? (
          <ErrorState title="We couldn’t load free times" error={slots.error} onRetry={slots.reload} className="py-4" />
        ) : !slots.data || slots.loading ? (
          <div role="status" aria-label="Loading free times" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-[10px]" />
            ))}
          </div>
        ) : slots.data.closed ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-800">The MCH clinic is closed at weekends. Choose a weekday.</p>
        ) : slots.data.slots.length === 0 ? (
          <p className="text-[14px] text-slate-600">Choose a date to see free times.</p>
        ) : (
          <>
            <TimeSlotGrid
              label="Available times"
              slots={slots.data.slots}
              value={time}
              onChange={(t) => {
                setTime(t)
                setErrors((e) => ({ ...e, time: undefined }))
              }}
              error={errors.time}
            />
            <p className="mt-2 text-[12px] text-muted">Struck-through times are already booked with this clinician.</p>
          </>
        )}
        {errors.time && (
          <p role="alert" className="mt-2 text-small text-coral-700">
            {errors.time}
          </p>
        )}
      </div>
      <Checkbox checked={notify} onChange={setNotify} className="mt-5">
        Notify the caregiver by SMS and in the app
        {a.caregiver && <span className="block text-[13px] text-muted">{a.caregiver.name} will get the new date and time.</span>}
      </Checkbox>
      {errors.form && (
        <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
          {errors.form}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="neutral" onClick={onClose} disabled={saving}>
          Back
        </Button>
        <Button onClick={save} loading={saving} disabled={!time}>
          Save new time
        </Button>
      </div>
    </div>
  )
}

function CancelDialog({ appointment, reasons, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [saving, setSaving] = useState(false)

  const confirm = async () => {
    if (!reason) {
      setFieldError('Choose a reason for cancelling.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await cancelAppointment(appointment.id, { reason, notify })
      onDone(result, notify)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <ConfirmDialog
      open={Boolean(appointment)}
      onClose={onClose}
      onConfirm={confirm}
      loading={saving}
      error={error}
      title="Cancel this appointment?"
      description={
        appointment ? `${appointment.patient.fullName} · ${formatDate(appointment.start, 'weekday')}, ${appointment.time} · ${appointment.reason}` : ''
      }
      confirmLabel="Cancel appointment"
      cancelLabel="Keep appointment"
    >
      <Select
        label="Reason"
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          setFieldError('')
        }}
        error={fieldError}
        required
      >
        <option value="">Choose a reason</option>
        {reasons.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      <Checkbox checked={notify} onChange={setNotify} className="mt-4">
        Notify the caregiver by SMS and in the app
      </Checkbox>
      {appointment?.doseKeys.length > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
          The doses booked for this visit go back to Planned. Remember to book a new date.
        </p>
      )}
    </ConfirmDialog>
  )
}
