import { Link2, PenLine } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { addChildManually, findChildRecord, linkChildRecord } from '../api/children'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import Card from '../components/Card'
import ChoicePill from '../components/ChoicePill'
import CodeInput from '../components/CodeInput'
import FieldMessage from '../components/FieldMessage'
import Input from '../components/Input'
import OptionCard from '../components/OptionCard'
import PageHeader from '../components/PageHeader'
import { labelClass } from '../components/fieldStyles'
import { useChildren } from '../context/ChildContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ageInMonths, formatDate, TODAY, toISODate } from '../utils/dates'
import { formatLocalPhone, initials } from '../utils/format'

export default function AddChild() {
  useDocumentTitle('Add a child')
  const location = useLocation()
  const [mode, setMode] = useState('link')

  return (
    <>
      <Breadcrumb items={[{ label: 'Settings', to: '/family/settings' }, { label: 'Add a child' }]} />
      <PageHeader title="Add a child" subtitle="Link the record Tumaini Family Hospital already has, or enter the details yourself." />

      <fieldset>
        <legend className="sr-only">How do you want to add your child?</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <OptionCard
            name="add-mode"
            value="link"
            checked={mode === 'link'}
            onChange={setMode}
            icon={Link2}
            title="Link a hospital record"
            description="Vaccines and visits appear straight away"
            className="min-h-[76px] rounded-2xl"
          />
          <OptionCard
            name="add-mode"
            value="manual"
            checked={mode === 'manual'}
            onChange={setMode}
            icon={PenLine}
            title="Enter details myself"
            description="The hospital confirms them at the next visit"
            className="min-h-[76px] rounded-2xl"
          />
        </div>
      </fieldset>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">
        <Card className="p-5 sm:p-6">{mode === 'link' ? <LinkRecordForm prefill={location.state} /> : <ManualForm />}</Card>
        <Card as="aside" className="p-5 sm:p-6">
          <h2 className="text-h2">Where&apos;s the patient ID?</h2>
          <div className="mt-4 rounded-xl bg-page px-6 py-6" aria-hidden="true">
            <div className="mx-auto max-w-[210px] rounded-lg bg-white p-3 shadow-card">
              <span className="block h-2 w-3/4 rounded bg-[#E7E5E0]" />
              <span className="mt-2 block h-2 w-1/2 rounded bg-[#E7E5E0]" />
              <span className="mt-3 block rounded-md border-2 border-coral-500 px-2 py-1.5 font-mono text-[11px] font-bold text-ink">TFH-P-250118-007</span>
              <span className="mt-3 block h-2 w-2/3 rounded bg-[#E7E5E0]" />
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-6 text-slate-600">
            It&apos;s printed on page 1 of the Mother &amp; Child Health handbook, or on the hospital card. No ID? Choose “Enter details myself”.
          </p>
        </Card>
      </div>
    </>
  )
}

function LinkRecordForm({ prefill }) {
  const navigate = useNavigate()
  const { selectChild } = useChildren()
  const [form, setForm] = useState({ patientId: prefill?.patientId ?? '', dob: prefill?.dob ?? '' })
  const [errors, setErrors] = useState({})
  const [record, setRecord] = useState(null)
  const [finding, setFinding] = useState(false)
  const [step, setStep] = useState('find')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [linking, setLinking] = useState(false)

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
    setRecord(null)
    setStep('find')
  }

  const find = async (event) => {
    event.preventDefault()
    const found = {}
    if (!form.patientId.trim()) found.patientId = 'Enter the hospital patient ID'
    if (!form.dob) found.dob = 'Enter your child’s date of birth'
    else if (form.dob > toISODate(TODAY)) found.dob = 'The date of birth can’t be in the future'
    setErrors(found)
    if (Object.keys(found).length) return
    setFinding(true)
    try {
      setRecord(await findChildRecord(form))
    } catch (err) {
      setErrors({ [err.field ?? 'patientId']: err.message })
    } finally {
      setFinding(false)
    }
  }

  const confirm = async (event) => {
    event.preventDefault()
    if (code.length < 6) {
      setCodeError('Enter all 6 digits of the code')
      return
    }
    setLinking(true)
    setCodeError('')
    try {
      const child = await linkChildRecord({ patientId: record.patientId, dob: record.dob, code })
      selectChild(child.id)
      navigate('/family', { state: { flash: `${child.firstName}'s record is now linked. Vaccines and visits are on your account.` } })
    } catch (err) {
      setCodeError(err.message)
      setLinking(false)
    }
  }

  return (
    <>
      <form onSubmit={find} noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Hospital patient ID"
            placeholder="TFH-P-250118-007"
            autoCapitalize="characters"
            inputClassName="font-mono uppercase"
            value={form.patientId}
            onChange={update('patientId')}
            error={errors.patientId}
          />
          <Input label="Child's date of birth" type="date" max={toISODate(TODAY)} value={form.dob} onChange={update('dob')} error={errors.dob} />
        </div>
        <Button type="submit" variant="secondary" className="mt-5" loading={finding}>
          Find record
        </Button>
      </form>

      {record && (
        <div className="mt-5 space-y-4" aria-live="polite">
          <div className="flex items-center gap-4 rounded-xl border border-teal-100 bg-teal-50 p-4">
            <Avatar initials={initials(`${record.firstName} ${record.lastName}`)} tone={record.sex === 'female' ? 'coral' : 'indigo'} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold text-ink">
                {record.firstName} {record.lastName}
              </p>
              <p className="text-[14px] text-slate-600">
                Born {formatDate(record.dob)} · {record.facility?.name} · {record.dosesOnRecord} doses on record
              </p>
            </div>
            <Badge tone={record.alreadyLinked ? 'planned' : 'completed'}>{record.alreadyLinked ? 'Already added' : 'Record found'}</Badge>
          </div>

          {record.alreadyLinked ? (
            <Alert tone="info">
              {record.firstName} is already on your account. You can see {record.sex === 'female' ? 'her' : 'his'} records by choosing {record.firstName} in the child switcher.
            </Alert>
          ) : step === 'find' ? (
            <>
              <p className="text-[14px] text-slate-600">
                {record.facility?.name} will send a confirmation code to <strong className="text-ink">{formatLocalPhone(record.phone)}</strong> before the record is
                shared with you.
              </p>
              <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
                <Button to="/family/settings" variant="secondary">
                  Cancel
                </Button>
                <Button onClick={() => setStep('code')}>Add child</Button>
              </div>
            </>
          ) : (
            <form onSubmit={confirm} noValidate className="space-y-4 border-t border-line pt-5">
              <p className="text-[14px] text-slate-600">
                We sent a code from {record.facility?.shortName} to <strong className="text-ink">{formatLocalPhone(record.phone)}</strong>.
              </p>
              <CodeInput value={code} onChange={setCode} error={codeError} autoFocus label="Confirmation code" idPrefix="link-code" />
              <p className="text-small text-muted">Demo: any 6 digits work (000000 shows the wrong-code error).</p>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => setStep('find')}>
                  Back
                </Button>
                <Button type="submit" loading={linking}>
                  Confirm and add
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  )
}

function ManualForm() {
  const navigate = useNavigate()
  const { selectChild } = useChildren()
  const [form, setForm] = useState({ firstName: '', lastName: '', dob: '', sex: '', placeOfBirth: '', birthWeightKg: '', birthLengthCm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const set = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Enter your child’s first name'
    if (!form.lastName.trim()) e.lastName = 'Enter your child’s last name'
    if (!form.dob) e.dob = 'Enter the date of birth'
    else if (form.dob > toISODate(TODAY)) e.dob = 'The date of birth can’t be in the future'
    else if (ageInMonths(form.dob) >= 60) e.dob = 'Enfantil follows the KEPI schedule for children under 5'
    if (!form.sex) e.sex = 'Choose girl or boy'
    if (!form.placeOfBirth.trim()) e.placeOfBirth = 'Enter where your child was born, e.g. the hospital or “Home”'
    const w = Number(form.birthWeightKg)
    if (form.birthWeightKg && (Number.isNaN(w) || w < 0.5 || w > 6)) e.birthWeightKg = 'Enter a weight between 0.5 and 6 kg'
    const l = Number(form.birthLengthCm)
    if (form.birthLengthCm && (Number.isNaN(l) || l < 30 || l > 60)) e.birthLengthCm = 'Enter a length between 30 and 60 cm'
    return e
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const child = await addChildManually(form)
      selectChild(child.id)
      navigate('/family', { state: { flash: `${child.firstName} has been added. Tumaini Family Hospital will confirm the details at the next visit.` } })
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="First name" autoComplete="off" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
        <Input label="Last name" autoComplete="off" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
        <Input label="Date of birth" type="date" max={toISODate(TODAY)} value={form.dob} onChange={set('dob')} error={errors.dob} />
        <fieldset>
          <legend className={`mb-1.5 ${labelClass}`}>Sex</legend>
          <div className="flex gap-2">
            <ChoicePill name="sex" value="female" checked={form.sex === 'female'} onChange={set('sex')}>
              Girl
            </ChoicePill>
            <ChoicePill name="sex" value="male" checked={form.sex === 'male'} onChange={set('sex')}>
              Boy
            </ChoicePill>
          </div>
          <FieldMessage error={errors.sex} />
        </fieldset>
        <Input className="sm:col-span-2" label="Place of birth" placeholder="e.g. Tumaini Family Hospital" value={form.placeOfBirth} onChange={set('placeOfBirth')} error={errors.placeOfBirth} />
        <Input label="Birth weight (kg)" optional type="number" inputMode="decimal" step="0.1" min="0.5" max="6" value={form.birthWeightKg} onChange={set('birthWeightKg')} error={errors.birthWeightKg} />
        <Input label="Birth length (cm)" optional type="number" inputMode="decimal" step="0.5" min="30" max="60" value={form.birthLengthCm} onChange={set('birthLengthCm')} error={errors.birthLengthCm} />
      </div>
      <p className="mt-4 text-small text-slate-600">Find these in the Mother &amp; Child Health handbook. The hospital checks them at the next visit.</p>
      {saveError && (
        <Alert tone="coral" role="alert" className="mt-4">
          {saveError}
        </Alert>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
        <Button to="/family/settings" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Add child
        </Button>
      </div>
    </form>
  )
}
