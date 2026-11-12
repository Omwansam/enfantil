import { Lock, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addHealthItem, getMyHealthRecord, removeHealthItem, updatePersonalDetails, validateHealthItem } from '../../api/maternal'
import { openConversationWith } from '../../api/messages'
import Alert from '../../components/Alert'
import AsyncContent from '../../components/AsyncContent'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Card, { CardHeader } from '../../components/Card'
import IconButton from '../../components/IconButton'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import PageHeader from '../../components/PageHeader'
import RequireMe from '../../components/RequireMe'
import Select from '../../components/Select'
import { SkeletonCard } from '../../components/Skeleton'
import Table, { Td, Th } from '../../components/Table'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate, formatTime, toISODate, TODAY } from '../../utils/dates'
import { formatInternationalPhone } from '../../utils/format'
import { BLOOD_GROUPS } from '../../utils/pregnancy'

export default function MyHealth() {
  useDocumentTitle('My health record')
  return <RequireMe>{() => <Record />}</RequireMe>
}

function Record() {
  const version = useDataVersion()
  const state = useAsync(getMyHealthRecord, [], version)
  const navigate = useNavigate()
  const [messaging, setMessaging] = useState(false)

  const messageTeam = async () => {
    setMessaging(true)
    try {
      const { id } = await openConversationWith({ clinicianId: 'grace-wanjala', childId: 'me' })
      navigate(`/family/messages/${id}`)
    } catch {
      setMessaging(false)
    }
  }

  return (
    <>
      <PageHeader
        title="My health record"
        subtitle={state.data ? `${state.data.me.fullName}${state.data.me.age ? ` · ${state.data.me.age}` : ''} · Tumaini Family Hospital` : 'Tumaini Family Hospital'}
        actions={
          <Button variant="secondary" icon={MessageCircle} onClick={messageTeam} loading={messaging}>
            Message the care team
          </Button>
        }
      />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your health record"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
            <SkeletonCard lines={3} />
          </div>
        }
      >
        {(r) => (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <PersonalDetails r={r} />
              <ItemList
                kind="allergies"
                title="Allergies"
                items={r.allergies}
                emptyText={r.nkda ? r.nkda.note : 'No allergies recorded.'}
                emptyMeta={r.nkda ? `Recorded by ${r.nkda.updatedBy} on ${formatDate(r.nkda.updatedAt)}` : null}
                render={(a) => (
                  <>
                    <strong className="font-semibold text-coral-700">{a.substance}</strong>
                    {a.reaction && <span className="text-slate-600"> — {a.reaction}</span>}
                  </>
                )}
              />
              <ItemList
                kind="conditions"
                title="Long-term conditions"
                items={r.conditions}
                emptyText="No long-term conditions recorded."
                render={(c) => (
                  <>
                    <span className="font-semibold text-ink">{c.name}</span>
                    {c.status === 'Resolved' && <Badge tone="completed" className="ml-2">Resolved</Badge>}
                    {c.detail && <span className="block text-[13px] text-slate-600">{c.detail}</span>}
                  </>
                )}
              />
              <ItemList
                kind="medicines"
                title="Current medicines"
                items={r.medicines}
                emptyText="No medicines recorded."
                render={(m) => (
                  <>
                    <span className="font-semibold text-ink">{m.name}</span>
                    {m.directions && <span className="block text-[13px] text-slate-600">{m.directions}</span>}
                  </>
                )}
              />
              <PregnancyHistory r={r} />
            </div>
            <aside className="space-y-5">
              <Card className="p-5">
                <h2 className="text-h2">Who updates this record</h2>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">
                  Items marked <Lock className="inline size-3.5 align-[-2px]" aria-label="locked" /> were added by your doctor or midwife at Tumaini Family Hospital. Only they can change them.
                </p>
                <p className="mt-2 text-[14px] leading-6 text-slate-600">Things you add yourself are checked by the care team at your next visit.</p>
              </Card>
              {r.current && !r.current.delivered && (
                <Card className="p-5">
                  <p className="text-caption uppercase text-muted">This pregnancy</p>
                  <p className="mt-1 text-[18px] font-bold text-ink">{r.current.ga.weeks} weeks pregnant</p>
                  <p className="text-[14px] text-slate-600">
                    Due {formatDate(r.current.edd)} · G{r.current.gravida ?? '?'} P{r.current.para ?? '?'}
                  </p>
                  <Button to="/family/me/pregnancy" variant="secondary" className="mt-3">
                    Pregnancy tracker
                  </Button>
                </Card>
              )}
            </aside>
          </div>
        )}
      </AsyncContent>
    </>
  )
}

function SourceNote({ item }) {
  if (item.source === 'self') return <span className="text-[12px] text-muted">Added by you on {formatDate(item.updatedAt)}</span>
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <Lock className="size-3" aria-hidden="true" />
      Updated by {item.updatedBy} on {formatDate(item.updatedAt)}, {formatTime(item.updatedAt)}
    </span>
  )
}

function PersonalDetails({ r }) {
  const [editing, setEditing] = useState(false)
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Personal details"
        action={
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
            Edit
          </Button>
        }
      />
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
        {[
          ['Name', r.caregiver.fullName],
          ['Date of birth', r.dob ? `${formatDate(r.dob)} · ${r.me.age}` : 'Not added yet'],
          ['Phone', formatInternationalPhone(r.caregiver.phone)],
          ['Blood group', r.bloodGroup ?? 'Not known yet — checked at your first antenatal visit'],
          ['Patient ID', r.patientId ?? 'Given at your first visit'],
          ['Hospital', 'Tumaini Family Hospital, Kiambu Road'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-600">{label}</dt>
            <dd className={label === 'Patient ID' && r.patientId ? 'font-mono text-[13px] font-semibold text-ink' : 'font-semibold text-ink'}>{value}</dd>
          </div>
        ))}
      </dl>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit personal details" description="Your name and phone are in Settings › Profile.">
        {editing && <PersonalForm r={r} onDone={() => setEditing(false)} />}
      </Modal>
    </Card>
  )
}

function PersonalForm({ r, onDone }) {
  const [dob, setDob] = useState(r.dob ?? '')
  const [bloodGroup, setBloodGroup] = useState(r.bloodGroup ?? 'unknown')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async (e) => {
    e.preventDefault()
    if (!dob) {
      setError('Enter your date of birth')
      return
    }
    setSaving(true)
    try {
      await updatePersonalDetails({ dob, bloodGroup })
      onDone()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }
  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <Input type="date" label="Date of birth" max={toISODate(TODAY)} value={dob} onChange={(e) => setDob(e.target.value)} error={error} />
      <Select label="Blood group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} hint="The hospital confirms this with a blood test.">
        <option value="unknown">I don’t know</option>
        {BLOOD_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </Select>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  )
}

const ADD_LABELS = { allergies: 'Add allergy', conditions: 'Add condition', medicines: 'Add medicine' }

function ItemList({ kind, title, items, emptyText, emptyMeta, render }) {
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [error, setError] = useState('')

  const remove = async (item) => {
    setRemoving(item.id)
    setError('')
    try {
      await removeHealthItem(kind, item.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card className="p-5 sm:p-6" aria-label={title}>
      <CardHeader
        title={title}
        action={
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setAdding(true)}>
            {ADD_LABELS[kind]}
          </Button>
        }
      />
      {items.length === 0 ? (
        <div className="mt-3 rounded-xl bg-page px-4 py-3">
          <p className="text-[14px] font-medium text-ink">{emptyText}</p>
          {emptyMeta && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted">
              <Lock className="size-3" aria-hidden="true" /> {emptyMeta}
            </p>
          )}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1 text-[14px]">
                {render(item)}
                <div className="mt-0.5">
                  <SourceNote item={item} />
                </div>
              </div>
              {item.source === 'self' && (
                <IconButton icon={Trash2} label={`Remove ${item.substance ?? item.name}`} onClick={() => remove(item)} disabled={removing === item.id} />
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <Alert tone="coral" role="alert" className="mt-3">
          {error}
        </Alert>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title={ADD_LABELS[kind]} description="Your care team will check it at your next visit.">
        {adding && <AddItemForm kind={kind} onDone={() => setAdding(false)} />}
      </Modal>
    </Card>
  )
}

function AddItemForm({ kind, onDone }) {
  const [fields, setFields] = useState({ substance: '', reaction: '', name: '', detail: '', directions: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    const found = validateHealthItem(kind, fields)
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      await addHealthItem(kind, fields)
      onDone()
    } catch (err) {
      setErrors({ [err.field ?? 'form']: err.message })
      setSaving(false)
    }
  }
  return (
    <form onSubmit={save} noValidate className="space-y-4">
      {kind === 'allergies' && (
        <>
          <Input label="Allergic to" placeholder="e.g. Penicillin, peanuts" value={fields.substance} onChange={set('substance')} error={errors.substance} autoFocus />
          <Input label="What happens?" optional placeholder="e.g. itchy rash" value={fields.reaction} onChange={set('reaction')} />
        </>
      )}
      {kind === 'conditions' && (
        <>
          <Input label="Condition" placeholder="e.g. Asthma" value={fields.name} onChange={set('name')} error={errors.name} autoFocus />
          <Input label="Details" optional placeholder="e.g. Since 2015, uses an inhaler" value={fields.detail} onChange={set('detail')} />
        </>
      )}
      {kind === 'medicines' && (
        <>
          <Input label="Medicine" placeholder="e.g. Multivitamin" value={fields.name} onChange={set('name')} error={errors.name} autoFocus />
          <Input label="How you take it" optional placeholder="e.g. One tablet daily" value={fields.directions} onChange={set('directions')} />
        </>
      )}
      {errors.form && (
        <Alert tone="coral" role="alert">
          {errors.form}
        </Alert>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Add
        </Button>
      </div>
    </form>
  )
}

function PregnancyHistory({ r }) {
  return (
    <Card className="overflow-hidden" aria-labelledby="ph-heading">
      <div className="px-5 pb-3 pt-5 sm:px-6">
        <h2 id="ph-heading" className="text-h2">
          Pregnancy history
        </h2>
      </div>
      {r.pregnancyHistory.length === 0 && !r.current ? (
        <p className="px-5 pb-5 text-[14px] text-slate-600 sm:px-6">No previous pregnancies recorded.</p>
      ) : (
        <Table caption="Pregnancy history" minWidth={640} className="px-5 pb-4 sm:px-6">
          <thead>
            <tr>
              <Th>Year</Th>
              <Th>Outcome</Th>
              <Th>Type of delivery</Th>
              <Th>Baby’s weight</Th>
              <Th>Gestation</Th>
              <Th>Baby</Th>
            </tr>
          </thead>
          <tbody>
            {r.current && !r.current.delivered && (
              <tr className="bg-teal-50/60">
                <Td className="font-semibold">{r.current.edd.slice(0, 4)}</Td>
                <Td>Current pregnancy</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>{r.current.ga.weeks} weeks now</Td>
                <Td>
                  <Link to="/family/me/pregnancy" className="font-semibold text-teal-700 hover:underline">
                    Tracker
                  </Link>
                </Td>
              </tr>
            )}
            {r.pregnancyHistory.map((h) => (
              <tr key={h.id}>
                <Td className="font-semibold">{h.year}</Td>
                <Td>{h.outcome}</Td>
                <Td>{h.delivery}</Td>
                <Td>{h.babyWeightKg} kg</Td>
                <Td>{h.gestation} weeks</Td>
                <Td>{h.child ? <span className="font-semibold text-ink">{h.child.firstName}</span> : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {r.pregnancyHistory[0]?.updatedBy && (
        <p className="px-5 pb-5 sm:px-6">
          <SourceNote item={r.pregnancyHistory[0]} />
        </p>
      )}
    </Card>
  )
}
