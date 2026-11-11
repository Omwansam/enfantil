import { CircleCheck, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { requestPasswordReset } from '../../api/auth'
import Banner from '../../components/Banner'
import Button from '../../components/Button'
import Checkbox from '../../components/Checkbox'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import { FAMILY_SIGN_IN_URL } from '../../config'
import { NOTICE_KEY, useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import AuthLayout from '../../layouts/AuthLayout'
import { readJSON, removeKey } from '../../utils/storage'

function validate({ identifier, password }) {
  const errors = {}
  if (!identifier.trim()) errors.identifier = 'Enter your staff ID or work email.'
  if (!password) errors.password = 'Enter your password.'
  return errors
}

export default function SignIn() {
  useDocumentTitle('Sign in')
  const { isAuthenticated, role, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [notice] = useState(() => readJSON(NOTICE_KEY, { kind: 'session' }))
  useEffect(() => removeKey(NOTICE_KEY, { kind: 'session' }), [])

  if (isAuthenticated && role === 'clinician') return <Navigate to="/clinic" replace />

  const update = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) {
      document.getElementById(found.identifier ? 'identifier' : 'password')?.focus()
      return
    }
    setSubmitting(true)
    try {
      await signIn(form)
      const from = location.state?.from?.pathname
      navigate(from && from.startsWith('/clinic') ? `${from}${location.state.from.search ?? ''}` : '/clinic', { replace: true })
    } catch (err) {
      setServerError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-h1 text-ink">Sign in to your clinic</h1>
      <p className="mt-1 text-[15px] text-slate-600">Use your staff ID or work email.</p>

      <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-[14px] leading-[22px] text-amber-800">
        <Shield className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Authorised healthcare professionals only.</strong> Access is monitored. Parents should use the{' '}
          <a href={FAMILY_SIGN_IN_URL} className="font-semibold underline underline-offset-2 hover:text-ink">
            family sign-in
          </a>
          .
        </p>
      </div>

      {notice === 'signed-out' && !serverError && (
        <Banner tone="success" icon={CircleCheck} className="mt-4" role="status">
          You have signed out. Sign in again to continue.
        </Banner>
      )}
      {serverError && (
        <Banner tone="error" className="mt-4" role="alert">
          {serverError}
        </Banner>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <Input
          id="identifier"
          label="Staff ID or email"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          value={form.identifier}
          onChange={update('identifier')}
          error={errors.identifier}
          placeholder="KL4-PAED-0000 or name@example.co.ke"
        />
        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          labelAction={
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="-my-2 min-h-10 text-[14px] font-semibold text-teal-700 hover:text-teal-800 hover:underline"
            >
              Reset password
            </button>
          }
        />
        <Checkbox checked={form.remember} onChange={update('remember')}>
          Keep me signed in on this clinic computer for 8 hours
        </Checkbox>
        <Button type="submit" variant="portal" size="lg" fullWidth loading={submitting}>
          Sign in securely
        </Button>
      </form>

      <p className="mt-6 text-small text-slate-600">Trouble signing in? Contact your facility&apos;s health records officer.</p>

      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} initialIdentifier={form.identifier} />
    </AuthLayout>
  )
}

function ResetPasswordModal({ open, onClose, initialIdentifier }) {
  return (
    <Modal open={open} onClose={onClose} title="Reset your password" description="We’ll send a reset link to the work email on your staff record." size="sm">
      {open && <ResetPasswordForm onClose={onClose} initialIdentifier={initialIdentifier} />}
    </Modal>
  )
}

function ResetPasswordForm({ onClose, initialIdentifier }) {
  const [identifier, setIdentifier] = useState(initialIdentifier)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError('Enter your staff ID or work email.')
      return
    }
    setStatus('sending')
    try {
      await requestPasswordReset({ identifier })
      setStatus('sent')
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div>
        <Banner tone="success" role="status">
          If <strong className="font-semibold text-ink">{identifier.trim()}</strong> matches a staff account, a reset link is on its way to the work email on
          file. It expires in 30 minutes.
        </Banner>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Back to sign in</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Staff ID or email"
        value={identifier}
        onChange={(e) => {
          setIdentifier(e.target.value)
          setError('')
        }}
        error={error}
        autoComplete="username"
        autoFocus
      />
      <p className="mt-3 text-small text-slate-600">No access to your work email? Your health records officer can reset it for you.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={status === 'sending'}>
          Send reset link
        </Button>
      </div>
    </form>
  )
}
