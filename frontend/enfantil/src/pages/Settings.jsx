import { ChevronRight, CircleCheck, Hospital, LogOut, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { changePassword, getClinicAccess, getProfile, getSettings, setClinicAccess, updateLanguage, updateProfile, updateReminders } from '../api/settings'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card, { CardHeader } from '../components/Card'
import Input from '../components/Input'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import Select from '../components/Select'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'
import Switch from '../components/Switch'
import { useAuth } from '../context/AuthContext'
import { useChildren } from '../context/ChildContext'
import { counties } from '../data/mockData'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { formatDate, formatTime, isSameDay, TODAY } from '../utils/dates'
import { formatInternationalPhone, initials, isValidEmail, isValidKenyanMobile, joinNames, passwordStrength, validateNewPassword } from '../utils/format'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'children', label: 'Children' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'language', label: 'Language' },
  { id: 'privacy', label: 'Privacy & access' },
  { id: 'security', label: 'Security' },
]

function SavedNote({ children }) {
  return (
    <p role="status" className="flex items-center gap-1.5 text-small font-medium text-completed">
      <CircleCheck className="size-4" aria-hidden="true" />
      {children}
    </p>
  )
}

export default function Settings() {
  useDocumentTitle('Profile & settings')
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState('profile')

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (!SECTIONS.some((s) => s.id === id)) return undefined
    const timer = setTimeout(() => {
      setActive(id)
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
    return () => clearTimeout(timer)
  }, [location.hash])

  const go = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <>
      <PageHeader title="Profile & settings" />
      <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <Card as="nav" aria-label="Settings sections" className="p-2 lg:sticky lg:top-8">
          <ul className="scrollbar-thin flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={active === s.id ? 'true' : undefined}
                  onClick={() => go(s.id)}
                  className={cx(
                    'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-[14px] transition-colors',
                    active === s.id ? 'bg-teal-50 font-semibold text-teal-800' : 'font-medium text-ink hover:bg-[#F4F3F0]',
                  )}
                >
                  {s.label}
                </button>
              </li>
            ))}
            <li className="shrink-0 border-line lg:mt-1 lg:border-t lg:pt-1">
              <button
                type="button"
                onClick={() => {
                  signOut()
                  navigate('/sign-in', { replace: true })
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-[14px] font-medium text-coral-700 hover:bg-coral-50"
              >
                <LogOut className="size-4 lg:hidden" aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </Card>

        <div className="space-y-5">
          <ProfileSection />
          <ChildrenSection />
          <div className="grid items-stretch gap-5 md:grid-cols-2">
            <RemindersSection />
            <LanguageSection />
          </div>
          <ClinicAccessSection />
          <SecuritySection />
        </div>
      </div>
    </>
  )
}

function ProfileSection() {
  const profile = useAsync(getProfile, [])
  return (
    <Card id="profile" className="scroll-mt-6 p-5 sm:p-6" aria-label="Profile">
      <AsyncContent state={profile} errorTitle="We couldn’t load your profile" skeleton={<SkeletonCard lines={4} className="p-0 shadow-none" />}>
        {(p) => <ProfileForm initial={p} />}
      </AsyncContent>
    </Card>
  )
}

function ProfileForm({ initial }) {
  const { updateUser } = useAuth()
  const fileRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState({
    fullName: initial.fullName,
    phone: formatInternationalPhone(initial.phone),
    email: initial.email,
    county: initial.county,
  })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState('')

  const dirty =
    form.fullName !== saved.fullName || form.phone !== formatInternationalPhone(saved.phone) || form.email !== saved.email || form.county !== saved.county

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
    setStatus('idle')
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    if (form.fullName.trim().split(/\s+/).filter(Boolean).length < 2) found.fullName = 'Enter your first and last name'
    if (!isValidKenyanMobile(form.phone)) found.phone = 'Enter a valid Kenyan mobile number'
    if (form.email.trim() && !isValidEmail(form.email)) found.email = 'Enter a valid email address'
    setErrors(found)
    setServerError('')
    if (Object.keys(found).length) return
    if (!dirty) {
      setStatus('unchanged')
      return
    }
    setStatus('saving')
    try {
      const updated = await updateProfile(form)
      setSaved(updated)
      setForm((f) => ({ ...f, phone: formatInternationalPhone(updated.phone) }))
      updateUser({ firstName: updated.firstName, lastName: updated.lastName, fullName: updated.fullName, phone: updated.phone, email: updated.email })
      setStatus('saved')
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message })
      else setServerError(err.message)
      setStatus('idle')
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={initials(saved.fullName)} tone="pink" size="lg" src={photo} alt={photo ? 'Your profile photo' : ''} />
          <div>
            <h2 className="text-[17px] font-semibold text-ink">{saved.fullName}</h2>
            <p className="text-small text-slate-600">
              {saved.relationship} · member since {formatDate(saved.memberSince, 'monthYear')}
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPhoto(URL.createObjectURL(file))
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Change photo
        </Button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <Input label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Input label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <Input label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Select label="County" value={form.county} onChange={set('county')}>
          {counties.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {serverError && (
        <Alert tone="coral" role="alert" className="mt-5">
          {serverError}
        </Alert>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
        {status === 'saved' && <SavedNote>Changes saved</SavedNote>}
        {status === 'unchanged' && (
          <p role="status" className="text-small text-slate-600">
            No changes to save.
          </p>
        )}
        <Button type="submit" loading={status === 'saving'}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

function ChildrenSection() {
  const { childList, selectChild, loading } = useChildren()
  const navigate = useNavigate()
  return (
    <Card id="children" className="scroll-mt-6 p-5 sm:p-6" aria-labelledby="children-heading">
      <CardHeader id="children-heading" title="Children" action={<Button to="/family/children/new" variant="secondary" icon={Plus}>Add child</Button>} />
      {loading ? (
        <SkeletonList rows={2} className="mt-3" />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {childList.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => {
                  selectChild(child.id)
                  navigate('/family/health')
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-teal-700 hover:bg-teal-50"
              >
                <Avatar initials={child.initials} tone={child.tone} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{child.fullName}</span>
                  <span className="block text-small text-slate-600">
                    {child.age} · {child.facility?.shortName ?? 'Waiting for clinic'}
                  </span>
                </span>
                <ChevronRight className="size-5 text-slate-600" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RemindersSection() {
  const settings = useAsync(getSettings, [])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const toggle = async (key, value) => {
    const previous = settings.data.reminders[key]
    settings.setData((s) => ({ ...s, reminders: { ...s.reminders, [key]: value } }))
    setError('')
    setSaved(false)
    try {
      await updateReminders({ [key]: value })
      setSaved(true)
    } catch (err) {
      settings.setData((s) => ({ ...s, reminders: { ...s.reminders, [key]: previous } }))
      setError(err.message)
    }
  }

  return (
    <Card id="reminders" className="scroll-mt-6 p-5 sm:p-6" aria-labelledby="reminders-heading">
      <h2 id="reminders-heading" className="text-h2">
        Reminders
      </h2>
      <AsyncContent state={settings} skeleton={<SkeletonList rows={3} avatar={false} className="-mx-5" />}>
        {(s) => (
          <div className="mt-2 divide-y divide-line border-t border-line">
            <Switch className="py-2" label="SMS reminders" description={`${s.reminders.timing} each dose and visit`} checked={s.reminders.sms} onChange={(v) => toggle('sms', v)} />
            <Switch className="py-2" label="App and web notifications" description="Messages and record updates" checked={s.reminders.push} onChange={(v) => toggle('push', v)} />
            <Switch className="py-2" label="Weekly email summary" description="Every Sunday evening" checked={s.reminders.weeklyEmail} onChange={(v) => toggle('weeklyEmail', v)} />
          </div>
        )}
      </AsyncContent>
      <div className="mt-2 min-h-5">
        {error ? (
          <p role="alert" className="text-small text-coral-700">
            {error}
          </p>
        ) : (
          saved && <SavedNote>Saved</SavedNote>
        )}
      </div>
    </Card>
  )
}

function LanguageSection() {
  const settings = useAsync(getSettings, [])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const change = async (language) => {
    const previous = settings.data.language
    settings.setData((s) => ({ ...s, language }))
    setError('')
    setMessage('')
    try {
      await updateLanguage(language)
      setMessage(language === 'sw' ? 'Imehifadhiwa. SMS reminders will now come in Kiswahili.' : 'Saved. SMS reminders will now come in English.')
    } catch (err) {
      settings.setData((s) => ({ ...s, language: previous }))
      setError(err.message)
    }
  }

  return (
    <Card id="language" className="scroll-mt-6 p-5 sm:p-6" aria-labelledby="language-heading">
      <h2 id="language-heading" className="text-h2">
        Language · Lugha
      </h2>
      <AsyncContent state={settings} skeleton={<SkeletonCard lines={1} className="p-0 shadow-none" />}>
        {(s) => (
          <SegmentedControl
            className="mt-4"
            fullWidth
            label="Language"
            value={s.language}
            onChange={change}
            options={[
              { value: 'en', label: 'English' },
              { value: 'sw', label: 'Kiswahili' },
            ]}
          />
        )}
      </AsyncContent>
      <p className="mt-3 text-small text-slate-600">Applies to the app, web and SMS reminders.</p>
      <div className="mt-2 min-h-5">
        {error ? (
          <p role="alert" className="text-small text-coral-700">
            {error}
          </p>
        ) : (
          message && <SavedNote>{message}</SavedNote>
        )}
      </div>
    </Card>
  )
}

function lastViewedLabel(date) {
  return isSameDay(date, TODAY) ? 'today' : formatDate(date, 'short')
}

function ClinicAccessSection() {
  const version = useDataVersion()
  const access = useAsync(getClinicAccess, [], version)
  const [confirming, setConfirming] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const setActive = async (item, active) => {
    setBusyId(item.id)
    setError('')
    try {
      await setClinicAccess(item.id, active)
      setConfirming(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card id="privacy" className="scroll-mt-6 p-5 sm:p-6" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="text-h2">
        Clinics with access
      </h2>
      <p className="text-small text-slate-600">These facilities can see and update your children&apos;s records.</p>
      <AsyncContent
        state={access}
        errorTitle="We couldn’t load clinic access"
        skeleton={<SkeletonList rows={2} className="-mx-5 mt-2" />}
        isEmpty={(list) => list.length === 0}
        empty={<p className="mt-4 text-[14px] text-slate-600">No clinics have access yet. Link a child’s record to give their clinic access.</p>}
      >
        {(list) => (
          <ul className="mt-3 divide-y divide-line border-t border-line">
            {list.map((item) => {
              const names = joinNames(item.children.map((c) => c.firstName))
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-4">
                  <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', item.active ? 'bg-teal-50 text-teal-700' : 'bg-[#F1F0EC] text-muted')}>
                    <Hospital className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-[15px] font-semibold', item.active ? 'text-ink' : 'text-slate-600')}>{item.facility.name}</p>
                    {item.active ? (
                      <p className="text-small text-slate-600">
                        {names} · since {formatDate(item.since)} · last viewed {lastViewedLabel(item.lastViewed)}
                      </p>
                    ) : (
                      <p className="text-small text-coral-700" role="status">
                        Access removed. {item.facility.shortName} can no longer see {names}&apos;s records.
                      </p>
                    )}
                  </div>
                  {item.active ? (
                    <Button variant="danger" size="sm" onClick={() => setConfirming(item)}>
                      Remove access
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" loading={busyId === item.id} onClick={() => setActive(item, true)}>
                      Undo
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </AsyncContent>
      {error && (
        <Alert tone="coral" role="alert" className="mt-3">
          {error}
        </Alert>
      )}
      <Modal
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        title={confirming ? `Remove ${confirming.facility.name}’s access?` : ''}
        description={
          confirming
            ? `${confirming.facility.shortName} will no longer see or update ${joinNames(confirming.children.map((c) => c.firstName))}’s records, and vaccines given there won’t appear here. You can undo this straight away.`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              Keep access
            </Button>
            <Button variant="dangerSolid" loading={busyId === confirming?.id} onClick={() => setActive(confirming, false)}>
              Remove access
            </Button>
          </>
        }
      />
    </Card>
  )
}

function SecuritySection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const strength = passwordStrength(form.newPassword)

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((er) => ({ ...er, [field]: undefined }))
    setStatus('idle')
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    if (!form.currentPassword) found.currentPassword = 'Enter your current password'
    const pw = validateNewPassword(form.newPassword)
    if (pw) found.newPassword = pw
    else if (form.newPassword === form.currentPassword) found.newPassword = 'Choose a password you haven’t used here'
    if (form.confirm !== form.newPassword) found.confirm = 'Passwords do not match'
    setErrors(found)
    if (Object.keys(found).length) return
    setStatus('saving')
    try {
      await changePassword(form)
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setStatus('saved')
    } catch (err) {
      setErrors({ [err.field ?? 'currentPassword']: err.message })
      setStatus('idle')
    }
  }

  return (
    <Card id="security" className="scroll-mt-6 p-5 sm:p-6" aria-labelledby="security-heading">
      <CardHeader id="security-heading" title="Security" subtitle={`Signed in on this computer since ${formatTime(TODAY, { twelveHour: true })} today.`} />
      <form onSubmit={submit} noValidate className="mt-5">
        <div className="grid gap-5 md:grid-cols-3">
          <Input label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            hint={strength.label}
            hintTone={strength.tone}
          />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
          {status === 'saved' && <SavedNote>Password changed</SavedNote>}
          <Button type="submit" variant="secondary" loading={status === 'saving'}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  )
}
