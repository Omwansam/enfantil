import { Check, CircleAlert, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAncForm, recordAncVisit, SUPPLEMENTS, URINE, validateAnc } from '../../api/mothers'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge from '../../components/Badge'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Checkbox from '../../components/Checkbox'
import ConfirmDialog from '../../components/ConfirmDialog'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { SkeletonCard } from '../../components/Skeleton'
import Textarea from '../../components/Textarea'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, TODAY_ISO } from '../../utils/dates'
import { formatGA, gestationalAge, isHighBp } from '../../utils/pregnancy'

/** D3 — record an antenatal visit. */
export default function RecordAnc() {
  const { motherId } = useParams()
  const state = useAsync(() => getAncForm(motherId), [motherId])
  useDocumentTitle('Record antenatal visit')
  return (
    <>
      <Breadcrumb
        items={[
          { label: 'Patients', to: '/clinic/patients?group=mothers' },
          { label: state.data?.mother.fullName ?? 'Mother', to: `/clinic/mothers/${motherId}` },
          { label: 'Record antenatal visit' },
        ]}
      />
      <h1 className="mb-5 text-h1 text-ink">Record antenatal visit</h1>
      <AsyncContent
        state={state}
        errorTitle="We couldn’t open the antenatal form"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <SkeletonCard lines={9} className="min-h-[520px]" />
            <SkeletonCard lines={4} />
          </div>
        }
      >
        {(data) => <AncForm data={data} motherId={motherId} />}
      </AsyncContent>
    </>
  )
}

function Flag({ children }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-small font-semibold text-coral-700">
      <TriangleAlert className="size-4" aria-hidden="true" />
      {children}
    </p>
  )
}

function AncForm({ data, motherId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    date: TODAY_ISO,
    bpSystolic: '',
    bpDiastolic: '',
    weightKg: '',
    fundalHeightCm: '',
    fetalHeartRate: '',
    hb: '',
    urineProtein: 'Negative',
    urineGlucose: 'Negative',
    supplements: ['Iron and folic acid (IFAS)'],
    tdGiven: false,
    tdBatch: '',
    clinicalNote: '',
    noteForMother: '',
    nextVisitOn: data.suggestedNext ?? '',
  })
  const [errors, setErrors] = useState({})
  const [warnings, setWarnings] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const ga = form.date ? gestationalAge(data.lmp, form.date) : null
  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const highBp = form.bpSystolic && form.bpDiastolic && isHighBp(form.bpSystolic, form.bpDiastolic)
  const lowHb = form.hb && Number(form.hb) < 11
  const fhrOut = form.fetalHeartRate && (Number(form.fetalHeartRate) < 110 || Number(form.fetalHeartRate) > 160)
  const gain = form.weightKg && data.bookingWeight ? Math.round((Number(form.weightKg) - data.bookingWeight) * 10) / 10 : null

  const submit = (e) => {
    e.preventDefault()
    const { errors: found, warnings: warn } = validateAnc(form, { lmp: data.lmp })
    setErrors(found)
    setWarnings(warn)
    if (Object.keys(found).length) {
      document.getElementById(`anc-${Object.keys(found)[0]}`)?.focus()
      return
    }
    if (warn.length) setConfirming(true)
    else save()
  }

  const save = async () => {
    setSaving(true)
    setServerError('')
    try {
      const res = await recordAncVisit(motherId, form, user.id)
      navigate(`/clinic/mothers/${motherId}`, {
        state: {
          flash: {
            title: `Antenatal visit${res.contact ? ` ${res.contact}` : ''} recorded for ${res.motherName}.`,
            body: `${res.tdGiven ? `${res.tdGiven} moved from Planned to Given. ` : ''}${res.warnings.length ? 'Colleagues were alerted to the abnormal readings. ' : ''}${data.mother.firstName} can see the visit and your note in the family app.`,
          },
        },
      })
    } catch (err) {
      setConfirming(false)
      if (err.fields) setErrors(err.fields)
      else setServerError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card as="form" onSubmit={submit} noValidate className="p-5 sm:p-6" aria-label="Record antenatal visit">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-page px-3.5 py-3">
          <Avatar initials={data.mother.initials} tone={data.mother.tone} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">{data.mother.fullName}</p>
            <p className="text-[13px] text-slate-600">
              Due {formatDate(data.edd)} · <span className="font-mono text-[12px]">{data.mother.patientId}</span>
              {data.mother.allergies.length > 0 && <> · Allergy: {data.mother.allergies.map((a) => a.substance).join(', ')}</>}
            </p>
          </div>
          <Badge tone="given">{data.nextContact ? `ANC ${data.nextContact.n} · ${data.nextContact.weeks} wk` : 'Extra visit'}</Badge>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            id="anc-date"
            type="date"
            label="Visit date"
            required
            max={TODAY_ISO}
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <div>
            <p className="mb-1.5 text-[14px] font-semibold text-ink">Gestational age</p>
            <p className="flex min-h-11 items-center rounded-xl border border-line bg-page px-3.5 text-[15px] font-semibold text-ink" aria-live="polite">
              {ga ? `${formatGA(ga)} weeks` : '—'}
              <span className="ml-2 text-[13px] font-normal text-slate-600">from LMP {formatDate(data.lmp, 'short')}</span>
            </p>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[15px] font-semibold text-ink">Mother</legend>
          <div className="grid gap-4 sm:grid-cols-4">
            <Input
              id="anc-bpSystolic"
              label="BP systolic"
              required
              suffix="mmHg"
              inputMode="numeric"
              value={form.bpSystolic}
              onChange={(e) => set('bpSystolic', e.target.value)}
              error={errors.bpSystolic}
              inputClassName={cx(highBp && 'border-coral-700 text-coral-700')}
            />
            <Input
              id="anc-bpDiastolic"
              label="BP diastolic"
              required
              suffix="mmHg"
              inputMode="numeric"
              value={form.bpDiastolic}
              onChange={(e) => set('bpDiastolic', e.target.value)}
              error={errors.bpDiastolic}
              inputClassName={cx(highBp && 'border-coral-700 text-coral-700')}
            />
            <Input
              id="anc-weightKg"
              label="Weight"
              required
              suffix="kg"
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => set('weightKg', e.target.value)}
              error={errors.weightKg}
              hint={gain !== null && !errors.weightKg ? `${gain >= 0 ? '+' : ''}${gain} kg since booking` : undefined}
            />
            <Input
              id="anc-hb"
              label="Haemoglobin"
              suffix="g/dL"
              inputMode="decimal"
              value={form.hb}
              onChange={(e) => set('hb', e.target.value)}
              error={errors.hb}
              inputClassName={cx(lowHb && 'border-coral-700 text-coral-700')}
            />
          </div>
          {highBp && (
            <Flag>
              BP {form.bpSystolic}/{form.bpDiastolic} is 140/90 or higher — check for pre-eclampsia.
            </Flag>
          )}
          {lowHb && <Flag>Hb below 11 g/dL — anaemia.</Flag>}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[15px] font-semibold text-ink">Baby</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="anc-fundalHeightCm"
              label="Fundal height"
              suffix="cm"
              inputMode="decimal"
              value={form.fundalHeightCm}
              onChange={(e) => set('fundalHeightCm', e.target.value)}
              error={errors.fundalHeightCm}
              hint={ga ? `Expected about ${ga.weeks} cm` : undefined}
            />
            <Input
              id="anc-fetalHeartRate"
              label="Fetal heart rate"
              suffix="bpm"
              inputMode="numeric"
              value={form.fetalHeartRate}
              onChange={(e) => set('fetalHeartRate', e.target.value)}
              error={errors.fetalHeartRate}
              inputClassName={cx(fhrOut && 'border-coral-700 text-coral-700')}
            />
          </div>
          {fhrOut && <Flag>Fetal heart rate outside 110–160 bpm.</Flag>}
        </fieldset>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select label="Urine protein" value={form.urineProtein} onChange={(e) => set('urineProtein', e.target.value)}>
            {URINE.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
          <Select label="Urine glucose" value={form.urineGlucose} onChange={(e) => set('urineGlucose', e.target.value)}>
            {URINE.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-[15px] font-semibold text-ink">Given at this visit</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SUPPLEMENTS.map((s) => (
              <Checkbox
                key={s}
                checked={form.supplements.includes(s)}
                onChange={(on) => set('supplements', on ? [...form.supplements, s] : form.supplements.filter((x) => x !== s))}
              >
                {s}
              </Checkbox>
            ))}
          </div>
          {data.plannedTd && (
            <div className="mt-3 rounded-xl border border-line p-3.5">
              <Checkbox checked={form.tdGiven} onChange={(on) => set('tdGiven', on)}>
                <span className="font-semibold text-ink">Td {data.plannedTd.dose} given today</span>
                <span className="block text-[13px]">Moves Td {data.plannedTd.dose} from Planned to Given on her record.</span>
              </Checkbox>
              {form.tdGiven && (
                <Input
                  id="anc-tdBatch"
                  className="mt-3"
                  label="Td batch number"
                  required
                  value={form.tdBatch}
                  onChange={(e) => set('tdBatch', e.target.value)}
                  error={errors.tdBatch}
                  inputClassName="font-mono uppercase"
                  placeholder="TD-26C0412"
                />
              )}
            </div>
          )}
        </fieldset>

        <Textarea
          className="mt-5"
          label="Clinical notes"
          optional
          rows={3}
          value={form.clinicalNote}
          onChange={(e) => set('clinicalNote', e.target.value)}
          hint="Only the care team sees these."
        />
        <Textarea
          className="mt-4"
          label="Note for the mother"
          optional
          rows={2}
          maxLength={300}
          value={form.noteForMother}
          onChange={(e) => set('noteForMother', e.target.value)}
          error={errors.noteForMother}
          hint={`${data.mother.firstName} sees this in the family app.`}
        />
        <Input
          className="mt-4 sm:max-w-xs"
          type="date"
          label="Next visit"
          min={form.date || TODAY_ISO}
          value={form.nextVisitOn}
          onChange={(e) => set('nextVisitOn', e.target.value)}
          error={errors.nextVisitOn}
          hint={data.suggestedNext ? `Next contact due ${formatDate(data.suggestedNext)}` : undefined}
        />

        {serverError && (
          <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {serverError}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <Button variant="neutral" to={`/clinic/mothers/${motherId}`}>
            Cancel
          </Button>
          <Button type="submit" icon={Check} loading={saving && !confirming}>
            Save visit
          </Button>
        </div>
      </Card>

      <aside className="space-y-5">
        <Card className="p-5">
          <p className="text-caption uppercase text-muted">Last visit</p>
          {data.lastVisit ? (
            <dl className="mt-2 divide-y divide-line text-[14px]">
              {[
                ['Date', formatDate(data.lastVisit.date)],
                ['BP', `${data.lastVisit.bpSystolic}/${data.lastVisit.bpDiastolic}`],
                ['Weight', `${data.lastVisit.weightKg} kg`],
                ['Fundal height', data.lastVisit.fundalHeightCm ? `${data.lastVisit.fundalHeightCm} cm` : '—'],
                ['FHR', data.lastVisit.fetalHeartRate ?? '—'],
                ['Hb', data.lastVisit.hb ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1.5">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-[14px] text-slate-600">This is her first antenatal visit.</p>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-h2">Alert thresholds</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px] text-slate-600">
            <li>Blood pressure 140/90 or higher</li>
            <li>Haemoglobin below 11 g/dL</li>
            <li>Fetal heart rate outside 110–160</li>
            <li>Urine protein or glucose +2 or more</li>
          </ul>
          <p className="mt-2 text-small text-slate-600">Saving an abnormal reading alerts your colleagues.</p>
        </Card>
      </aside>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={save}
        loading={saving}
        title="Save with abnormal readings?"
        description="Check these values before saving. Your colleagues will be alerted."
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
