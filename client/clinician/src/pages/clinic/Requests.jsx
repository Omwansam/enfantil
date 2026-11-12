import { CalendarCheck, CalendarClock, CircleCheck, Clock, Inbox, MessageSquareQuote, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getAvailability, getBookingOptions } from '../../api/appointments'
import { confirmRequest, declineRequest, DECLINE_REASONS, getRequests, proposeTime, requestWhen } from '../../api/requests'
import Avatar from '../../components/Avatar'
import Badge from '../../components/Badge'
import Banner from '../../components/Banner'
import Button from '../../components/Button'
import Card from '../../components/Card'
import ConfirmDialog from '../../components/ConfirmDialog'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import Select from '../../components/Select'
import Skeleton, { SkeletonList } from '../../components/Skeleton'
import Tabs, { TabPanel } from '../../components/Tabs'
import Textarea from '../../components/Textarea'
import TimeSlotGrid from '../../components/TimeSlotGrid'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { daysBetween, formatDate, formatTime, now, TODAY_ISO } from '../../utils/dates'
import { formatLocalPhone } from '../../utils/format'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'proposed', label: 'Waiting for parent' },
  { value: 'done', label: 'Handled' },
]

const TYPE_TONES = { antenatal: 'planned', postnatal: 'planned', vaccination: 'given', growth: 'given', sick: 'overdue', general: 'neutral' }

function ago(at) {
  const days = daysBetween(at, now())
  if (days === 0) return `today ${formatTime(at)}`
  if (days === 1) return `yesterday ${formatTime(at)}`
  return `${days} days ago`
}

/** D7 — appointment requests from mothers, with Confirm, Propose new time and Decline. */
export default function Requests() {
  useDocumentTitle('Appointment requests')
  const version = useDataVersion()
  const [params] = useSearchParams()
  const focus = params.get('focus')
  const state = useAsync(getRequests, [], version)
  const options = useAsync(getBookingOptions, [])
  const [tab, setTab] = useState('pending')
  const [action, setAction] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (focus && state.data) document.getElementById(`req-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focus, state.data])

  const all = state.data ?? []
  const lists = {
    pending: all.filter((r) => r.status === 'pending'),
    proposed: all.filter((r) => r.status === 'proposed'),
    done: all.filter((r) => ['confirmed', 'declined'].includes(r.status)),
  }
  const list = lists[tab]

  const done = (message) => {
    setAction(null)
    setFlash(message)
  }

  return (
    <>
      <PageHeader title="Appointment requests" subtitle="From the family app. Each action notifies the parent by SMS and in the app." />
      {flash && (
        <Banner tone="success" icon={CircleCheck} role="status" className="mb-4" title={flash.title} onDismiss={() => setFlash(null)}>
          {flash.body}
        </Banner>
      )}
      <Card className="overflow-hidden">
        <Tabs
          idPrefix="req"
          label="Request status"
          value={tab}
          onChange={setTab}
          className="px-3"
          tabs={TABS.map((t) => ({
            value: t.value,
            label: (
              <span className="inline-flex items-center gap-2">
                {t.label}
                <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-slate-600">{state.data ? lists[t.value].length : '·'}</span>
              </span>
            ),
          }))}
        />
        <TabPanel idPrefix="req" value={tab}>
          {state.error && !state.data ? (
            <ErrorState title="We couldn’t load requests" error={state.error} onRetry={state.reload} />
          ) : !state.data ? (
            <SkeletonList rows={4} label="Loading requests" />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={tab === 'pending' ? 'No requests waiting' : tab === 'proposed' ? 'No proposals waiting for a reply' : 'Nothing handled yet'}
              description={tab === 'pending' ? 'New appointment requests from mothers appear here.' : 'Requests move here once you act on them.'}
            />
          ) : (
            <ul className="divide-y divide-line">
              {list.map((r) => (
                <RequestRow key={r.id} r={r} focused={focus === r.id} onAction={(kind) => setAction({ kind, r })} />
              ))}
            </ul>
          )}
        </TabPanel>
      </Card>

      <SlotDialog
        open={action?.kind === 'confirm' || action?.kind === 'propose'}
        kind={action?.kind}
        r={action?.r}
        clinicians={options.data?.clinicians ?? []}
        rooms={options.data?.rooms ?? []}
        onClose={() => setAction(null)}
        onDone={done}
      />
      <DeclineDialog
        key={action?.kind === 'decline' ? action.r.id : 'none'}
        r={action?.kind === 'decline' ? action.r : null}
        onClose={() => setAction(null)}
        onDone={done}
      />
    </>
  )
}

function profileLink(r) {
  if (!r.subject) return null
  return r.subject.isMother ? `/clinic/mothers/${r.subject.id}` : `/clinic/patients/${r.subject.id}`
}

function RequestRow({ r, focused, onAction }) {
  return (
    <li id={`req-${r.id}`} className={cx('flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start', focused && 'animate-highlight bg-teal-50')}>
      <div className="flex min-w-0 flex-1 gap-3">
        <Avatar initials={r.subject?.initials ?? '?'} tone={r.subject?.tone} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {profileLink(r) ? (
              <Link to={profileLink(r)} className="text-[15px] font-semibold text-ink hover:underline">
                {r.subject.fullName}
              </Link>
            ) : (
              <span className="text-[15px] font-semibold text-ink">{r.forLabel}</span>
            )}
            <Badge tone={TYPE_TONES[r.visitType]}>{r.typeLabel}</Badge>
            {r.subject?.isMother && <span className="text-[12px] font-medium text-[#9D174D]">{r.subject.status.label}</span>}
          </div>
          <p className="mt-0.5 text-[13px] text-slate-600">
            For {r.forLabel} · requested by {r.requestedBy.name} ({r.requestedBy.relationship.toLowerCase()}) · {formatLocalPhone(r.requestedBy.phone)} ·{' '}
            {ago(r.requestedAt)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-ink">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-teal-700" aria-hidden="true" />
              Prefers <strong className="font-semibold">{requestWhen(r.preferredStart)}</strong>
            </span>
            <span className="text-slate-600">{r.clinician ? `with ${r.clinician.name}` : 'any doctor'}</span>
          </p>
          {r.note && (
            <p className="mt-2 flex gap-2 rounded-xl bg-page px-3.5 py-2.5 text-[14px] text-ink">
              <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-slate-600" aria-hidden="true" />
              {r.note}
            </p>
          )}
          {r.status === 'proposed' && r.proposal && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[14px] text-amber-800">
              New time proposed: <strong>{requestWhen(r.proposal.start)}</strong>
              {r.proposal.clinician && ` with ${r.proposal.clinician.name}`}. Waiting for {r.requestedBy.name} to accept or decline in the app.
            </p>
          )}
          {r.status === 'confirmed' && (
            <p className="mt-2 text-[14px] font-medium text-completed">
              Confirmed for {requestWhen(r.confirmedStart)} · {r.requestedBy.name} was notified.
            </p>
          )}
          {r.status === 'declined' && (
            <p className="mt-2 text-[14px] font-medium text-slate-600">
              Declined: {r.declineReason}
              {r.declineNote && ` — ${r.declineNote}`}
            </p>
          )}
        </div>
      </div>
      {['pending', 'proposed'].includes(r.status) && (
        <div className="flex flex-wrap gap-2 lg:w-[340px] lg:justify-end">
          <Button size="sm" icon={CalendarCheck} onClick={() => onAction('confirm')} aria-label={`Confirm request for ${r.forLabel}`}>
            Confirm
          </Button>
          {r.status === 'pending' && (
            <Button
              variant="outlineNeutral"
              size="sm"
              icon={CalendarClock}
              onClick={() => onAction('propose')}
              aria-label={`Propose a new time for ${r.forLabel}`}
            >
              Propose new time
            </Button>
          )}
          <Button variant="dangerOutline" size="sm" icon={X} onClick={() => onAction('decline')} aria-label={`Decline request for ${r.forLabel}`}>
            Decline
          </Button>
        </div>
      )}
    </li>
  )
}

function defaultClinician(r, clinicians) {
  if (r.clinicianId) return r.clinicianId
  if (['antenatal', 'postnatal'].includes(r.visitType)) return 'grace-wanjala'
  if (r.visitType === 'vaccination') return 'joseph-mwangi'
  return clinicians.find((c) => c.id === 'achieng-otieno')?.id ?? clinicians[0]?.id ?? ''
}

function SlotDialog({ open, kind, r, clinicians, rooms, onClose, onDone }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={kind === 'confirm' ? 'Confirm appointment' : 'Propose a new time'}
      description={r ? `${r.forLabel} · ${r.typeLabel} · prefers ${requestWhen(r.preferredStart)}` : ''}
    >
      {open && r && <SlotForm key={`${kind}-${r.id}`} kind={kind} r={r} clinicians={clinicians} rooms={rooms} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}

function SlotForm({ kind, r, clinicians, rooms, onClose, onDone }) {
  const preferredDate = r.preferredStart.slice(0, 10)
  const [date, setDate] = useState(preferredDate < TODAY_ISO ? TODAY_ISO : preferredDate)
  const [clinicianId, setClinicianId] = useState(defaultClinician(r, clinicians))
  const [room, setRoom] = useState(['antenatal', 'postnatal'].includes(r.visitType) ? 'Room 4' : r.visitType === 'vaccination' ? 'Room 1' : 'Room 2')
  const [time, setTime] = useState(kind === 'confirm' ? r.preferredStart.slice(11, 16) : '')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const slots = useAsync(() => getAvailability({ date, clinicianId }), [date, clinicianId])
  const chosen = slots.data?.slots?.find((s) => s.time === time)
  const timeValid = chosen && !chosen.taken && !chosen.past

  const save = async () => {
    const found = {}
    if (!time || !timeValid) found.time = 'Choose a free time.'
    if (kind === 'confirm' && !room) found.room = 'Choose a room.'
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      if (kind === 'confirm') {
        const res = await confirmRequest(r.id, { date, time, clinicianId, room })
        onDone({ title: `Booked: ${r.forLabel}, ${requestWhen(res.start)}.`, body: `${res.notified} was notified by SMS and in the app.` })
      } else {
        const res = await proposeTime(r.id, { date, time, clinicianId, note })
        onDone({ title: `New time proposed: ${requestWhen(res.start)}.`, body: `${res.notified} can accept or decline it in the family app.` })
      }
    } catch (err) {
      setErrors(err.fields ?? { form: err.message })
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          type="date"
          label="Date"
          min={TODAY_ISO}
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setTime('')
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
          error={errors.clinicianId}
        >
          {clinicians.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {kind === 'confirm' && (
          <Select label="Room" value={room} onChange={(e) => setRoom(e.target.value)} error={errors.room}>
            {rooms.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </Select>
        )}
      </div>
      <div className="mt-5">
        {!slots.data || slots.loading ? (
          <div role="status" aria-label="Loading free times" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-[10px]" />
            ))}
          </div>
        ) : slots.data.closed ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-800">The hospital’s clinics are closed on Sundays. Choose another day.</p>
        ) : (
          <TimeSlotGrid
            label={`Free times on ${formatDate(date, 'weekdayYear')}`}
            slots={slots.data.slots}
            value={time}
            onChange={setTime}
            error={errors.time}
          />
        )}
        {errors.time && (
          <p role="alert" className="mt-2 text-small text-coral-700">
            {errors.time}
          </p>
        )}
      </div>
      {kind === 'propose' && (
        <Textarea
          className="mt-4"
          label="Note to the parent"
          optional
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={errors.note}
          placeholder="e.g. Dr. Otieno is not in on Tuesday; Wednesday 11:00 is free."
        />
      )}
      <p className="mt-4 text-[13px] text-slate-600">{r.requestedBy.name} gets an SMS and an in-app notification.</p>
      {errors.form && (
        <p role="alert" className="mt-3 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
          {errors.form}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="neutral" onClick={onClose} disabled={saving}>
          Back
        </Button>
        <Button onClick={save} loading={saving} disabled={!time}>
          {kind === 'confirm' ? 'Confirm and notify' : 'Send proposal'}
        </Button>
      </div>
    </div>
  )
}

function DeclineDialog({ r, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const confirm = async () => {
    if (!reason) {
      setError('Choose a reason. The parent sees it.')
      return
    }
    setSaving(true)
    try {
      const res = await declineRequest(r.id, { reason, note })
      onDone({ title: `Request declined for ${r.forLabel}.`, body: `${res.notified} was told why by SMS and in the app.` })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <ConfirmDialog
      open={Boolean(r)}
      onClose={onClose}
      onConfirm={confirm}
      loading={saving}
      title="Decline this request?"
      description={r ? `${r.forLabel} · ${r.typeLabel} · ${requestWhen(r.preferredStart)}` : ''}
      confirmLabel="Decline request"
      cancelLabel="Keep request"
    >
      <Select
        label="Reason"
        required
        value={reason}
        onChange={(e) => {
          setReason(e.target.value)
          setError('')
        }}
        error={error}
      >
        <option value="">Choose a reason</option>
        {DECLINE_REASONS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </Select>
      <Textarea className="mt-4" label="Message to the parent" optional rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
    </ConfirmDialog>
  )
}
