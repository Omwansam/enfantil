import { Baby, Check, CircleCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  BLEEDING,
  DELIVERY_MODES,
  FP_METHODS,
  getPostnatalForm,
  recordDelivery,
  recordPostnatalVisit,
  UTERUS,
  validateDelivery,
  validatePostnatal,
  WOUND,
} from '../../api/mothers'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import { StatusBadge } from '../../components/Badge'
import Banner from '../../components/Banner'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Checkbox from '../../components/Checkbox'
import ConfirmDialog from '../../components/ConfirmDialog'
import Input from '../../components/Input'
import SegmentedControl from '../../components/SegmentedControl'
import Select from '../../components/Select'
import { SkeletonCard } from '../../components/Skeleton'
import Textarea from '../../components/Textarea'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, TODAY_ISO } from '../../utils/dates'
import { formatGA, gestationalAge, POSTNATAL_VISITS } from '../../utils/pregnancy'

/** D4 — record a delivery (creates the baby's record) and postnatal visits. */
export default function RecordPostnatal() {
  const { motherId } = useParams()
  const [params, setParams] = useSearchParams()
  const version = useDataVersion()
  const state = useAsync(() => getPostnatalForm(motherId), [motherId], version)
  useDocumentTitle('Delivery & postnatal care')
  const data = state.data
  const [delivered, setDelivered] = useState(null)
  const tab = data?.pregnant ? (params.get('tab') === 'visit' ? 'visit' : 'delivery') : 'visit'
  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Patients', to: '/clinic/patients?group=mothers' },
          { label: data?.mother.fullName ?? 'Mother', to: `/clinic/mothers/${motherId}` },
          { label: 'Delivery & postnatal care' },
        ]}
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Delivery &amp; postnatal care</h1>
        {data && !delivered && (
          <SegmentedControl
            label="What to record"
            value={tab}
            onChange={(v) => setParams({ tab: v }, { replace: true })}
            options={[
              { value: 'delivery', label: 'Delivery' },
              { value: 'visit', label: 'Postnatal visit' },
            ]}
          />
        )}
      </div>
      <AsyncContent
        state={state}
        errorTitle="We couldn’t open this form"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SkeletonCard lines={9} />
            <SkeletonCard lines={4} />
          </div>
        }
      >
        {(d) =>
          delivered ? (
            <DeliveryDone done={delivered} mother={d.mother} motherId={motherId} />
          ) : tab === 'delivery' ? (
            d.pregnant ? (
              <DeliveryForm data={d} motherId={motherId} onDone={setDelivered} />
            ) : (
              <Card className="p-6">
                <p className="text-[15px] text-slate-600">The delivery is already recorded. Record a postnatal visit instead.</p>
              </Card>
            )
          ) : d.delivery ? (
            <PostnatalForm data={d} motherId={motherId} />
          ) : (
            <Card className="p-6">
              <p className="text-[15px] text-slate-600">Record the delivery first. Postnatal visits follow the birth.</p>
              <Button className="mt-4" onClick={() => setParams({ tab: 'delivery' })}>
                Record delivery
              </Button>
            </Card>
          )
        }
      </AsyncContent>
    </>
  )
}

function MotherCard({ data, extra }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-page px-3.5 py-3">
      <Avatar initials={data.mother.initials} tone={data.mother.tone} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">{data.mother.fullName}</p>
        <p className="text-[13px] text-slate-600">
          {data.mother.status.label} · <span className="font-mono text-[12px]">{data.mother.patientId}</span>
          {extra}
        </p>
      </div>
    </div>
  )
}

function DeliveryDone({ done, mother, motherId }) {
  return (
    <Card className="mx-auto max-w-xl p-6 text-center sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-completed-bg text-completed">
        <CircleCheck className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-h1" role="status">
        Delivery recorded
      </h2>
      <p className="mt-2 text-[15px] text-slate-600">
        {done.childId ? (
          <>
            {done.babyName}’s record was created as <span className="font-mono font-semibold text-ink">{done.childPatientId}</span>, linked to {mother.firstName}, and the KEPI schedule was generated.
          </>
        ) : (
          `${mother.firstName}’s record is updated.`
        )}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {done.childId && <Button to={`/clinic/patients/${done.childId}`}>Open infant record</Button>}
        <Button variant="secondary" to={`/clinic/mothers/${motherId}`}>
          Back to {mother.firstName}’s profile
        </Button>
      </div>
    </Card>
  )
}

function DeliveryForm({ data, motherId, onDone }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    date: TODAY_ISO,
    time: '',
    mode: 'Spontaneous vaginal delivery',
    outcome: 'Live birth',
    babyFirstName: '',
    babySex: '',
    babyWeightKg: '',
    babyLengthCm: '',
    apgar: '',
    bloodLoss: '',
    birthDoses: true,
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const ga = form.date ? gestationalAge(data.lmp, form.date) : null
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const save = async (e) => {
    e.preventDefault()
    const found = validateDelivery(form, { lmp: data.lmp })
    setErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`del-${Object.keys(found)[0]}`)?.focus()
      return
    }
    setSaving(true)
    try {
      onDone(await recordDelivery(motherId, form, user.id))
    } catch (err) {
      setErrors(err.fields ?? { form: err.message })
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card as="form" onSubmit={save} noValidate className="p-5 sm:p-6" aria-label="Record delivery">
        <MotherCard data={data} extra={` · due ${formatDate(data.edd)}`} />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Input
            id="del-date"
            type="date"
            label="Date of birth"
            required
            max={TODAY_ISO}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <Input id="del-time" type="time" label="Time" required value={form.time} onChange={(e) => set('time', e.target.value)} error={errors.time} />
          <div>
            <p className="mb-1.5 text-[14px] font-semibold text-ink">Gestational age</p>
            <p className="flex min-h-11 items-center rounded-xl border border-line bg-page px-3.5 text-[15px] font-semibold">
              {ga ? `${formatGA(ga)} weeks` : '—'}
            </p>
          </div>
          <Select
            id="del-mode"
            label="Type of delivery"
            required
            value={form.mode}
            onChange={(e) => set('mode', e.target.value)}
            error={errors.mode}
            className="sm:col-span-2"
          >
            {DELIVERY_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Select id="del-outcome" label="Outcome" required value={form.outcome} onChange={(e) => set('outcome', e.target.value)} error={errors.outcome}>
            <option>Live birth</option>
            <option>Stillbirth</option>
          </Select>
        </div>
        <fieldset className="mt-5 rounded-xl border border-line p-4">
          <legend className="px-1 text-[15px] font-semibold text-ink">Baby</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {form.outcome === 'Live birth' && (
              <>
                <Input
                  id="del-babyFirstName"
                  label="First name"
                  required
                  value={form.babyFirstName}
                  onChange={(e) => set('babyFirstName', e.target.value)}
                  error={errors.babyFirstName}
                  hint={`Surname: ${data.mother.lastName}`}
                />
                <Select id="del-babySex" label="Sex" required value={form.babySex} onChange={(e) => set('babySex', e.target.value)} error={errors.babySex}>
                  <option value="">Choose</option>
                  <option value="female">Girl</option>
                  <option value="male">Boy</option>
                </Select>
              </>
            )}
            <Input
              id="del-babyWeightKg"
              label="Weight"
              required
              suffix="kg"
              inputMode="decimal"
              value={form.babyWeightKg}
              onChange={(e) => set('babyWeightKg', e.target.value)}
              error={errors.babyWeightKg}
            />
            <Input label="Length" optional suffix="cm" inputMode="decimal" value={form.babyLengthCm} onChange={(e) => set('babyLengthCm', e.target.value)} />
            <Input label="Apgar (1 and 5 min)" optional placeholder="9 and 10" value={form.apgar} onChange={(e) => set('apgar', e.target.value)} />
            <Input label="Blood loss" optional placeholder="About 300 ml" value={form.bloodLoss} onChange={(e) => set('bloodLoss', e.target.value)} />
          </div>
          {form.outcome === 'Live birth' && (
            <Checkbox className="mt-4" checked={form.birthDoses} onChange={(v) => set('birthDoses', v)}>
              <span className="font-semibold text-ink">BCG and OPV 0 given at birth</span>
              <span className="block text-[13px]">Recorded on the baby’s new record. The rest of the KEPI schedule is planned from the date of birth.</span>
            </Checkbox>
          )}
        </fieldset>
        <Textarea className="mt-4" label="Notes" optional rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        {errors.form && (
          <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
            {errors.form}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <Button variant="neutral" to={`/clinic/mothers/${motherId}`}>
            Cancel
          </Button>
          <Button type="submit" icon={Baby} loading={saving}>
            Record delivery
          </Button>
        </div>
      </Card>
      <aside>
        <Card className="p-5">
          <h2 className="text-h2">What happens next</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-600">
            <li>A patient record is created for the baby and linked to {data.mother.firstName}.</li>
            <li>The KEPI schedule is generated from the date of birth.</li>
            <li>{data.mother.firstName}’s status changes to postnatal, with visits due within 48 hours, at 1–2 weeks and at 4–6 weeks.</li>
            <li>She sees the baby in the family app.</li>
          </ul>
        </Card>
      </aside>
    </div>
  )
}

function PostnatalForm({ data, motherId }) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    key: data.nextVisit?.key ?? '4-6w',
    date: TODAY_ISO,
    bpSystolic: '',
    bpDiastolic: '',
    tempC: '',
    weightKg: '',
    uterus: UTERUS[1],
    bleeding: BLEEDING[1],
    perineum: WOUND[1],
    breasts: 'No problems',
    epds: '',
    hb: '',
    babyWeightKg: '',
    babyFeeding: 'Exclusive breastfeeding',
    babyCord: 'Clean and dry',
    babyJaundice: 'None',
    fpMethod: FP_METHODS[1],
    fpNote: '',
    noteForMother: '',
    nextVisitOn: '',
  })
  const [errors, setErrors] = useState({})
  const [warnings, setWarnings] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const submit = (e) => {
    e.preventDefault()
    const { errors: found, warnings: warn } = validatePostnatal(form)
    setErrors(found)
    setWarnings(warn)
    if (Object.keys(found).length) return
    if (warn.length) setConfirming(true)
    else save()
  }

  const save = async () => {
    setSaving(true)
    try {
      setSaved(await recordPostnatalVisit(motherId, form, user.id))
      setConfirming(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrors(err.fields ?? { form: err.message })
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {saved && (
          <Banner
            tone="success"
            icon={CircleCheck}
            role="status"
            className="mb-5"
            title={`Postnatal visit (${saved.label}) recorded.`}
            action={
              <Button size="sm" variant="secondary" to={`/clinic/mothers/${motherId}`}>
                Back to profile
              </Button>
            }
          >
            {data.mother.firstName} can see it in the family app.
          </Banner>
        )}
        <Card as="form" onSubmit={submit} noValidate className="p-5 sm:p-6" aria-label="Record postnatal visit">
          <MotherCard data={data} extra={data.delivery ? ` · delivered ${formatDate(data.delivery.date)} (day ${data.daysSinceBirth})` : ''} />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Select label="Postnatal visit" required value={form.key} onChange={(e) => set('key', e.target.value)} error={errors.key}>
              {POSTNATAL_VISITS.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              label="Visit date"
              required
              max={TODAY_ISO}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[15px] font-semibold text-ink">Mother’s checks</legend>
            <div className="grid gap-4 sm:grid-cols-4">
              <Input
                label="BP systolic"
                required
                suffix="mmHg"
                inputMode="numeric"
                value={form.bpSystolic}
                onChange={(e) => set('bpSystolic', e.target.value)}
                error={errors.bpSystolic}
              />
              <Input
                label="BP diastolic"
                required
                suffix="mmHg"
                inputMode="numeric"
                value={form.bpDiastolic}
                onChange={(e) => set('bpDiastolic', e.target.value)}
                error={errors.bpDiastolic}
              />
              <Input
                label="Temperature"
                suffix="°C"
                inputMode="decimal"
                value={form.tempC}
                onChange={(e) => set('tempC', e.target.value)}
                error={errors.tempC}
              />
              <Input label="Weight" suffix="kg" inputMode="decimal" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
              <Select label="Uterus" value={form.uterus} onChange={(e) => set('uterus', e.target.value)}>
                {UTERUS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select label="Bleeding" value={form.bleeding} onChange={(e) => set('bleeding', e.target.value)}>
                {BLEEDING.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Select label="Perineum / wound" value={form.perineum} onChange={(e) => set('perineum', e.target.value)}>
                {WOUND.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Input
                label="Depression screen (EPDS)"
                inputMode="numeric"
                value={form.epds}
                onChange={(e) => set('epds', e.target.value)}
                hint="13 or more needs follow-up"
              />
              <Input className="sm:col-span-2" label="Breasts & feeding" value={form.breasts} onChange={(e) => set('breasts', e.target.value)} />
              <Input label="Haemoglobin" suffix="g/dL" inputMode="decimal" value={form.hb} onChange={(e) => set('hb', e.target.value)} />
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[15px] font-semibold text-ink">Baby’s checks</legend>
            <div className="grid gap-4 sm:grid-cols-4">
              <Input
                label="Weight"
                suffix="kg"
                inputMode="decimal"
                value={form.babyWeightKg}
                onChange={(e) => set('babyWeightKg', e.target.value)}
                error={errors.babyWeightKg}
                hint={data.child ? `Saved to ${data.child.firstName}’s growth chart` : undefined}
              />
              <Input label="Feeding" value={form.babyFeeding} onChange={(e) => set('babyFeeding', e.target.value)} />
              <Input label="Cord" value={form.babyCord} onChange={(e) => set('babyCord', e.target.value)} />
              <Input label="Jaundice" value={form.babyJaundice} onChange={(e) => set('babyJaundice', e.target.value)} />
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-[15px] font-semibold text-ink">Family-planning counselling</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Method chosen" value={form.fpMethod} onChange={(e) => set('fpMethod', e.target.value)}>
                {FP_METHODS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </Select>
              <Input label="Counselling note" optional value={form.fpNote} onChange={(e) => set('fpNote', e.target.value)} />
            </div>
          </fieldset>

          <Textarea
            className="mt-5"
            label="Note for the mother"
            optional
            rows={2}
            maxLength={300}
            value={form.noteForMother}
            onChange={(e) => set('noteForMother', e.target.value)}
            hint={`${data.mother.firstName} sees this in the family app.`}
          />
          <Input
            className="mt-4 sm:max-w-xs"
            type="date"
            label="Next visit"
            optional
            min={form.date || TODAY_ISO}
            value={form.nextVisitOn}
            onChange={(e) => set('nextVisitOn', e.target.value)}
          />
          {errors.form && (
            <p role="alert" className="mt-4 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
              {errors.form}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
            <Button variant="neutral" to={`/clinic/mothers/${motherId}`}>
              Cancel
            </Button>
            <Button type="submit" icon={Check} loading={saving && !confirming}>
              Save postnatal visit
            </Button>
          </div>
        </Card>
      </div>
      <aside className="space-y-5">
        <Card className="p-5">
          <h2 className="text-h2">Postnatal schedule</h2>
          <ul className="mt-3 space-y-2">
            {data.plan.map((v) => (
              <li key={v.key} className="flex items-center justify-between gap-3 rounded-xl bg-page px-3.5 py-2.5 text-[14px]">
                <span>
                  <span className="block font-semibold text-ink">{v.label}</span>
                  <span className="text-[12px] text-slate-600">Due {formatDate(v.dueOn)}</span>
                </span>
                <StatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        </Card>
      </aside>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        loading={saving}
        title="Save with abnormal findings?"
        description="Check these before saving. Your colleagues will see them on her record."
        confirmLabel="Yes, save visit"
        cancelLabel="Go back and check"
      >
        <ul className="space-y-1.5 text-[14px] text-coral-700">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  )
}
