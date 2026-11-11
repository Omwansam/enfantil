import { Check, Copy, Download, Heart, Link2, Printer, Syringe } from 'lucide-react'
import { useState } from 'react'
import { createShareLink, getImmunizations, getShareLink, revokeShareLink } from '../api/immunizations'
import Alert from '../components/Alert'
import AsyncContent from '../components/AsyncContent'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import QRPlaceholder from '../components/QRPlaceholder'
import RequireChild from '../components/RequireChild'
import Skeleton, { SkeletonCard, SkeletonTable } from '../components/Skeleton'
import Table, { Td, Th } from '../components/Table'
import Tabs, { TabPanel } from '../components/Tabs'
import { fieldClass } from '../components/fieldStyles'
import { useChildren } from '../context/ChildContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDate, toDate, TODAY } from '../utils/dates'

export default function VaccinationCard() {
  useDocumentTitle('Vaccination card')
  const { childList, selectedChild, selectChild } = useChildren()
  return (
    <>
      <PageHeader
        className="print:hidden"
        title="Vaccination card"
        subtitle="A printable record for school, nursery or travel"
        actions={
          childList.length > 1 && (
            <Tabs
              variant="pill"
              label="Choose a child"
              idPrefix="card-child"
              value={selectedChild?.id}
              onChange={selectChild}
              tabs={childList.map((c) => ({ value: c.id, label: c.firstName }))}
            />
          )
        }
      />
      <RequireChild>
        {(child) => (
          <TabPanel idPrefix="card-child" value={child.id}>
            <CardContent child={child} />
          </TabPanel>
        )}
      </RequireChild>
    </>
  )
}

/** Same-day doses that the design shows on one row share a `cardGroup`. */
function cardRows(doses) {
  const rows = []
  for (const dose of doses) {
    const prev = rows[rows.length - 1]
    if (dose.cardGroup && prev?.group === dose.cardGroup) prev.doses.push(dose)
    else rows.push({ group: dose.cardGroup, doses: [dose] })
  }
  return rows
}

function CardContent({ child }) {
  const version = useDataVersion()
  const imm = useAsync(() => getImmunizations(child.id), [child.id], version)
  const [printHint, setPrintHint] = useState(false)

  const print = (asPdf) => {
    const previous = document.title
    if (asPdf) {
      document.title = `${child.fullName} vaccination card`
      setPrintHint(true)
    }
    window.print()
    document.title = previous
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px] print:block">
      <AsyncContent
        state={imm}
        errorTitle="We couldn’t load the vaccination record"
        skeleton={
          <Card className="p-6">
            <Skeleton className="h-16 w-full" />
            <SkeletonTable className="mt-6" rows={8} cols={4} />
          </Card>
        }
      >
        {(data) => <RecordCard data={data} />}
      </AsyncContent>

      <div className="space-y-5 print:hidden">
        <Card className="p-5">
          <h2 className="text-h2">Get a copy</h2>
          <div className="mt-4 space-y-3">
            <Button icon={Download} size="lg" fullWidth onClick={() => print(true)}>
              Download PDF
            </Button>
            <Button icon={Printer} variant="secondary" size="lg" fullWidth onClick={() => print(false)}>
              Print
            </Button>
          </div>
          {printHint && (
            <p className="mt-3 text-small text-slate-600" role="status">
              In the print window, choose <strong className="font-semibold text-ink">Save as PDF</strong> as the printer.
            </p>
          )}
        </Card>
        <ShareCard child={child} />
      </div>
    </div>
  )
}

function RecordCard({ data }) {
  const { child, given, upcoming, counts } = data
  const rows = cardRows([...given].sort((a, b) => toDate(a.givenOn) - toDate(b.givenOn) || a.seq - b.seq))
  const next = upcoming.find((d) => d.status === 'Planned')
  const overdue = upcoming.filter((d) => d.status === 'Overdue')
  const summary = [
    `${counts.given} doses given.`,
    next && `Next: ${next.name} on ${formatDate(next.dueOn)}.`,
    overdue.length > 0 && `${overdue.map((d) => d.name).join(', ')} overdue.`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Card as="article" className="print-card overflow-hidden" aria-label={`Immunization record for ${child.fullName}`}>
      <header className="flex items-center gap-4 bg-teal-700 px-6 py-5 text-white">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700">
          <Heart className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[18px] font-semibold">Immunization record</h2>
          <p className="text-[13px] text-teal-50">Kenya KEPI schedule · generated by Enfantil on {formatDate(TODAY)}</p>
        </div>
      </header>

      <div className="flex items-start justify-between gap-6 px-6 py-6">
        <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-caption uppercase text-muted">Name</dt>
            <dd className="text-[20px] font-bold text-ink">{child.fullName}</dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-muted">Date of birth</dt>
            <dd className="text-[15px] font-semibold text-ink">{formatDate(child.dob)}</dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-muted">Sex</dt>
            <dd className="text-[15px] font-semibold text-ink">{child.sexFormal}</dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-muted">Patient ID</dt>
            <dd className="font-mono text-[14px] font-semibold text-ink">{child.patientId ?? 'Waiting for clinic'}</dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-muted">Clinic</dt>
            <dd className="text-[15px] font-semibold text-ink">{child.facility?.name ?? 'Not linked yet'}</dd>
          </div>
        </dl>
        <QRPlaceholder value={`${child.patientId}-${child.dob}`} size={128} className="hidden shrink-0 sm:block" />
      </div>

      <div className="border-t border-dashed border-[#D6D3CC] px-6 pb-6 pt-2">
        {rows.length ? (
          <>
            <Table caption={`Doses given to ${child.fullName}`} minWidth={540}>
              <thead>
                <tr>
                  <Th className="bg-white px-0">Vaccine</Th>
                  <Th className="bg-white">Date given</Th>
                  <Th className="bg-white">Batch</Th>
                  <Th className="bg-white">Facility</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const [first] = row.doses
                  const grouped = row.doses.length > 1
                  return (
                    <tr key={first.id}>
                      <Td className="whitespace-nowrap px-0 pr-4 font-semibold">{grouped ? row.doses.map((d) => d.short).join(' · ') : first.name}</Td>
                      <Td className="whitespace-nowrap">{formatDate(first.givenOn)}</Td>
                      <Td className="whitespace-nowrap font-mono text-[13px] text-slate-600">
                        {grouped ? <span title={row.doses.map((d) => `${d.name}: ${d.batch}`).join('\n')}>{row.doses.length} batches</span> : first.batch}
                      </Td>
                      <Td className="whitespace-nowrap">{first.facilityLabel}</Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
            <p className="mt-4 text-small text-slate-600">{summary}</p>
          </>
        ) : (
          <EmptyState icon={Syringe} title="No doses recorded yet" description="The card fills in as your clinic records each dose." />
        )}
      </div>
    </Card>
  )
}

function ShareCard({ child }) {
  const version = useDataVersion()
  const link = useAsync(() => getShareLink(child.id), [child.id], version)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      document.getElementById('share-url')?.select()
      document.execCommand?.('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Card className="p-5">
      <h2 className="text-h2">Share with a school</h2>
      <p className="mt-1 text-[14px] text-slate-600">Creates a link that shows vaccines only. It stops working after 7 days.</p>
      <AsyncContent state={link} skeleton={<SkeletonCard lines={1} className="mt-4 p-0 shadow-none" />}>
        {(current) =>
          current ? (
            <div className="mt-4">
              <label htmlFor="share-url" className="text-[14px] font-semibold text-ink">
                Share link
              </label>
              <div className="mt-1.5 flex gap-2">
                <input id="share-url" readOnly value={current.url} onFocus={(e) => e.target.select()} className={fieldClass(false, 'min-h-11 font-mono text-[13px]')} />
                <Button variant="secondary" icon={copied ? Check : Copy} onClick={() => copy(current.url)} aria-live="polite">
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-2 text-small text-slate-600">Stops working on {formatDate(current.expiresOn, 'weekdayYear')}.</p>
              <Button variant="danger" className="mt-3" loading={busy} onClick={() => run(() => revokeShareLink(child.id))}>
                Turn off link
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="lg" fullWidth icon={Link2} className="mt-4" loading={busy} onClick={() => run(() => createShareLink(child.id))}>
              Create share link
            </Button>
          )
        }
      </AsyncContent>
      {error && (
        <Alert tone="coral" role="alert" className="mt-3">
          {error}
        </Alert>
      )}
    </Card>
  )
}
