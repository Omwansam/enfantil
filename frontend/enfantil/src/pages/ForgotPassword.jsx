import { ArrowLeft, CircleCheck, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset, resetPassword, verifyResetCode } from '../api/auth'
import Button from '../components/Button'
import Card from '../components/Card'
import CodeInput from '../components/CodeInput'
import Input from '../components/Input'
import { linkClass } from '../components/fieldStyles'
import { useCountdown } from '../hooks/useCountdown'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import AuthLayout from '../layouts/AuthLayout'
import { formatLocalPhone, isValidKenyanMobile, passwordStrength, validateNewPassword } from '../utils/format'

const STEPS = ['Your phone', 'SMS code', 'New password']

export default function ForgotPassword() {
  useDocumentTitle('Reset your password')
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [passwords, setPasswords] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [seconds, restart] = useCountdown(0)

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const sendCode = (event) => {
    event?.preventDefault()
    if (!isValidKenyanMobile(phone)) {
      setErrors({ phone: 'Enter a valid Kenyan mobile number, e.g. 712 345 678' })
      return
    }
    setErrors({})
    run(async () => {
      try {
        await requestPasswordReset(phone)
        setCode('')
        setStep(1)
        restart(30)
      } catch (err) {
        setErrors({ phone: err.message })
      }
    })
  }

  const checkCode = (event) => {
    event.preventDefault()
    if (code.length < 6) {
      setErrors({ code: 'Enter all 6 digits of the code' })
      return
    }
    setErrors({})
    run(async () => {
      try {
        await verifyResetCode(phone, code)
        setStep(2)
      } catch (err) {
        setErrors({ code: err.message })
      }
    })
  }

  const savePassword = (event) => {
    event.preventDefault()
    const found = {}
    const pwError = validateNewPassword(passwords.password)
    if (pwError) found.password = pwError
    if (!passwords.confirm) found.confirm = 'Type the new password again'
    else if (passwords.confirm !== passwords.password) found.confirm = 'Passwords do not match'
    setErrors(found)
    if (Object.keys(found).length) return
    run(async () => {
      try {
        await resetPassword({ phone, password: passwords.password })
        setStep(3)
      } catch (err) {
        setErrors({ password: err.message })
      }
    })
  }

  const strength = passwordStrength(passwords.password)

  return (
    <AuthLayout
      aside={
        <p className="text-[14px] text-slate-600">
          Remembered it?{' '}
          <Link to="/sign-in" className={`${linkClass} underline`}>
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mx-auto max-w-[460px]">
        <h1 className="text-h1 sm:text-[30px] sm:leading-[38px]">Reset your password</h1>
        <p className="mt-1 text-[15px] text-slate-600">We’ll send a 6-digit code to the phone number on your account.</p>

        {step < 3 && (
          <ol className="mt-6 flex gap-2" aria-label="Progress">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-teal-700' : 'bg-sand'}`} />
                <span className={`mt-2 block text-small ${i === step ? 'font-semibold text-teal-800' : 'text-muted'}`}>
                  <span className="sr-only">Step {i + 1} of 3: </span>
                  {label}
                </span>
              </li>
            ))}
          </ol>
        )}

        <Card className="mt-6 p-6 sm:p-7">
          {step === 0 && (
            <form onSubmit={sendCode} noValidate className="space-y-5">
              <Input
                label="Phone number"
                prefix="+254"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                hint="Use the number you registered with."
              />
              <Button type="submit" size="lg" fullWidth loading={busy}>
                Send code
              </Button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={checkCode} noValidate className="space-y-5">
              <p className="text-[15px] text-slate-600">
                We sent a code to <strong className="text-ink">{formatLocalPhone(phone)}</strong>.
              </p>
              <CodeInput value={code} onChange={setCode} error={errors.code} autoFocus idPrefix="reset-code" />
              <div className="flex items-start gap-3 rounded-xl bg-teal-50 px-4 py-3 text-[14px] text-teal-900">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-700" aria-hidden="true" />
                <p>
                  <strong className="font-semibold">Keep this code private.</strong> Enfantil and clinic staff will never ask for this code.
                </p>
              </div>
              <p className="text-small text-muted">Demo: any 6 digits work (000000 shows the wrong-code error).</p>
              <Button type="submit" size="lg" fullWidth loading={busy}>
                Continue
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <button type="button" className={`${linkClass} inline-flex min-h-11 items-center gap-1`} onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Change number
                </button>
                {seconds > 0 ? (
                  <span className="text-slate-600" aria-live="polite">
                    Resend code in 0:{String(seconds).padStart(2, '0')}
                  </span>
                ) : (
                  <button type="button" className={`${linkClass} min-h-11`} onClick={sendCode}>
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={savePassword} noValidate className="space-y-5">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={passwords.password}
                onChange={(e) => setPasswords((p) => ({ ...p, password: e.target.value }))}
                error={errors.password}
                hint={strength.label || 'At least 8 characters, with a number or symbol.'}
                hintTone={strength.tone}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                error={errors.confirm}
              />
              <Button type="submit" size="lg" fullWidth loading={busy}>
                Save new password
              </Button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center" role="status">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-completed-bg text-completed">
                <CircleCheck className="size-7" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-h2">Password changed</h2>
              <p className="mt-1 text-[15px] text-slate-600">You can now sign in with your new password.</p>
              <Button to="/sign-in" size="lg" fullWidth className="mt-6">
                Sign in
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AuthLayout>
  )
}
