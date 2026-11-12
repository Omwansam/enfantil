import { History, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { editRecord, getRecordForEdit, RECORD_LISTS, validateRecordEdit } from '../api/mothers'
import AsyncContent from './AsyncContent'
import Badge from './Badge'
import Button from './Button'
import Input from './Input'
import SegmentedControl from './SegmentedControl'
import SidePanel from './SidePanel'
import Select from './Select'
import { SkeletonList } from './Skeleton'
import Textarea from './Textarea'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { formatDate, formatTime } from '../utils/dates'

const FIELD_LABELS = {
  allergies: ['Substance', 'Reaction'],
  conditions: ['Condition', 'Details'],
  medicines: ['Medicine', 'Dose and directions'],
  diagnoses: ['Diagnosis', 'ICD-10 code (optional)'],
}

/**
 * D5 — side panel to add, edit or remove allergies, conditions, medicines
 * and diagnoses on a mother's or infant's record. Every change needs a
 * reason and is saved to the audit trail; the family sees it in their app.
 */
export default function EditRecordPanel({ open, onClose, kind, id, onSaved }) {
  return (
    <SidePanel open={open} onClose={onClose} title="Edit health record" description="Changes show in the family app, marked with your name and the date.">
      {open && <PanelBody kind={kind} id={id} onSaved={onSaved} />}
    </SidePanel>
  )
}

function PanelBody({ kind, id, onSaved }) {
  const version = useDataVersion()
  const state = useAsync(() => getRecordForEdit(kind, id), [kind, id], version)
  const [list, setList] = useState('allergies')
  const [editing, setEditing] = useState(null)
  return (
    <AsyncContent state={state} errorTitle="We couldn’t open this record" skeleton={<SkeletonList rows={4} avatar={false} />}>
      {(r) => (
        <div className="space-y-5">
          <p className="text-[14px] text-slate-600">
            Record of <strong className="text-ink">{r.name}</strong>
          </p>
          <SegmentedControl
            label="Section"
            value={list}
            onChange={(v) => {
              setList(v)
              setEditing(null)
            }}
            fullWidth
            options={Object.entries(RECORD_LISTS).map(([value, spec]) => ({ value, label: spec.label }))}
          />
          <ul className="divide-y divide-line rounded-xl border border-line">
            {r[list].length === 0 && <li className="px-4 py-3 text-[14px] text-slate-600">No {RECORD_LISTS[list].label.toLowerCase()} recorded.</li>}
            {r[list].map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    {entry[RECORD_LISTS[list].field] ?? entry.name}
                    {entry.status && (
                      <Badge tone={entry.status === 'Resolved' ? 'completed' : 'neutral'} className="ml-2">
                        {entry.status}
                      </Badge>
                    )}
                  </p>
                  {entry[RECORD_LISTS[list].detail] && <p className="text-[13px] text-slate-600">{entry[RECORD_LISTS[list].detail]}</p>}
                  {entry.by && (
                    <p className="text-[12px] text-muted">
                      {entry.source === 'mother' ? 'Reported by the mother' : `By ${entry.by}`}
                      {entry.at && ` · ${formatDate(entry.at)}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ action: 'edit', entry })}
                  aria-label={`Edit ${entry[RECORD_LISTS[list].field] ?? entry.name}`}
                  className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-[#F1F0EC]"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ action: 'remove', entry })}
                  aria-label={`Remove ${entry[RECORD_LISTS[list].field] ?? entry.name}`}
                  className="inline-flex size-10 items-center justify-center rounded-lg text-coral-700 hover:bg-coral-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {editing ? (
            <ChangeForm
              key={`${list}-${editing.action}-${editing.entry?.id ?? 'new'}`}
              kind={kind}
              id={id}
              list={list}
              editing={editing}
              onDone={(result) => {
                setEditing(null)
                onSaved?.(result)
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <Button variant="secondary" icon={Plus} onClick={() => setEditing({ action: 'add', entry: null })}>
              Add {RECORD_LISTS[list].label.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')}
            </Button>
          )}
          <section aria-labelledby="audit-heading" className="border-t border-line pt-5">
            <h3 id="audit-heading" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <History className="size-4 text-teal-700" aria-hidden="true" />
              Audit trail
            </h3>
            {r.audit.length === 0 ? (
              <p className="mt-2 text-[14px] text-slate-600">No changes yet.</p>
            ) : (
              <ol className="mt-2 space-y-3">
                {r.audit.map((a) => (
                  <li key={a.id} className="rounded-xl bg-page px-3.5 py-2.5 text-[13px]">
                    <p className="font-semibold text-ink">{a.action}</p>
                    <p className="text-slate-600">Reason: {a.reason}</p>
                    <p className="mt-0.5 text-muted">
                      Edited by {a.by}, {formatDate(a.at)}, {formatTime(a.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </AsyncContent>
  )
}

function ChangeForm({ kind, id, list, editing, onDone, onCancel }) {
  const { user } = useAuth()
  const spec = RECORD_LISTS[list]
  const [fields, setFields] = useState({
    [spec.field]: editing.entry?.[spec.field] ?? '',
    [spec.detail]: editing.entry?.[spec.detail] ?? '',
    status: editing.entry?.status ?? 'Active',
  })
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [labelMain, labelDetail] = FIELD_LABELS[list]

  const save = async (e) => {
    e.preventDefault()
    const found = validateRecordEdit({ list, fields, reason, action: editing.action })
    setErrors(found)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      const result = await editRecord(kind, id, { list, action: editing.action, itemId: editing.entry?.id, fields, reason }, user.id)
      onDone(result)
    } catch (err) {
      setErrors(err.fields ?? { form: err.message })
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
      <h3 className="text-[15px] font-semibold text-ink">
        {editing.action === 'add'
          ? `Add to ${spec.label.toLowerCase()}`
          : editing.action === 'edit'
            ? `Edit ${editing.entry[spec.field] ?? editing.entry.name}`
            : `Remove ${editing.entry[spec.field] ?? editing.entry.name}`}
      </h3>
      {editing.action !== 'remove' && (
        <>
          <Input
            label={labelMain}
            required
            value={fields[spec.field]}
            onChange={(e) => setFields((f) => ({ ...f, [spec.field]: e.target.value }))}
            error={errors.name}
          />
          <Input
            label={labelDetail}
            value={fields[spec.detail]}
            onChange={(e) => setFields((f) => ({ ...f, [spec.detail]: e.target.value }))}
            inputClassName={list === 'diagnoses' ? 'font-mono' : undefined}
          />
          {list === 'conditions' && (
            <Select label="Status" value={fields.status} onChange={(e) => setFields((f) => ({ ...f, status: e.target.value }))}>
              <option>Active</option>
              <option>Resolved</option>
            </Select>
          )}
        </>
      )}
      <Textarea
        label="Reason for this change"
        required
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={errors.reason}
        placeholder="e.g. Reported at today’s visit; confirmed with the MCH handbook"
      />
      {errors.form && (
        <p role="alert" className="text-[14px] text-coral-700">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="neutral" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant={editing.action === 'remove' ? 'dangerSolid' : 'primary'} loading={saving}>
          {editing.action === 'remove' ? 'Remove' : 'Save change'}
        </Button>
      </div>
    </form>
  )
}
