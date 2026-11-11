import { CircleCheck, Info, LoaderCircle, Plus, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { checkDuplicate, registerPatient, suggestFirstVisit, validateRegistration } from '../../api/patients'
import Badge from '../../components/Badge'
import Banner from '../../components/Banner'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Checkbox from '../../components/Checkbox'
import FieldMessage from '../../components/FieldMessage'
import Input from '../../components/Input'
import SectionCard from '../../components/SectionCard'
import Select from '../../components/Select'
import { useAsync } from '../../hooks/useAsync'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime, isValidISODate, TODAY_ISO } from '../../utils/dates'
import { schedulePreview } from '../../utils/kepi'
import { possessive } from '../../utils/format'

const RELATIONSHIPS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Older sibling', 'Guardian']

const emptyCaregiver = () => ({ fullName: '', relationship: '', phone: '', email: '' })
const emptyForm = () => ({
  fullName: '',
  dob: '',
  sex: '',
  birthWeight: '',
  birthNotificationNo: '',
  caregiver: { ...emptyCaregiver(), relationship: 'Mother' },
  secondCaregiver: null,
  sendInvite: true,
  consent: false,
  birthDosesGiven: true,
})

const FIELD_IDS = [
  'fullName',
  'dob',
  'sex',
  'birthWeight',
  'caregiver.fullName',
  'caregiver.relationship',
  'caregiver.phone',
  'caregiver.email',
  'secondCaregiver.fullName',
  'secondCaregiver.relationship',
  'secondCaregiver.phone',
  'secondCaregiver.email',
  'consent',
]

export default function RegisterChild() {
  useDocumentTitle('Register a child')
  const [created, setCreated] = useState(null)
  return (
    <>
      <Breadcrumb items={[{ label: 'Patients', to: '/clinic/patients' }, { label: 'Register child' }]} />
      <h1 className="mb-5 text-h1 text-ink">Register a child</h1>
      {created && (
        <Banner
          tone="success"
          icon={CircleCheck}
          role="status"
          className="mb-5"
          title={`${created.fullName} registered.`}
          onDismiss={() => setCreated(null)}
          action={
            <Button to={`/clinic/patients/${created.id}`} size="sm">
              Open profile
            </Button>
          }
        >
          Patient ID <span className="font-mono text-[13px] text-ink">{created.patientId}</span>.{' '}
          {created.inviteSent ? `An Enfantil invite was sent to ${created.caregiverName} by SMS.` : 'No family app invite was sent.'} Planned doses were added
          from the KEPI schedule.
        </Banner>
      )}
      <RegisterForm key={created?.id ?? 'new'} onCreated={setCreated} />
    </>
  )
}

function RegisterForm({ onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  const name = useDebouncedValue(form.fullName, 350)
  const dob = useDebouncedValue(form.dob, 150)
  const dupe = useAsync(() => checkDuplicate({ fullName: name, dob }), [name, dob])
  const suggestion = useAsync(() => suggestFirstVisit(dob), [dob])

  const set = (path, value) => {
    setForm((f) => {
      const [group, key] = path.split('.')
      if (key) return { ...f, [group]: { ...f[group], [key]: value } }
      return { ...f, [path]: value }
    })
    if (errors[path]) setErrors((e) => ({ ...e, [path]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const found = validateRegistration(form)
    if (dupe.data?.match) found.fullName = `${dupe.data.match.fullName} born ${formatDate(dupe.data.match.dob)} is already registered.`
    setErrors(found)
    const first = FIELD_IDS.find((k) => found[k])
    if (first) {
      document.getElementById(`reg-${first.replace('.', '-')}`)?.focus()
      return
    }
    setSaving(true)
    try {
      const created = await registerPatient(form)
      onCreated(created)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else setServerError(err.message)
      setSaving(false)
    }
  }

  const firstName = form.fullName.trim().split(/\s+/)[0] || 'the child'
  const carerFirst = form.caregiver.fullName.trim().split(/\s+/)[0] || 'The caregiver'

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <SectionCard number={1} title="Child" id="sec-child">
          <Input
            id="reg-fullName"
            label="Full name"
            required
            autoComplete="off"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            error={errors.fullName}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              id="reg-dob"
              type="date"
              label="Date of birth"
              required
              max={TODAY_ISO}
              value={form.dob}
              onChange={(e) => set('dob', e.target.value)}
              error={errors.dob}
            />
            <fieldset aria-describedby={errors.sex ? 'reg-sex-error' : undefined}>
              <legend className="mb-1.5 text-[14px] font-semibold text-ink">
                Sex
                <span className="text-coral-700" aria-hidden="true">
                  {' '}
                  *
                </span>
              </legend>
              <div className="grid grid-cols-2 gap-3" id="reg-sex" tabIndex={-1}>
                {[
                  { value: 'female', label: 'Girl' },
                  { value: 'male', label: 'Boy' },
                ].map((o) => (
                  <label
                    key={o.value}
                    className={cx(
                      'focus-within-ring flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-[1.5px] text-[15px] transition-colors',
                      form.sex === o.value
                        ? 'border-teal-700 bg-teal-50 font-semibold text-teal-800'
                        : errors.sex
                          ? 'border-coral-700 bg-white text-ink'
                          : 'border-line bg-white font-medium text-ink hover:border-[#CFCAC1]',
                    )}
                  >
                    <input type="radio" name="sex" value={o.value} checked={form.sex === o.value} onChange={() => set('sex', o.value)} className="sr-only" />
                    {o.label}
                  </label>
                ))}
              </div>
              <FieldMessage id="reg-sex-error" error={errors.sex} />
            </fieldset>
            <Input
              id="reg-birthWeight"
              label="Birth weight"
              inputMode="decimal"
              suffix="kg"
              placeholder="3.1"
              value={form.birthWeight}
              onChange={(e) => set('birthWeight', e.target.value)}
              error={errors.birthWeight}
            />
            <Input
              id="reg-birthNotificationNo"
              label="Birth notification no."
              value={form.birthNotificationNo}
              onChange={(e) => set('birthNotificationNo', e.target.value.toUpperCase())}
              inputClassName="font-mono"
              placeholder="BN-KBU-2026-000000"
              spellCheck={false}
            />
          </div>
          <DuplicateCheck state={dupe} ready={Boolean(name.trim()) && isValidISODate(dob)} />
        </SectionCard>

        <SectionCard number={2} title="Primary caregiver" id="sec-carer">
          <CaregiverFields prefix="caregiver" value={form.caregiver} errors={errors} onChange={set} />
          {form.secondCaregiver ? (
            <div className="mt-5 border-t border-line pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">Second caregiver</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => {
                    setForm((f) => ({ ...f, secondCaregiver: null }))
                    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('secondCaregiver'))))
                  }}
                >
                  Remove
                </Button>
              </div>
              <CaregiverFields prefix="secondCaregiver" value={form.secondCaregiver} errors={errors} onChange={set} />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              className="-ml-2 mt-4"
              onClick={() =>
                setForm((f) => ({ ...f, secondCaregiver: { ...emptyCaregiver(), relationship: f.caregiver.relationship === 'Mother' ? 'Father' : '' } }))
              }
            >
              Add second caregiver
            </Button>
          )}
        </SectionCard>

        <SectionCard number={3} title="Access & consent" id="sec-consent">
          <div className="space-y-4">
            <Checkbox checked={form.sendInvite} onChange={(v) => set('sendInvite', v)}>
              <span className="block font-semibold text-ink">Send an Enfantil invite by SMS</span>
              <span className="block text-[13px]">
                {carerFirst} can see {possessive(firstName)} vaccines, visits and messages in the family app.
              </span>
            </Checkbox>
            <Checkbox id="reg-consent" checked={form.consent} onChange={(v) => set('consent', v)} error={errors.consent} aria-required="true">
              <span className="block font-semibold text-ink">
                Caregiver gave verbal consent
                <span className="text-coral-700" aria-hidden="true">
                  {' '}
                  *
                </span>
              </span>
              <span className="block text-[13px]">
                To store the child&apos;s record and share it with the care team at this facility, as explained in the Privacy Notice.
              </span>
            </Checkbox>
          </div>
        </SectionCard>

        {serverError && (
          <p role="alert" className="rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
            {serverError}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="neutral" to="/clinic/patients">
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Register child
          </Button>
        </div>
      </div>

      <SchedulePreview
        dob={dob}
        birthDosesGiven={form.birthDosesGiven}
        onToggleBirth={() => set('birthDosesGiven', !form.birthDosesGiven)}
        suggestion={suggestion.data}
      />
    </form>
  )
}

function CaregiverFields({ prefix, value, errors, onChange }) {
  const id = (k) => `reg-${prefix}-${k}`
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={id('fullName')}
        label="Full name"
        required
        autoComplete="off"
        value={value.fullName}
        onChange={(e) => onChange(`${prefix}.fullName`, e.target.value)}
        error={errors[`${prefix}.fullName`]}
      />
      <Select
        id={id('relationship')}
        label="Relationship"
        required
        value={value.relationship}
        onChange={(e) => onChange(`${prefix}.relationship`, e.target.value)}
        error={errors[`${prefix}.relationship`]}
      >
        <option value="">Choose</option>
        {RELATIONSHIPS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
      <Input
        id={id('phone')}
        type="tel"
        label="Phone"
        required
        inputMode="tel"
        autoComplete="off"
        placeholder="0712 345 678"
        value={value.phone}
        onChange={(e) => onChange(`${prefix}.phone`, e.target.value)}
        error={errors[`${prefix}.phone`]}
      />
      <Input
        id={id('email')}
        type="email"
        label="Email"
        optional
        autoComplete="off"
        placeholder="name@example.com"
        value={value.email}
        onChange={(e) => onChange(`${prefix}.email`, e.target.value)}
        error={errors[`${prefix}.email`]}
      />
    </div>
  )
}

function DuplicateCheck({ state, ready }) {
  if (!ready) {
    return <p className="mt-4 text-[13px] text-muted">We check for an existing record once you enter the name and date of birth.</p>
  }
  if (state.loading && !state.data?.checked) {
    return (
      <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-page px-3.5 py-3 text-[13px] text-slate-600">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Checking for an existing record…
      </p>
    )
  }
  if (state.error) {
    return (
      <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
        We couldn’t check for duplicates. You can still register; the health records officer will merge any duplicate.{' '}
        <button type="button" onClick={state.reload} className="font-semibold underline">
          Try again
        </button>
      </p>
    )
  }
  const match = state.data?.match
  if (match) {
    return (
      <div role="alert" className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-800">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">{match.fullName}</strong>, born {formatDate(match.dob)}, is already registered as{' '}
          <span className="font-mono">{match.patientId}</span>.{' '}
          <Link to={`/clinic/patients/${match.id}`} className="font-semibold underline">
            Open profile
          </Link>
        </p>
      </div>
    )
  }
  return (
    <p role="status" className="mt-4 flex gap-2.5 rounded-xl bg-info-bg px-3.5 py-3 text-[13px] leading-5 text-ink">
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
      No existing record matches this name and date of birth. A new patient ID will be created.
    </p>
  )
}

function SchedulePreview({ dob, birthDosesGiven, onToggleBirth, suggestion }) {
  const valid = isValidISODate(dob) && dob <= TODAY_ISO
  const rows = valid ? schedulePreview(dob) : []
  return (
    <Card as="aside" className="p-5" aria-labelledby="kepi-preview">
      <h2 id="kepi-preview" className="text-h2">
        KEPI schedule preview
      </h2>
      {!valid ? (
        <p className="mt-2 text-[14px] text-slate-600">Enter the date of birth to see the doses and dates this child will be offered.</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">
            Created from the date of birth ({formatDate(dob)}). Doses given at birth can be recorded now.
          </p>
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{r.title}</p>
                  <p className="text-[12px] text-slate-600">{r.subtitle}</p>
                </div>
                {r.id === 'birth' ? (
                  <button
                    type="button"
                    onClick={onToggleBirth}
                    aria-pressed={birthDosesGiven}
                    aria-label={`BCG and OPV 0 given at birth: ${birthDosesGiven ? 'yes' : 'no'}`}
                    className="-my-2 flex min-h-10 items-center"
                  >
                    {birthDosesGiven ? <Badge tone="given">Given</Badge> : <Badge tone="neutral">Not given</Badge>}
                  </button>
                ) : (
                  <span className={cx('shrink-0 text-[13px]', r.dueOn < TODAY_ISO ? 'font-semibold text-coral-700' : 'text-slate-600')}>
                    {r.dueOn < TODAY_ISO ? 'Due now' : formatDate(r.dueOn)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {suggestion && (
            <p className="mt-3 rounded-xl bg-teal-50 px-3.5 py-3 text-[13px] leading-5 text-teal-800">
              First visit suggestion:{' '}
              <strong className="font-semibold">
                {formatDate(suggestion.start, 'weekday')}, {formatTime(suggestion.start)}
              </strong>{' '}
              with {suggestion.clinicianName}.
            </p>
          )}
        </>
      )}
    </Card>
  )
}
