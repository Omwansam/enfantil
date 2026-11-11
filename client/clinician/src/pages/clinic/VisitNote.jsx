import { Check, CircleAlert, CircleCheck, LoaderCircle, PenLine, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVisitNote, NUTRITION_STATUSES, saveDraft, signNote, validateNote } from '../../api/visitNotes'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import { StatusBadge } from '../../components/Badge'
import Banner from '../../components/Banner'
import Button from '../../components/Button'
import Card from '../../components/Card'
import ChoicePill from '../../components/ChoicePill'
import FieldMessage from '../../components/FieldMessage'
import Input from '../../components/Input'
import { SkeletonCard } from '../../components/Skeleton'
import Switch from '../../components/Switch'
import Textarea from '../../components/Textarea'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { ageInMonths, daysBetween, formatDate, formatTime, TODAY_ISO } from '../../utils/dates'
import { pluralize } from '../../utils/format'

export default function VisitNote() {
  const { visitId } = useParams()
  const { user } = useAuth()
  const version = useDataVersion()
  const state = useAsync(() => getVisitNote(visitId, user.id), [visitId, user.id], version)
  const [signed, setSigned] = useState(null)
  useDocumentTitle(state.data ? `Visit note · ${state.data.patient.fullName}` : 'Visit note')

  return (
    <AsyncContent
      state={state}
      errorTitle="We couldn’t open this visit note"
      skeleton={
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={6} />
          </div>
          <SkeletonCard lines={4} />
        </div>
      }
    >
      {(data) => (
        <NoteEditor
          key={data.note.id}
          data={data}
          signed={signed?.id === data.note.id ? signed : null}
          onSigned={(r) => setSigned({ ...r, id: data.note.id })}
        />
      )}
    </AsyncContent>
  )
}

function fromNote(note) {
  return {
    measurements: { weightKg: '', heightCm: '', muacCm: '', tempC: '', ...note.measurements },
    history: note.history ?? '',
    nutritionStatus: note.nutritionStatus ?? '',
    plan: note.plan ?? '',
    followUpOn: note.followUpOn ?? '',
    diagnosis: note.diagnosis ?? '',
    caregiverSummary: note.caregiverSummary ?? '',
    shareWithCaregiver: note.shareWithCaregiver ?? true,
  }
}

/** Expected weight gain per month for the child's age (kg), used for the trend line. */
function expectedGainPerMonth(months) {
  if (months < 6) return 0.6
  if (months < 12) return 0.3
  if (months < 24) return 0.2
  return 0.17
}

function weightTrend(current, previous, dob, previousStatus) {
  const now = Number(current)
  if (!previous?.weightKg || !current || !Number.isFinite(now)) return null
  const delta = Math.round((now - previous.weightKg) * 10) / 10
  const months = Math.max(0.5, daysBetween(previous.date, TODAY_ISO) / 30.44)
  const expected = expectedGainPerMonth(ageInMonths(dob, previous.date)) * months
  const since = `since ${formatDate(previous.date, 'short')}`
  const amount = `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} kg ${since}`
  if (delta < 0) return { tone: 'alert', icon: TrendingDown, text: `${amount} · weight loss, check feeding and recent illness` }
  if (delta >= expected * 0.8) {
    return {
      tone: 'good',
      icon: TrendingUp,
      text: `${amount} · ${previousStatus && previousStatus !== 'normal' ? 'weight-for-age back on track' : 'gaining as expected'}`,
    }
  }
  return { tone: 'warn', icon: TrendingUp, text: `${amount} · below expected gain` }
}

const FIELD_IDS = {
  'measurements.weightKg': 'note-weight',
  'measurements.heightCm': 'note-height',
  'measurements.muacCm': 'note-muac',
  'measurements.tempC': 'note-temp',
  history: 'note-history',
  nutritionStatus: 'note-nutrition',
  plan: 'note-plan',
  followUpOn: 'note-followup',
  caregiverSummary: 'note-summary',
}

function NoteEditor({ data, signed, onSigned }) {
  const { user } = useAuth()
  const { note, patient, appointment, previousMeasurement, previousVisit, queue, caregiver } = data
  const readOnly = note.status === 'signed'
  const [form, setForm] = useState(() => fromNote(note))
  const [errors, setErrors] = useState({})
  const [saveState, setSaveState] = useState({ status: note.savedAt ? 'saved' : 'idle', at: note.savedAt })
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')
  const dirty = useRef(false)
  const summaryRef = useRef(null)

  // Autosave the draft 1.5 s after the last change.
  useEffect(() => {
    if (!dirty.current || readOnly) return undefined
    const id = setTimeout(async () => {
      const found = validateNote(form)
      if (Object.keys(found).length) return
      setSaveState((s) => ({ ...s, status: 'saving' }))
      try {
        const r = await saveDraft(note.id, form)
        dirty.current = false
        setSaveState({ status: 'saved', at: r.savedAt })
      } catch {
        setSaveState((s) => ({ ...s, status: 'error' }))
      }
    }, 1500)
    return () => clearTimeout(id)
  }, [form, note.id, readOnly])

  const update = (path, value) => {
    dirty.current = true
    setForm((f) => {
      if (path.startsWith('measurements.')) {
        const key = path.split('.')[1]
        return { ...f, measurements: { ...f.measurements, [key]: value } }
      }
      return { ...f, [path]: value }
    })
    if (errors[path]) setErrors((e) => ({ ...e, [path]: undefined }))
  }

  const saveNow = async () => {
    const found = validateNote(form)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaveState((s) => ({ ...s, status: 'saving' }))
    try {
      const r = await saveDraft(note.id, form)
      dirty.current = false
      setSaveState({ status: 'saved', at: r.savedAt })
    } catch {
      setSaveState((s) => ({ ...s, status: 'error' }))
    }
  }

  const sign = async () => {
    setSignError('')
    const found = validateNote(form, { signing: true })
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSigning(true)
    try {
      dirty.current = false
      const result = await signNote(note.id, form, user.id)
      onSigned(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else setSignError(err.message)
      setSigning(false)
    }
  }

  const trend = weightTrend(form.measurements.weightKg, previousMeasurement, patient.dob, previousVisit?.nutritionStatus)
  const errorKeys = Object.keys(errors).filter((k) => errors[k])

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar initials={patient.initials} tone={patient.tone} size="lg" />
          <div>
            <h1 className="text-[26px] font-bold leading-8 tracking-[-0.01em] text-ink">Visit note · {patient.fullName}</h1>
            <p className="text-[14px] text-slate-600">
              {patient.sexLabel} · {patient.age} · {appointment.reason} · {appointment.when} · {appointment.room}
            </p>
          </div>
        </div>
        <SaveStatus readOnly={readOnly} note={note} saveState={saveState} />
      </div>

      {signed && (
        <Banner
          tone="success"
          icon={CircleCheck}
          role="status"
          className="mb-5"
          title={`Visit note for ${signed.patientName} signed.`}
          action={
            signed.nextId ? (
              <Link
                to={`/clinic/visits/${signed.nextId}/note`}
                className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline"
              >
                Next note →
              </Link>
            ) : (
              <Link to="/clinic" className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline">
                Back to dashboard
              </Link>
            )
          }
        >
          {signed.shared && signed.caregiverName
            ? `${signed.caregiverName} can now see the summary in the family app.`
            : 'The summary was not shared with the caregiver.'}
        </Banner>
      )}
      {readOnly && !signed && (
        <Banner tone="info" className="mb-5" role="status" title="This note is signed.">
          Signed by {data.signedBy?.name} on {formatDate(note.signedAt)} at {formatTime(note.signedAt)}. Signed notes can’t be edited.
        </Banner>
      )}
      {errorKeys.length > 0 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="mb-5 rounded-xl border border-coral-200 bg-coral-50 px-4 py-3 outline-none">
          <p className="flex items-start gap-2.5 text-[14px] text-ink">
            <CircleAlert className="mt-0.5 size-[18px] shrink-0 text-coral-700" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-coral-700">{pluralize(errorKeys.length, 'field needs', 'fields need')} attention</strong> before you can
              sign.
            </span>
          </p>
          <ul className="mt-1.5 list-disc pl-12 text-[13px] text-coral-700">
            {errorKeys.map((k) => (
              <li key={k}>
                <a href={`#${FIELD_IDS[k] ?? ''}`} className="underline underline-offset-2">
                  {errors[k]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <fieldset disabled={readOnly || signing} className="min-w-0 space-y-5">
          <legend className="sr-only">Visit note for {patient.fullName}</legend>
          <Card className="p-5">
            <h2 className="text-h2">Measurements</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Input
                id="note-weight"
                label="Weight"
                suffix="kg"
                inputMode="decimal"
                value={form.measurements.weightKg}
                onChange={(e) => update('measurements.weightKg', e.target.value)}
                error={errors['measurements.weightKg']}
              />
              <Input
                id="note-height"
                label="Height"
                suffix="cm"
                inputMode="decimal"
                value={form.measurements.heightCm}
                onChange={(e) => update('measurements.heightCm', e.target.value)}
                error={errors['measurements.heightCm']}
              />
              <Input
                id="note-muac"
                label="MUAC"
                suffix="cm"
                inputMode="decimal"
                value={form.measurements.muacCm}
                onChange={(e) => update('measurements.muacCm', e.target.value)}
                error={errors['measurements.muacCm']}
              />
              <Input
                id="note-temp"
                label="Temp"
                suffix="°C"
                inputMode="decimal"
                value={form.measurements.tempC}
                onChange={(e) => update('measurements.tempC', e.target.value)}
                error={errors['measurements.tempC']}
              />
            </div>
            {trend ? (
              <p
                className={cx(
                  'mt-3 flex items-center gap-1.5 text-[13px]',
                  trend.tone === 'good' ? 'text-completed' : trend.tone === 'warn' ? 'text-amber-700' : 'text-coral-700',
                )}
              >
                <trend.icon className="size-4 shrink-0" aria-hidden="true" />
                {trend.text}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-muted">
                {previousMeasurement ? 'Enter the weight to compare with the last visit.' : 'First weight recorded at this clinic.'}
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-h2">Clinical note</h2>
            <Textarea
              id="note-history"
              label="History & findings"
              className="mt-3"
              rows={3}
              value={form.history}
              onChange={(e) => update('history', e.target.value)}
              error={errors.history}
            />
            <fieldset className="mt-4" aria-describedby={errors.nutritionStatus ? 'note-nutrition-error' : undefined}>
              <legend id="note-nutrition" tabIndex={-1} className="mb-2 text-[14px] font-semibold text-ink">
                Nutrition status
              </legend>
              <div className="flex flex-wrap gap-2">
                {NUTRITION_STATUSES.map((s) => (
                  <ChoicePill
                    key={s.value}
                    name="nutrition"
                    value={s.value}
                    checked={form.nutritionStatus === s.value}
                    onChange={(v) => update('nutritionStatus', v)}
                    className="min-h-10 px-3.5 text-[13px]"
                  >
                    {s.label}
                  </ChoicePill>
                ))}
              </div>
              <FieldMessage id="note-nutrition-error" error={errors.nutritionStatus} />
            </fieldset>
            <Textarea
              id="note-plan"
              label="Plan"
              className="mt-4"
              rows={2}
              value={form.plan}
              onChange={(e) => update('plan', e.target.value)}
              error={errors.plan}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                id="note-followup"
                type="date"
                label="Follow-up"
                min={TODAY_ISO}
                value={form.followUpOn}
                onChange={(e) => update('followUpOn', e.target.value)}
                error={errors.followUpOn}
              />
              <Input
                id="note-diagnosis"
                label="Diagnosis code"
                optional
                value={form.diagnosis}
                onChange={(e) => update('diagnosis', e.target.value)}
                placeholder="ICD-11 code or description"
              />
            </div>
          </Card>

          <Card className="p-5">
            <Switch
              label={<span className="text-h2 text-ink">Summary for caregiver</span>}
              checked={form.shareWithCaregiver}
              onChange={(v) => update('shareWithCaregiver', v)}
              disabled={readOnly}
            />
            <label htmlFor="note-summary" className="sr-only">
              Summary for caregiver
            </label>
            <textarea
              id="note-summary"
              rows={2}
              value={form.caregiverSummary}
              maxLength={400}
              disabled={!form.shareWithCaregiver || readOnly}
              onChange={(e) => update('caregiverSummary', e.target.value)}
              aria-invalid={errors.caregiverSummary ? true : undefined}
              aria-describedby="note-summary-hint"
              placeholder="Plain words the family will understand"
              className={cx(
                'mt-2 block w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-[15px] leading-6 text-ink placeholder:text-[#6B7480] disabled:bg-[#F4F3F0] disabled:text-muted',
                errors.caregiverSummary ? 'border-coral-700' : 'border-line hover:border-[#D3CFC7]',
              )}
            />
            <FieldMessage
              id="note-summary-hint"
              error={errors.caregiverSummary}
              hint={
                form.shareWithCaregiver
                  ? caregiver?.hasApp
                    ? `${caregiver.name} will see this in the family app after you sign.`
                    : `${caregiver?.name ?? 'The caregiver'} will get this by SMS after you sign.`
                  : 'Not shared. Only the care team will see this note.'
              }
            />
          </Card>

          {!readOnly && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {signError && (
                <p role="alert" className="mr-auto text-[14px] text-coral-700">
                  {signError}
                </p>
              )}
              <Button variant="neutral" onClick={saveNow} loading={saveState.status === 'saving' && !signing}>
                Save draft
              </Button>
              <Button icon={PenLine} onClick={sign} loading={signing}>
                Sign &amp; complete
              </Button>
            </div>
          )}
        </fieldset>

        <aside className="space-y-5" aria-label="Notes to finish and previous visit">
          <Card className="p-4">
            <h2 className="px-1 pb-2 text-h2">Notes to finish</h2>
            {queue.length === 0 ? (
              <p className="px-1 py-2 text-[14px] text-slate-600">All notes are signed.</p>
            ) : (
              <ul className="space-y-1">
                {queue.map((q) => {
                  const current = q.id === note.id
                  return (
                    <li key={q.id}>
                      <Link
                        to={`/clinic/visits/${q.id}/note`}
                        aria-current={current ? 'page' : undefined}
                        className={cx('flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors', current ? 'bg-teal-50' : 'hover:bg-[#FAF9F7]')}
                      >
                        <Avatar initials={q.patient.initials} tone={q.patient.tone} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">{q.patient.fullName}</span>
                          <span className="block text-[12px] text-slate-600">
                            {q.reason} · {q.when}
                          </span>
                        </span>
                        {current ? (
                          <StatusBadge status="Open" />
                        ) : q.daysOld > 0 ? (
                          <StatusBadge status="Overdue" label={pluralize(q.daysOld, 'day')} />
                        ) : q.status === 'draft' ? (
                          <StatusBadge status="Draft" />
                        ) : (
                          <StatusBadge status="Upcoming" label="To do" />
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="text-h2">{previousVisit ? `Previous visit · ${formatDate(previousVisit.date, 'short')}` : 'Previous visit'}</h2>
            {previousVisit ? (
              <>
                <p className="mt-2 text-[14px] leading-[22px] text-slate-600">{previousVisit.summary}</p>
                <p className="mt-3 text-[13px] text-muted">{previousVisit.author}</p>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-slate-600">No signed notes from earlier visits.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  )
}

function SaveStatus({ readOnly, note, saveState }) {
  if (readOnly) {
    return (
      <p className="flex items-center gap-1.5 text-[13px] text-completed">
        <Check className="size-4" aria-hidden="true" />
        Signed {formatTime(note.signedAt)}
      </p>
    )
  }
  const content = {
    saving: (
      <>
        <LoaderCircle className="size-4 animate-spin text-slate-600" aria-hidden="true" />
        Saving draft…
      </>
    ),
    saved: (
      <>
        <Check className="size-4 text-completed" aria-hidden="true" />
        Draft saved {saveState.at ? formatTime(saveState.at) : ''}
      </>
    ),
    error: (
      <>
        <CircleAlert className="size-4 text-coral-700" aria-hidden="true" />
        <span className="text-coral-700">Couldn’t save. We’ll keep trying when you edit.</span>
      </>
    ),
    idle: 'Not saved yet',
  }[saveState.status]
  return (
    <p role="status" className="flex items-center gap-1.5 text-[13px] text-slate-600">
      {content}
    </p>
  )
}
