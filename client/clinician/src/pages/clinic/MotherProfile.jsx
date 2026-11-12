import { Baby, CalendarDays, Check, ClipboardPlus, MessageCircle, NotebookPen, Pencil, ShieldPlus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { openConversationWithMother } from '../../api/messages'
import { getMother } from '../../api/mothers'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge, { StatusBadge } from '../../components/Badge'
import Banner from '../../components/Banner'
import Breadcrumb from '../../components/Breadcrumb'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DataTable, { Td, Th } from '../../components/DataTable'
import EditRecordPanel from '../../components/EditRecordPanel'
import { BloodPressureChart, WeightChart } from '../../components/MaternalCharts'
import Skeleton, { SkeletonCard } from '../../components/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate, formatTime, relativeDay } from '../../utils/dates'
import { formatGA } from '../../utils/pregnancy'

/** D2 — a mother's profile: pregnancy, ANC visits, progress, Td, record and linked infants. */
export default function MotherProfile() {
  const { motherId } = useParams()
  const version = useDataVersion()
  const state = useAsync(() => getMother(motherId), [motherId], version)
  useDocumentTitle(state.data?.fullName ?? 'Mother')
  return (
    <>
      <Breadcrumb items={[{ label: 'Patients', to: '/clinic/patients?group=mothers' }, { label: state.data?.fullName ?? 'Mother' }]} />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t open this record"
        skeleton={
          <div className="space-y-5">
            <Skeleton className="h-[150px] rounded-2xl" />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <SkeletonCard lines={6} />
              <SkeletonCard lines={4} />
            </div>
          </div>
        }
      >
        {(m) => <Profile m={m} />}
      </AsyncContent>
    </>
  )
}

function Profile({ m }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(null)
  const [opening, setOpening] = useState(false)
  const flash = location.state?.flash
  const pregnant = m.status.kind === 'pregnant'
  const postnatal = m.status.kind === 'postnatal'

  const message = async () => {
    setOpening(true)
    try {
      const { id } = await openConversationWithMother(m.id)
      navigate(`/clinic/messages/${id}`)
    } catch {
      setOpening(false)
    }
  }

  return (
    <>
      {flash && (
        <Banner tone="success" role="status" className="mb-4" title={flash.title} onDismiss={() => navigate(location.pathname, { replace: true, state: null })}>
          {flash.body}
        </Banner>
      )}
      {saved && (
        <Banner tone="success" role="status" className="mb-4" title={`${saved.summary}.`} onDismiss={() => setSaved(null)}>
          Saved to the audit trail. {m.firstName} sees the change in the family app.
        </Banner>
      )}

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <span className="hidden sm:block">
            <Avatar initials={m.initials} tone={m.tone} size="xl" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold leading-8 tracking-[-0.01em] text-ink">{m.fullName}</h1>
              <Badge tone={pregnant ? 'given' : 'neutral'}>{m.status.label}</Badge>
            </div>
            <p className="mt-1.5 text-[14px] text-slate-600">
              {m.age} · {m.phoneLabel} · Blood group <strong className="font-semibold text-ink">{m.bloodGroup ?? 'not known'}</strong> ·{' '}
              <span className="whitespace-nowrap">
                Patient ID <span className="font-mono text-[13px]">{m.patientId}</span>
              </span>
            </p>
            <p className="text-[14px] text-slate-600">{m.hasApp ? 'Uses the Enfantil family app' : 'Not on the family app — reached by SMS'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pregnant && (
            <>
              <Button size="sm" icon={ClipboardPlus} to={`/clinic/mothers/${m.id}/anc/new`}>
                Record ANC visit
              </Button>
              <Button size="sm" variant="secondary" icon={Baby} to={`/clinic/mothers/${m.id}/postnatal/new?tab=delivery`}>
                Record delivery
              </Button>
            </>
          )}
          {postnatal && (
            <Button size="sm" icon={ShieldPlus} to={`/clinic/mothers/${m.id}/postnatal/new`}>
              Record postnatal visit
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={CalendarDays} to={`/clinic/appointments/new?patient=${m.id}`}>
            Book appointment
          </Button>
          <Button size="sm" variant="secondary" icon={MessageCircle} onClick={message} loading={opening}>
            Message
          </Button>
          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Edit record
          </Button>
        </div>
      </Card>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {pregnant && <PregnancySummary m={m} />}
          {m.delivery && <DeliverySummary m={m} />}
          {m.pncVisits.length > 0 || postnatal ? <PostnatalTable m={m} /> : null}
          <AncTable m={m} />
          {m.progress.length > 1 && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-h2">Weight</h2>
                <p className="text-small text-slate-600">
                  {m.progress[m.progress.length - 1].weightKg} kg · +{m.progress[m.progress.length - 1].gain} kg since booking
                </p>
                <div className="mt-3">
                  <WeightChart rows={m.progress} />
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-h2">Blood pressure</h2>
                <p className="text-small text-slate-600">Normal range shaded · alert at 140/90</p>
                <div className="mt-3">
                  <BloodPressureChart rows={m.progress} />
                </div>
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-5" aria-label={`${m.firstName}’s care summary`}>
          <NextVisit m={m} />
          <TdCard m={m} />
          <RecordCard m={m} onEdit={() => setEditing(true)} />
          <InfantsCard m={m} />
        </aside>
      </div>

      <EditRecordPanel open={editing} onClose={() => setEditing(false)} kind="mother" id={m.id} onSaved={(r) => setSaved(r)} />
    </>
  )
}

function PregnancySummary({ m }) {
  const p = m.pregnancy
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h2">Pregnancy</h2>
        <p className="text-small text-slate-600">Kenya 8-contact antenatal schedule</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Gestation', `${formatGA(p.ga)} weeks`],
          ['Last period', formatDate(p.lmp)],
          ['Due date', formatDate(p.edd)],
          ['Gravida / para', `G${p.gravida} P${p.para}`],
          ['Days to go', p.daysToGo],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-page px-3.5 py-3">
            <dt className="text-small text-slate-600">{label}</dt>
            <dd className="text-[16px] font-bold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <ol className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-8" aria-label="Antenatal contacts">
        {m.ancPlan.map((c) => (
          <li
            key={c.n}
            className={cx(
              'rounded-xl border px-2 py-2 text-center',
              c.status === 'Completed' ? 'border-teal-100 bg-teal-50' : c.status === 'Overdue' ? 'border-coral-200 bg-coral-50' : 'border-line bg-white',
            )}
          >
            <p className="text-[12px] font-semibold text-slate-600">ANC {c.n}</p>
            <p className="text-[14px] font-bold text-ink">{c.weeks} wk</p>
            <p
              className={cx(
                'text-[11px] font-semibold',
                c.status === 'Completed' ? 'text-given' : c.status === 'Overdue' ? 'text-coral-700' : 'text-slate-600',
              )}
            >
              {c.status === 'Completed' ? (
                <Check className="mx-auto size-3.5" aria-label="Completed" />
              ) : c.status === 'Upcoming' ? (
                formatDate(c.dueOn, 'short')
              ) : (
                c.status
              )}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function DeliverySummary({ m }) {
  const d = m.delivery
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-h2">Delivery</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Date', `${formatDate(d.date)}, ${d.time}`],
          ['Type', d.mode],
          ['Gestation', `${d.gestation} weeks`],
          ['Outcome', `${d.outcome}${d.babySex ? `, ${d.babySex === 'female' ? 'girl' : 'boy'}` : ''}`],
          ['Baby’s weight', `${d.babyWeightKg} kg`],
          ['Apgar', d.apgar || '—'],
          ['Blood loss', d.bloodLoss || '—'],
          ['Attended by', d.attendedBy],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-slate-600">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

const short = (value) => (value === 'Negative' ? 'neg' : value.toLowerCase())

function AncTable({ m }) {
  const delivered = m.pregnancy?.status === 'delivered'
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-h2">{delivered ? 'Antenatal visits (last pregnancy)' : 'Antenatal visits'}</h2>
        <Badge tone="given">{m.ancVisits.length} recorded</Badge>
      </div>
      {m.ancVisits.length === 0 ? (
        <p className="px-5 pb-5 text-[14px] text-slate-600">No antenatal visits recorded yet.</p>
      ) : (
        <DataTable caption="Antenatal visits" minWidth={760} className="text-[13px] [&_td]:text-[13px]">
          <thead>
            <tr>
              <Th>Visit</Th>
              <Th>Date</Th>
              <Th>GA</Th>
              <Th>BP</Th>
              <Th>Weight</Th>
              <Th>FH</Th>
              <Th>FHR</Th>
              <Th>Hb</Th>
              <Th>Urine</Th>
              <Th>By</Th>
            </tr>
          </thead>
          <tbody>
            {[...m.ancVisits].reverse().map((v) => (
              <tr key={v.id} className={cx(v.highBp && 'bg-coral-50/70')}>
                <Td className="whitespace-nowrap font-semibold">{v.contact ? `ANC ${v.contact}` : 'Extra'}</Td>
                <Td className="whitespace-nowrap">{formatDate(v.date)}</Td>
                <Td>{v.ga}</Td>
                <Td className={cx('whitespace-nowrap font-semibold', v.highBp ? 'text-coral-700' : 'text-ink')}>
                  {v.bpSystolic}/{v.bpDiastolic}
                  {v.highBp && <TriangleAlert className="ml-1 inline size-3.5" aria-label="High" />}
                </Td>
                <Td className="whitespace-nowrap">{v.weightKg} kg</Td>
                <Td className="whitespace-nowrap">{v.fundalHeightCm ? `${v.fundalHeightCm} cm` : '—'}</Td>
                <Td className={cx(v.fhrAbnormal && 'font-semibold text-coral-700')}>{v.fetalHeartRate ?? '—'}</Td>
                <Td className={cx(v.lowHb && 'font-semibold text-coral-700')}>{v.hb ?? '—'}</Td>
                <Td className={cx('whitespace-nowrap', v.urineProtein !== 'Negative' && 'font-semibold text-amber-700')}>
                  P {short(v.urineProtein)} · G {short(v.urineGlucose)}
                </Td>
                <Td className="whitespace-nowrap">{v.clinicianName}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {m.ancVisits.some((v) => v.clinicalNote) && (
        <div className="space-y-2 px-5 py-4">
          {[...m.ancVisits]
            .reverse()
            .filter((v) => v.clinicalNote)
            .slice(0, 2)
            .map((v) => (
              <p key={v.id} className="rounded-xl bg-page px-3.5 py-2.5 text-[13px] text-ink">
                <strong className="font-semibold">{formatDate(v.date, 'short')}:</strong> {v.clinicalNote}
              </p>
            ))}
        </div>
      )}
    </Card>
  )
}

function PostnatalTable({ m }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="text-h2">Postnatal care</h2>
        <div className="flex gap-1.5">
          {m.pncPlan.map((v) => (
            <StatusBadge key={v.key} status={v.status} label={`${v.label}: ${v.status}`} />
          ))}
        </div>
      </div>
      {m.pncVisits.length === 0 ? (
        <p className="px-5 pb-5 text-[14px] text-slate-600">No postnatal visits recorded yet.</p>
      ) : (
        <DataTable caption="Postnatal visits" minWidth={720} className="text-[13px] [&_td]:text-[13px]">
          <thead>
            <tr>
              <Th>Visit</Th>
              <Th>Date</Th>
              <Th>BP</Th>
              <Th>Uterus · bleeding</Th>
              <Th>Mood (EPDS)</Th>
              <Th>Family planning</Th>
              <Th>By</Th>
            </tr>
          </thead>
          <tbody>
            {m.pncVisits.map((v) => (
              <tr key={v.id}>
                <Td className="whitespace-nowrap font-semibold">{v.label}</Td>
                <Td className="whitespace-nowrap">{formatDate(v.date)}</Td>
                <Td className="whitespace-nowrap">{v.bp.join('/')}</Td>
                <Td>
                  {v.uterus} · {v.bleeding}
                </Td>
                <Td>{v.epds ?? '—'}</Td>
                <Td>{v.familyPlanning || '—'}</Td>
                <Td className="whitespace-nowrap">{v.clinicianName}</Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  )
}

function NextVisit({ m }) {
  const a = m.upcoming[0]
  if (!a) {
    return (
      <Card className="p-5">
        <p className="text-caption uppercase text-muted">Next appointment</p>
        <p className="mt-2 text-[16px] font-semibold text-ink">Nothing booked</p>
        <Button size="sm" variant="secondary" icon={CalendarDays} to={`/clinic/appointments/new?patient=${m.id}`} className="mt-3">
          Book appointment
        </Button>
      </Card>
    )
  }
  const rel = relativeDay(a.start)
  return (
    <section className="rounded-2xl bg-teal-700 p-5 text-white shadow-card" aria-labelledby="mother-next">
      <p id="mother-next" className="text-caption uppercase text-teal-100">
        Next appointment
      </p>
      <p className="mt-1.5 text-[20px] font-bold leading-7">
        {rel === 'Today' || rel === 'Tomorrow' ? rel : formatDate(a.start, 'weekdayYear')} · {formatTime(a.start, { twelveHour: true })}
      </p>
      <p className="text-[14px] text-teal-50">
        {a.reason} · {a.room} · {a.clinician?.name}
      </p>
      {a.clinicalNote && <p className="mt-3 rounded-xl bg-white/12 px-3.5 py-3 text-[13px] leading-5">{a.clinicalNote}</p>}
    </section>
  )
}

function TdCard({ m }) {
  return (
    <Card className="p-5">
      <h2 className="text-h2">Maternal vaccines (Td)</h2>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {m.td.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <p className="text-[14px] font-semibold text-ink">{d.name}</p>
              <p className="text-[12px] text-slate-600">
                {d.givenOn ? (
                  <>
                    {formatDate(d.givenOn)} · <span className="font-mono">{d.batch}</span>
                  </>
                ) : d.dueOn ? (
                  `Due ${formatDate(d.dueOn)}${d.latestOn ? ` · by ${formatDate(d.latestOn, 'short')}` : ''}`
                ) : (
                  `From ${formatDate(d.earliestOn)}`
                )}
              </p>
            </div>
            <StatusBadge status={d.status} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Updated({ entry }) {
  if (!entry.by) return null
  return (
    <span className="block text-[11px] text-muted">
      {entry.source === 'mother' ? 'Reported by the mother' : `Updated by ${entry.by}`} · {formatDate(entry.at)}
    </span>
  )
}

function RecordCard({ m, onEdit }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h2">Allergies &amp; medicines</h2>
        <Button variant="ghost" size="xs" icon={NotebookPen} onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="mt-3 space-y-3 text-[14px]">
        {m.allergies.length ? (
          m.allergies.map((a) => (
            <div key={a.id} className="flex gap-2.5 rounded-xl bg-coral-50 px-3.5 py-2.5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-coral-700" aria-hidden="true" />
              <div>
                <p>
                  <strong className="font-semibold text-coral-700">{a.substance}</strong> — {a.reaction}
                </p>
                <Updated entry={a} />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-page px-3.5 py-2.5 text-slate-600">{m.nkda ? 'No known drug allergies' : 'No allergies recorded'}</p>
        )}
        {[
          ['Conditions', m.conditions, (c) => `${c.name}${c.status === 'Resolved' ? ' (resolved)' : ''}`],
          ['Medicines', m.medicines, (x) => `${x.name}${x.directions ? ` — ${x.directions}` : ''}`],
          ['Diagnoses', m.diagnoses, (x) => `${x.name}${x.code ? ` · ${x.code}` : ''}`],
        ].map(([label, list, text]) => (
          <div key={label}>
            <p className="text-caption uppercase text-muted">{label}</p>
            {list.length ? (
              <ul className="mt-1 space-y-1.5">
                {list.map((x) => (
                  <li key={x.id} className="text-ink">
                    {text(x)}
                    <Updated entry={x} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-600">None</p>
            )}
          </div>
        ))}
        {m.audit[0] && (
          <p className="border-t border-line pt-2 text-[12px] text-muted">
            Last change: {m.audit[0].action} — {m.audit[0].by}, {formatDate(m.audit[0].at)}
          </p>
        )}
      </div>
    </Card>
  )
}

function InfantsCard({ m }) {
  return (
    <Card className="p-5">
      <h2 className="text-h2">Linked infants</h2>
      {m.children.length ? (
        <ul className="mt-3 space-y-2">
          {m.children.map((c) => (
            <li key={c.id}>
              <Link
                to={`/clinic/patients/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:border-teal-700 hover:bg-teal-50"
              >
                <Avatar initials={c.initials} tone={c.tone} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">{c.fullName}</span>
                  <span className="block text-[12px] text-slate-600">
                    {c.age} · <span className="font-mono">{c.patientId}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-slate-600">
          No infants yet. {m.status.kind === 'pregnant' && 'Recording the delivery creates the baby’s record and links it here.'}
        </p>
      )}
      {m.history.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-caption uppercase text-muted">Pregnancy history</p>
          <ul className="mt-1 space-y-1 text-[13px] text-slate-600">
            {m.history.map((h) => (
              <li key={h.id}>
                {h.year} · {h.outcome} · {h.delivery} · {h.babyWeightKg} kg · {h.gestation} wk
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
