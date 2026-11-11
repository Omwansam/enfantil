import { Check, CircleCheck, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecordForm, recordImmunization, validateRecord } from '../../api/immunizations'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge, { StatusBadge } from '../../components/Badge'
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
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, TODAY_ISO } from '../../utils/dates'
import { pluralize, possessive } from '../../utils/format'

export default function RecordImmunization() {
  const { patientId } = useParams()
  const version = useDataVersion()
  const state = useAsync(() => getRecordForm(patientId), [patientId], version)
  const [recorded, setRecorded] = useState(null)
  useDocumentTitle('Record immunization')
  const name = state.data?.patient.fullName

  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Patients', to: '/clinic/patients' },
          { label: name ?? 'Patient', to: `/clinic/patients/${patientId}` },
          { label: 'Record immunization' },
        ]}
      />
      <h1 className="mb-5 text-h1 text-ink">Record immunization</h1>

      {recorded && (
        <Banner
          tone="success"
          icon={CircleCheck}
          role="status"
          className="mb-5"
          title={`${recorded.label} recorded.`}
          onDismiss={() => setRecorded(null)}
          action={
            <Link to={`/clinic/patients/${patientId}`} className="inline-flex min-h-10 items-center text-[14px] font-semibold text-teal-700 hover:underline">
              Back to {name ? possessive(name.split(' ')[0]) : 'the'} profile
            </Link>
          }
        >
          Moved from Planned to Administered{recorded.visitCompleted ? ' and today’s visit is marked completed' : ''}.
        </Banner>
      )}

      <AsyncContent
        state={state}
        errorTitle="We couldn’t open the record form"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SkeletonCard lines={8} className="min-h-[520px]" />
            <div className="space-y-5">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
          </div>
        }
      >
        {(data) => <RecordContent key={data.administered.length} data={data} patientId={patientId} recorded={recorded} onRecorded={setRecorded} />}
      </AsyncContent>
    </>
  )
}

function defaultDose(options) {
  return (options.find((o) => o.dueOn === TODAY_ISO) ?? options.find((o) => o.dueNow) ?? options[0])?.key ?? ''
}

function initialForm(data, userId) {
  const key = defaultDose(data.options)
  const option = data.options.find((o) => o.key === key)
  return {
    doseKey: key,
    doseNumber: option?.doseNumber ?? '',
    givenOn: TODAY_ISO,
    batch: '',
    site: option?.site ?? '',
    route: option?.route ?? '',
    givenById: userId,
    notes: '',
  }
}

function RecordContent({ data, patientId, recorded, onRecorded }) {
  const { user } = useAuth()
  const [form, setForm] = useState(() => initialForm(data, user.id))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [saving, setSaving] = useState(false)
  const option = data.options.find((o) => o.key === form.doseKey)
  const { patient } = data

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const chooseDose = (key) => {
    const next = data.options.find((o) => o.key === key)
    setForm((f) => ({ ...f, doseKey: key, doseNumber: next?.doseNumber ?? '', site: next?.site ?? f.site, route: next?.route ?? f.route, batch: '' }))
    setErrors((e) => ({ ...e, doseKey: undefined, doseNumber: undefined, batch: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const found = validateRecord(form, { dob: patient.dob })
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(`rec-${first}`)?.focus()
      return
    }
    setSaving(true)
    try {
      const result = await recordImmunization(patientId, form)
      onRecorded(result)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else setServerError(err.message)
      setSaving(false)
    }
  }

  const dueNow = data.options.filter((o) => o.dueNow)
  const later = data.options.filter((o) => !o.dueNow)
  const allergy = patient.allergies.map((a) => a.substance).join(', ')

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card as="form" onSubmit={onSubmit} noValidate className="p-5 sm:p-6" aria-label="Record immunization">
        <p className="mb-1.5 text-[14px] font-semibold text-ink" id="patient-label">
          Patient
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-page px-3.5 py-3" aria-labelledby="patient-label">
          <Avatar initials={patient.initials} tone={patient.tone} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">{patient.fullName}</p>
            <p className="text-[13px] text-slate-600">
              {patient.sexLabel} · {patient.age} · <span className="font-mono text-[12px]">{patient.patientId}</span>
              {allergy && <> · Allergy: {allergy}</>}
            </p>
          </div>
          <Lock className="size-5 shrink-0 text-slate-600" aria-label="Locked to this patient" />
        </div>

        {data.options.length === 0 ? (
          <p className="mt-5 rounded-xl bg-given-bg px-4 py-3 text-[14px] text-teal-800">
            {patient.firstName} has had every KEPI dose. There is nothing left to record.
          </p>
        ) : (
          <>
            <div className="mt-5 grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Select id="rec-doseKey" label="Vaccine" required value={form.doseKey} onChange={(e) => chooseDose(e.target.value)} error={errors.doseKey}>
                {dueNow.length > 0 && (
                  <optgroup label="Due now">
                    {dueNow.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                        {o.status === 'Overdue' ? ' (overdue)' : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {later.length > 0 && (
                  <optgroup label="Later in the schedule">
                    {later.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label} (due {formatDate(o.dueOn)})
                      </option>
                    ))}
                  </optgroup>
                )}
              </Select>
              <Input
                id="rec-doseNumber"
                label="Dose number"
                required
                inputMode="numeric"
                value={form.doseNumber}
                onChange={(e) => set('doseNumber', e.target.value)}
                error={errors.doseNumber}
              />
              <Input
                id="rec-givenOn"
                type="date"
                label="Date administered"
                required
                min={patient.dob}
                max={TODAY_ISO}
                value={form.givenOn}
                onChange={(e) => set('givenOn', e.target.value)}
                error={errors.givenOn}
              />
              <div>
                <Input
                  id="rec-batch"
                  label="Batch / lot number"
                  required
                  value={form.batch}
                  onChange={(e) => set('batch', e.target.value)}
                  error={errors.batch}
                  list="batch-suggestions"
                  autoComplete="off"
                  spellCheck={false}
                  inputClassName="font-mono uppercase"
                  hint={!errors.batch && option?.stock.length ? `In the fridge: ${option.stock.join(', ')}` : undefined}
                />
                <datalist id="batch-suggestions">
                  {option?.stock.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <Select id="rec-site" label="Site" value={form.site} onChange={(e) => set('site', e.target.value)}>
                {data.sites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select id="rec-route" label="Route" value={form.route} onChange={(e) => set('route', e.target.value)}>
                {data.routes.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              id="rec-givenById"
              label="Administered by"
              required
              className="mt-4"
              value={form.givenById}
              onChange={(e) => set('givenById', e.target.value)}
              error={errors.givenById}
            >
              {data.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.title}
                </option>
              ))}
            </Select>
            <Textarea
              id="rec-notes"
              label="Notes"
              className="mt-4"
              rows={3}
              maxLength={500}
              showCount={false}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              error={errors.notes}
              placeholder="Temperature before vaccination, observation time, any reaction"
            />
            {serverError && (
              <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
                {serverError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
              <Button variant="neutral" to={`/clinic/patients/${patientId}`}>
                Cancel
              </Button>
              <Button type="submit" icon={Check} loading={saving}>
                Save immunization
              </Button>
            </div>
          </>
        )}
      </Card>

      <aside className="space-y-5" aria-label="Planned and administered doses">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 pb-3">
            <h2 className="text-h2">Planned</h2>
            <Badge tone="planned">{data.planned.length} planned</Badge>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {data.planned.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{d.label}</p>
                  <p className={cx('text-[13px]', d.status === 'Overdue' ? 'text-coral-700' : 'text-slate-600')}>
                    {d.status === 'Overdue'
                      ? `Was due ${formatDate(d.dueOn)}`
                      : d.dueOn === TODAY_ISO
                        ? `Due today, ${formatDate(d.dueOn)}`
                        : `Due ${formatDate(d.dueOn)}`}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </li>
            ))}
            {data.planned.length === 0 && <li className="py-3 text-[14px] text-slate-600">Nothing planned.</li>}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 className="text-h2">Administered</h2>
            <Badge tone="given">{pluralize(data.administered.length, 'dose')}</Badge>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {data.administered.slice(0, 3).map((d) => {
              const isNew = recorded?.id === d.id
              return (
                <li key={d.id} className={cx('flex items-center justify-between gap-3 px-5 py-3', isNew && 'animate-highlight bg-teal-50')}>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-ink">
                      {d.name}
                      {isNew && <span className="ml-2 text-[12px] font-semibold text-teal-700">New</span>}
                    </p>
                    <p className="text-[13px] text-slate-600">
                      {formatDate(d.givenOn)} · <span className="font-mono text-[12px]">{d.batch}</span>
                    </p>
                  </div>
                  <StatusBadge status="Given" />
                </li>
              )
            })}
          </ul>
          {data.administered.length > 3 && (
            <Link
              to={`/clinic/patients/${patientId}`}
              className="flex min-h-11 items-center px-5 text-[13px] text-slate-600 hover:text-teal-700 hover:underline"
            >
              + {data.administered.length - 3} earlier doses
            </Link>
          )}
        </Card>
      </aside>
    </div>
  )
}
