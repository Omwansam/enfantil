import { ArrowLeft, ArrowRight, Check, Clock, Link2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { completeRegistration, startRegistration } from '../api/auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Card from '../components/Card'
import Checkbox from '../components/Checkbox'
import ChoicePill from '../components/ChoicePill'
import CodeInput from '../components/CodeInput'
import FieldMessage from '../components/FieldMessage'
import Input from '../components/Input'
import OptionCard from '../components/OptionCard'
import { labelClass, linkClass } from '../components/fieldStyles'
import { useAuth } from '../context/AuthContext'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AuthLayout from '../layouts/AuthLayout'
import { cx } from '../utils/cx'
import { TODAY, toISODate } from '../utils/dates'
import { formatLocalPhone, isValidEmail, isValidKenyanMobile, passwordStrength, validateNewPassword } from '../utils/format'

const STEPS = ['Your details', 'Your children', 'Confirm your phone']
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

function Stepper({ step }) {
  return (
    <ol className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Registration progress">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
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
              <span className="sr-only">Step {i + 1} of 3: </span>
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
  const [step, setStep] = useState(0)
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

  if (isAuthenticated && step === 0) return <Navigate to="/family" replace />

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
      setStep(1)
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
      if (!/^[A-Z0-9]{2,4}-P-\d{6}-\d{3}$/i.test(childPlan.patientId.trim())) e.patientId = 'Patient IDs look like KL4-P-230604-031'
      if (!childPlan.dob) e.dob = 'Enter your child’s date of birth'
    }
    setChildErrors(e)
    if (Object.keys(e).length) return
    setStep(2)
    setCode('')
    restart(30)
  }

  const submitCode = async (event) => {
    event.preventDefault()
    if (code.length < 6) {
      setCodeError('Enter all 6 digits of the code')
      return
    }
    setBusy(true)
    setCodeError('')
    try {
      const session = await completeRegistration({ ...details, code })
      startSession(session, { remember: true })
      if (childPlan.mode === 'link') {
        navigate('/family/children/new', { replace: true, state: { patientId: childPlan.patientId.trim().toUpperCase(), dob: childPlan.dob } })
      } else {
        navigate('/family', { replace: true, state: { flash: 'Your family account is ready. Add your children from Settings whenever you like.' } })
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
      <p className="mt-1 text-[15px] text-slate-600">Takes about 3 minutes. You can add more children later.</p>
      <Stepper step={step} />

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <Card className="p-5 sm:p-7">
          {formError && (
            <Alert tone="coral" role="alert" className="mb-5" action={<Button to="/sign-in" variant="secondary" size="sm">Sign in</Button>}>
              {formError}
            </Alert>
          )}

          {step === 0 && (
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

          {step === 1 && (
            <form onSubmit={submitChildren} noValidate>
              <h2 className="text-h2">Your children</h2>
              <p className="mt-1 text-[14px] text-slate-600">Link your child’s clinic record now, or skip and add children after you sign in.</p>
              <fieldset className="mt-5">
                <legend className="sr-only">How do you want to add your children?</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  <OptionCard
                    name="child-mode"
                    value="link"
                    checked={childPlan.mode === 'link'}
                    onChange={(mode) => setChildPlan((c) => ({ ...c, mode }))}
                    icon={Link2}
                    title="Link a clinic record"
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
                    label="Clinic patient ID"
                    placeholder="KL4-P-230604-031"
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
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button type="submit" size="lg" iconRight={ArrowRight}>
                  Continue
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
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
                <Button variant="secondary" size="lg" icon={ArrowLeft} onClick={() => setStep(1)}>
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
              Your clinic uses it to match your children&apos;s records and to send reminders by SMS, even without internet.
            </p>
          </Card>
          <Card className="flex items-start gap-3 p-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <p className="text-[14px] leading-6 text-slate-600">
              <strong className="font-semibold text-ink">You control access.</strong> Only clinics you approve can see your children&apos;s records, and you can remove them at any time.
            </p>
          </Card>
        </aside>
      </div>
    </AuthLayout>
  )
}
