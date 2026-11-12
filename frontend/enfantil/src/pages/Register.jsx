import { ArrowLeft, ArrowRight, Baby, Check, Clock, HeartPulse, Link2, ShieldCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { completeRegistration, startRegistration, validateHealth } from '../api/auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Checkbox from '../components/Checkbox'
import ChoicePill from '../components/ChoicePill'
import CodeInput from '../components/CodeInput'
import FieldMessage from '../components/FieldMessage'
import Input from '../components/Input'
import OptionCard from '../components/OptionCard'
import SegmentedControl from '../components/SegmentedControl'
import Select from '../components/Select'
import { labelClass, linkClass } from '../components/fieldStyles'
import { useAuth } from '../context/AuthContext'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AuthLayout from '../layouts/AuthLayout'
import { cx } from '../utils/cx'
import { formatDate, isValidISODate, TODAY, toISODate } from '../utils/dates'
import { formatLocalPhone, isValidEmail, isValidKenyanMobile, passwordStrength, validateNewPassword } from '../utils/format'
import { BLOOD_GROUPS, eddFromLmp, formatGALong, gestationalAge, lmpFromEdd } from '../utils/pregnancy'

const STEP_LABELS = { details: 'Your details', track: 'What to track', health: 'My health', children: 'Your baby', phone: 'Confirm your phone' }

function stepsFor(tracking) {
  return ['details', 'track', 'health', ...(tracking === 'pregnancy' ? [] : ['children']), 'phone']
}
const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Other']

function validateDetails(d) {
  const e = {}
  if (!d.fullName.trim()) e.fullName = 'Enter your full name'
  else if (d.fullName.trim().split(/\s+/).length < 2) e.fullName = 'Enter your first and last name'
  if (!d.phone.trim()) e.phone = 'Enter your phone number'
  else if (!isValidKenyanMobile(d.phone)) e.phone = 'Enter a valid Kenyan mobile number, e.g. 712 345 678'
  if (d.email.trim() && !isValidEmail(d.email)) e.email = 'Enter a valid email address, or leave it empty'
  if (!d.relationship) e.relationship = 'Choose your relationship to the child'
  const pw = validateNewPassword(d.password)
  if (pw) e.password = pw
  if (!d.confirm) e.confirm = 'Type your password again'
  else if (d.confirm !== d.password) e.confirm = 'Passwords do not match'
  if (!d.terms) e.terms = 'Please accept to continue'
  return e
}

function Stepper({ step, steps }) {
  const index = steps.indexOf(step)
  return (
    <ol className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Registration progress">
      {steps.map((id, i) => {
        const label = STEP_LABELS[id]
        const done = i < index
        const current = i === index
        return (
          <li key={label} className="flex items-center gap-2.5" aria-current={current ? 'step' : undefined}>
            <span
              className={cx(
                'flex size-7 items-center justify-center rounded-full text-[13px] font-semibold',
                current && 'bg-teal-700 text-white',
                done && 'bg-teal-100 text-teal-800',
                !current && !done && 'border-[1.5px] border-[#CFCAC1] text-slate-600',
              )}
            >
              {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cx('text-[14px]', current ? 'font-semibold text-teal-700' : 'font-medium text-slate-600')}>
              <span className="sr-only">
                Step {i + 1} of {steps.length}:{' '}
              </span>
              {label}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function Register() {
  useDocumentTitle('Create your family account')
  const { startSession, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('details')
  const [tracking, setTracking] = useState('')
  const [trackError, setTrackError] = useState('')
  const [health, setHealth] = useState({ dob: '', bloodGroup: 'unknown', allergies: '', conditions: '', medicines: '', dateKind: 'lmp', lmp: '', edd: '' })
  const [healthErrors, setHealthErrors] = useState({})
  const steps = stepsFor(tracking)
  const [details, setDetails] = useState({ fullName: '', phone: '', email: '', relationship: 'Mother', password: '', confirm: '', terms: false })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [childPlan, setChildPlan] = useState({ mode: 'link', patientId: '', dob: '' })
  const [childErrors, setChildErrors] = useState({})
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, restart] = useCountdown(0)

  if (isAuthenticated && step === 'details') return <Navigate to="/family" replace />

  const errors = validateDetails(details)
  const visibleError = (field) => (submitted || touched[field] ? errors[field] : undefined)
  const setField = (field) => (event) => setDetails((d) => ({ ...d, [field]: event?.target ? event.target.value : event }))
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }))
  const strength = passwordStrength(details.password)

  const submitDetails = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setFormError('')
    if (Object.keys(errors).length) {
      document.getElementById(`reg-${Object.keys(errors)[0]}`)?.focus()
      return
    }
    setBusy(true)
    try {
      await startRegistration(details)
      setStep('track')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitChildren = (event) => {
    event.preventDefault()
    const e = {}
    if (childPlan.mode === 'link') {
      if (!/^[A-Z0-9]{2,4}-P-\d{6}-\d{3}$/i.test(childPlan.patientId.trim())) e.patientId = 'Patient IDs look like TFH-P-250118-007'
      if (!childPlan.dob) e.dob = 'Enter your child’s date of birth'
    }
    setChildErrors(e)
    if (Object.keys(e).length) return
    goToPhone()
  }

  const goToPhone = () => {
    setStep('phone')
    setCode('')
    restart(30)
  }

  const submitTrack = (event) => {
    event.preventDefault()
    if (!tracking) {
      setTrackError('Choose what you would like to track')
      return
    }
    setStep('health')
  }

  const submitHealth = (event) => {
    event.preventDefault()
    const found = validateHealth(health, tracking)
    setHealthErrors(found)
    if (Object.keys(found).length) {
      document.getElementById(`reg-h-${Object.keys(found)[0]}`)?.focus()
      return
    }
    if (tracking === 'pregnancy') goToPhone()
    else setStep('children')
  }

  const setH = (field) => (event) => {
    const value = event?.target ? event.target.value : event
    setHealth((h) => ({ ...h, [field]: value }))
    setHealthErrors((e) => ({ ...e, [field]: undefined }))
  }

  const lmpForPreview = health.dateKind === 'lmp' ? health.lmp : isValidISODate(health.edd) ? lmpFromEdd(health.edd) : ''
  const preview = isValidISODate(lmpForPreview) && lmpForPreview <= toISODate(TODAY) ? { lmp: lmpForPreview, edd: eddFromLmp(lmpForPreview), ga: gestationalAge(lmpForPreview) } : null

  const submitCode = async (event) => {
    event.preventDefault()
    if (code.length < 6) {
      setCodeError('Enter all 6 digits of the code')
      return
    }
    setBusy(true)
    setCodeError('')
    try {
      const session = await completeRegistration({ ...details, code, tracking, health })
      startSession(session, { remember: true })
      if (tracking !== 'pregnancy' && childPlan.mode === 'link') {
        navigate('/family/children/new', { replace: true, state: { patientId: childPlan.patientId.trim().toUpperCase(), dob: childPlan.dob } })
      } else {
        navigate('/family', {
          replace: true,
          state: {
            flash:
              tracking === 'pregnancy'
                ? 'Your account is ready. Your pregnancy tracker and antenatal schedule are under “Me”.'
                : 'Your family account is ready. Add your children from Settings whenever you like.',
          },
        })
      }
    } catch (err) {
      setCodeError(err.message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      aside={
        <p className="text-[14px] text-slate-600">
          Already registered?{' '}
          <Link to="/sign-in" className={`${linkClass} underline`}>
            Sign in
          </Link>
        </p>
      }
    >
      <h1 className="text-h1 sm:text-[30px] sm:leading-[38px]">Create your family account</h1>
      <p className="mt-1 text-[15px] text-slate-600">Takes about 3 minutes. Track your pregnancy, your baby, or both.</p>
      <Stepper step={step} steps={steps} />

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <Card className="p-5 sm:p-7">
          {formError && (
            <Alert tone="coral" role="alert" className="mb-5" action={<Button to="/sign-in" variant="secondary" size="sm">Sign in</Button>}>
              {formError}
            </Alert>
          )}

          {step === 'details' && (
            <form onSubmit={submitDetails} noValidate>
              <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
                <Input id="reg-fullName" label="Full name" autoComplete="name" value={details.fullName} onChange={setField('fullName')} onBlur={touch('fullName')} error={visibleError('fullName')} />
                <Input
                  id="reg-phone"
                  label="Phone number"
                  prefix="+254"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="712 345 678"
                  value={details.phone}
                  onChange={setField('phone')}
                  onBlur={touch('phone')}
                  error={visibleError('phone')}
                />
                <Input
                  id="reg-email"
                  label="Email"
                  optional
                  type="email"
                  autoComplete="email"
                  value={details.email}
                  onChange={setField('email')}
                  onBlur={touch('email')}
                  error={visibleError('email')}
                />
                <fieldset>
                  <legend className={`mb-1.5 ${labelClass}`}>Relationship to child</legend>
                  <div className="flex flex-wrap gap-2" id="reg-relationship" tabIndex={-1}>
                    {RELATIONSHIPS.map((r) => (
                      <ChoicePill key={r} name="relationship" value={r} checked={details.relationship === r} onChange={setField('relationship')}>
                        {r}
                      </ChoicePill>
                    ))}
                  </div>
                  <FieldMessage error={visibleError('relationship')} />
                </fieldset>
                <Input
                  id="reg-password"
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  value={details.password}
                  onChange={setField('password')}
                  onBlur={touch('password')}
                  error={visibleError('password')}
                  hint={strength.label || 'At least 8 characters, with a number or symbol.'}
                  hintTone={strength.tone}
                />
                <Input
                  id="reg-confirm"
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  value={details.confirm}
                  onChange={setField('confirm')}
                  onBlur={touch('confirm')}
                  error={visibleError('confirm') ?? (details.confirm ? errors.confirm : undefined)}
                />
              </div>
              <Checkbox
                id="reg-terms"
                className="mt-6"
                checked={details.terms}
                onChange={(v) => setDetails((d) => ({ ...d, terms: v }))}
                error={submitted ? errors.terms : undefined}
              >
                I agree to the{' '}
                <a href="#terms" className={`${linkClass} underline`}>
                  Terms of Use
                </a>{' '}
                and{' '}
                <a href="#privacy" className={`${linkClass} underline`}>
                  Privacy Notice
                </a>
                , including how my child&apos;s health data is shared with their care team.
              </Checkbox>
              <div className="mt-6 flex justify-end border-t border-line pt-5">
                <Button type="submit" size="lg" iconRight={ArrowRight} loading={busy}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 'track' && (
            <form onSubmit={submitTrack} noValidate>
              <fieldset>
                <legend className="text-h2">What would you like to track?</legend>
                <p className="mt-1 text-[14px] text-slate-600">You can change this later.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-3" id="reg-track" tabIndex={-1}>
                  {[
                    { value: 'pregnancy', icon: HeartPulse, title: 'My pregnancy', description: 'Week-by-week tracker and antenatal visits' },
                    { value: 'baby', icon: Baby, title: 'My baby', description: 'Vaccines, growth and visits' },
                    { value: 'both', icon: Users, title: 'Both', description: 'Pregnant, with a child already' },
                  ].map((o) => (
                    <OptionCard
                      key={o.value}
                      name="tracking"
                      value={o.value}
                      checked={tracking === o.value}
                      onChange={(v) => {
                        setTracking(v)
                        setTrackError('')
                      }}
                      icon={o.icon}
                      title={o.title}
                      description={o.description}
                      error={trackError}
                      className="items-start"
                    />
                  ))}
                </div>
                <FieldMessage error={trackError} />
              </fieldset>
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep('details')}>
                  Back
                </Button>
                <Button type="submit" size="lg" iconRight={ArrowRight}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 'health' && (
            <form onSubmit={submitHealth} noValidate>
              <h2 className="text-h2">My health</h2>
              <p className="mt-1 text-[14px] text-slate-600">Helps your care team look after you. Only Tumaini Family Hospital can see it.</p>
              <div className="mt-5 grid gap-x-5 gap-y-5 md:grid-cols-2">
                <Input id="reg-h-dob" type="date" label="Your date of birth" max={toISODate(TODAY)} value={health.dob} onChange={setH('dob')} error={healthErrors.dob} />
                <Select label="Blood group" optional value={health.bloodGroup} onChange={setH('bloodGroup')} hint="Not sure? The hospital checks it at your first visit.">
                  <option value="unknown">I don’t know</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
                <Input label="Allergies" optional placeholder="e.g. Penicillin" value={health.allergies} onChange={setH('allergies')} hint="Separate several with commas." />
                <Input label="Long-term conditions" optional placeholder="e.g. Asthma" value={health.conditions} onChange={setH('conditions')} />
                <Input className="md:col-span-2" label="Current medicines" optional placeholder="e.g. Iron and folic acid" value={health.medicines} onChange={setH('medicines')} />
              </div>
              {tracking !== 'baby' && (
                <fieldset className="mt-6 rounded-xl border border-line p-4">
                  <legend className="px-1 text-[15px] font-semibold text-ink">Your pregnancy</legend>
                  <SegmentedControl
                    label="Which date do you know?"
                    value={health.dateKind}
                    onChange={setH('dateKind')}
                    options={[
                      { value: 'lmp', label: 'First day of last period' },
                      { value: 'edd', label: 'Due date' },
                    ]}
                  />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {health.dateKind === 'lmp' ? (
                      <Input id="reg-h-lmp" type="date" label="First day of your last period" max={toISODate(TODAY)} value={health.lmp} onChange={setH('lmp')} error={healthErrors.lmp} />
                    ) : (
                      <Input id="reg-h-edd" type="date" label="Due date" min={toISODate(TODAY)} value={health.edd} onChange={setH('edd')} error={healthErrors.edd} />
                    )}
                    <div className="rounded-xl bg-teal-50 px-4 py-3 text-[14px]" aria-live="polite">
                      {preview ? (
                        <>
                          <p className="text-slate-600">{health.dateKind === 'lmp' ? 'Your due date' : 'Your last period started'}</p>
                          <p className="text-[17px] font-bold text-teal-800">{formatDate(health.dateKind === 'lmp' ? preview.edd : preview.lmp, 'weekdayYear')}</p>
                          <p className="text-slate-600">{formatGALong(preview.ga)} pregnant today</p>
                        </>
                      ) : (
                        <p className="text-slate-600">Enter one date and we’ll work out the other.</p>
                      )}
                    </div>
                  </div>
                </fieldset>
              )}
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep('track')}>
                  Back
                </Button>
                <Button type="submit" size="lg" iconRight={ArrowRight}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 'children' && (
            <form onSubmit={submitChildren} noValidate>
              <h2 className="text-h2">Your baby</h2>
              <p className="mt-1 text-[14px] text-slate-600">Link your child’s hospital record now, or skip and add children after you sign in.</p>
              <fieldset className="mt-5">
                <legend className="sr-only">How do you want to add your children?</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <OptionCard
                    name="child-mode"
                    value="link"
                    checked={childPlan.mode === 'link'}
                    onChange={(mode) => setChildPlan((c) => ({ ...c, mode }))}
                    icon={Link2}
                    title="Link a hospital record"
                    description="Vaccines and visits appear straight away"
                  />
                  <OptionCard
                    name="child-mode"
                    value="later"
                    checked={childPlan.mode === 'later'}
                    onChange={(mode) => setChildPlan((c) => ({ ...c, mode }))}
                    icon={Clock}
                    title="I’ll add them later"
                    description="From Settings › Add a child"
                  />
                </div>
              </fieldset>
              {childPlan.mode === 'link' && (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Input
                    label="Hospital patient ID"
                    placeholder="TFH-P-250118-007"
                    inputClassName="font-mono uppercase"
                    value={childPlan.patientId}
                    onChange={(e) => setChildPlan((c) => ({ ...c, patientId: e.target.value }))}
                    error={childErrors.patientId}
                    hint="Printed on page 1 of the MCH handbook."
                  />
                  <Input
                    label="Child's date of birth"
                    type="date"
                    max={toISODate(TODAY)}
                    value={childPlan.dob}
                    onChange={(e) => setChildPlan((c) => ({ ...c, dob: e.target.value }))}
                    error={childErrors.dob}
                  />
                </div>
              )}
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep('health')}>
                  Back
                </Button>
                <Button type="submit" size="lg" iconRight={ArrowRight}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 'phone' && (
            <form onSubmit={submitCode} noValidate>
              <h2 className="text-h2">Confirm your phone</h2>
              <p className="mt-1 text-[15px] text-slate-600">
                We sent a 6-digit code to <strong className="text-ink">{formatLocalPhone(details.phone)}</strong>.
              </p>
              <div className="mt-5">
                <CodeInput value={code} onChange={setCode} error={codeError} autoFocus idPrefix="reg-code" />
              </div>
              <p className="mt-3 text-small text-muted">Demo: any 6 digits work (000000 shows the wrong-code error).</p>
              <p className="mt-3 text-[14px] text-slate-600">
                {seconds > 0 ? (
                  <span aria-live="polite">Resend code in 0:{String(seconds).padStart(2, '0')}</span>
                ) : (
                  <button type="button" className={`${linkClass} min-h-11`} onClick={() => restart(30)}>
                    Resend code
                  </button>
                )}
              </p>
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(tracking === 'pregnancy' ? 'health' : 'children')}>
                  Back
                </Button>
                <Button type="submit" size="lg" loading={busy}>
                  Create account
                </Button>
              </div>
            </form>
          )}
        </Card>

        <aside className="space-y-4">
          <Card className="p-6">
            <h2 className="text-h2">Why we ask for your phone</h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Tumaini Family Hospital uses it to match your records and to send reminders by SMS, even without internet.
            </p>
          </Card>
          <Card className="flex items-start gap-3 p-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="text-[14px] leading-6 text-slate-600">
              <strong className="font-semibold text-ink">Private to your care team.</strong> Only you and the Tumaini Family Hospital care team can see your records.
            </p>
          </Card>
        </aside>
      </div>
    </AuthLayout>
  )
}
