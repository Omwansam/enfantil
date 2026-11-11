import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { sendSmsSignInCode, verifySmsSignInCode } from '../api/auth'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Checkbox from '../components/Checkbox'
import CodeInput from '../components/CodeInput'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { linkClass } from '../components/fieldStyles'
import { useAuth } from '../context/AuthContext'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { AuthSplitLayout } from '../layouts/AuthLayout'
import { formatLocalPhone, isValidEmail, isValidKenyanMobile } from '../utils/format'

const CLINICIAN_PORTAL_URL = import.meta.env.VITE_CLINICIAN_PORTAL_URL || 'http://localhost:5174'

function validate({ identifier, password }) {
  const errors = {}
  const value = identifier.trim()
  if (!value) errors.identifier = 'Enter your phone number or email'
  else if (value.includes('@') ? !isValidEmail(value) : !isValidKenyanMobile(value)) {
    errors.identifier = value.includes('@') ? 'Enter a valid email address' : 'Enter a valid Kenyan mobile number, e.g. 0712 345 678'
  }
  if (!password) errors.password = 'Enter your password'
  return errors
}

export default function SignIn() {
  useDocumentTitle('Sign in')
  const { signIn, startSession, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/family'

  const [form, setForm] = useState({ identifier: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)

  if (isAuthenticated) return <Navigate to={from} replace />

  const update = (field) => (event) => {
    const value = field === 'remember' ? event : event.target.value
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length) return
    setSubmitting(true)
    try {
      await signIn(form)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthSplitLayout>
      <h2 className="text-[28px] font-bold leading-9 tracking-[-0.01em] text-ink sm:text-[30px]">Karibu tena</h2>
      <p className="mt-1 text-[15px] text-slate-600">Sign in with your phone number or email.</p>

      {formError && (
        <Alert tone="coral" role="alert" className="mt-5">
          {formError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
        <Input
          label="Email or phone number"
          name="identifier"
          autoComplete="username"
          inputMode="email"
          placeholder="0712 345 678"
          value={form.identifier}
          onChange={update('identifier')}
          error={errors.identifier}
        />
        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          labelAction={
            <Link to="/forgot-password" className={`${linkClass} text-[14px]`}>
              Forgot password?
            </Link>
          }
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="min-h-9 rounded-lg bg-[#F1F0EC] px-3 text-[13px] font-semibold text-ink hover:bg-[#E7E5E0]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
        />
        <Checkbox checked={form.remember} onChange={update('remember')}>
          Keep me signed in on this computer
        </Checkbox>
        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-4 text-small text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button variant="secondary" size="lg" fullWidth icon={Smartphone} onClick={() => setSmsOpen(true)}>
        Sign in with an SMS code
      </Button>

      <p className="mt-6 text-[14px] text-slate-600">
        New to Enfantil?{' '}
        <Link to="/register" className={`${linkClass} underline`}>
          Create a family account
        </Link>
      </p>
      <div className="mt-6 border-t border-line pt-5 text-[14px] text-slate-600">
        Healthcare professional?{' '}
        <a href={CLINICIAN_PORTAL_URL} className={`${linkClass} underline`}>
          Go to the clinician portal
        </a>
      </div>

      <SmsSignInDialog
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        initialPhone={isValidKenyanMobile(form.identifier) ? form.identifier : ''}
        onSignedIn={(session) => {
          startSession(session, { remember: form.remember })
          navigate(from, { replace: true })
        }}
      />
    </AuthSplitLayout>
  )
}

function SmsSignInDialog({ open, onClose, initialPhone, onSignedIn }) {
  return (
    <Modal open={open} onClose={onClose} title="Sign in with an SMS code" description="We’ll text a 6-digit code to the phone number on your account.">
      {open && <SmsSignInSteps initialPhone={initialPhone} onSignedIn={onSignedIn} />}
    </Modal>
  )
}

function SmsSignInSteps({ initialPhone, onSignedIn }) {
  const [phone, setPhone] = useState(initialPhone)
  const [code, setCode] = useState('')
  const [step, setStep] = useState('phone')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [seconds, restart] = useCountdown(0)

  const sendCode = async (event) => {
    event?.preventDefault()
    if (!isValidKenyanMobile(phone)) {
      setError('Enter a valid Kenyan mobile number, e.g. 0712 345 678')
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendSmsSignInCode(phone)
      setStep('code')
      setCode('')
      restart(30)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (event) => {
    event.preventDefault()
    if (code.length < 6) {
      setError('Enter all 6 digits of the code')
      return
    }
    setBusy(true)
    setError('')
    try {
      onSignedIn(await verifySmsSignInCode(phone, code))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendCode} noValidate className="space-y-5">
        <Input
          label="Phone number"
          prefix="+254"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error}
        />
        <Button type="submit" fullWidth size="lg" loading={busy}>
          Send code
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={verify} noValidate className="space-y-5">
      <p className="text-[14px] text-slate-600">
        We sent a code to <strong className="text-ink">{formatLocalPhone(phone)}</strong>.{' '}
        <button type="button" className={linkClass} onClick={() => setStep('phone')}>
          Change number
        </button>
      </p>
      <CodeInput value={code} onChange={setCode} error={error} autoFocus idPrefix="sms-code" />
      <p className="text-small text-muted">Demo: any 6 digits work (000000 shows the wrong-code error).</p>
      <Button type="submit" fullWidth size="lg" loading={busy}>
        Sign in
      </Button>
      <p className="text-center text-[14px] text-slate-600">
        {seconds > 0 ? (
          <>Resend code in 0:{String(seconds).padStart(2, '0')}</>
        ) : (
          <button type="button" className={linkClass} onClick={sendCode}>
            Resend code
          </button>
        )}
      </p>
    </form>
  )
}
