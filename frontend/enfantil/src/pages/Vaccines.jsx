import { ChevronDown, ChevronRight, Download, ShieldCheck, Syringe } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImmunizations } from '../api/immunizations'
import AsyncContent from '../components/AsyncContent'
import Badge, { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import ChildSwitcher from '../components/ChildSwitcher'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import ProgressBar from '../components/ProgressBar'
import RequireChild from '../components/RequireChild'
import Skeleton, { SkeletonTable } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import Table, { Td, Th } from '../components/Table'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { daysBetween, formatDate, formatTime, relativeDay, toDate, TODAY } from '../utils/dates'

export default function Vaccines() {
  useDocumentTitle('Vaccines')
  return <RequireChild>{(child) => <Immunizations child={child} />}</RequireChild>
}

function Immunizations({ child }) {
  const version = useDataVersion()
  const state = useAsync(() => getImmunizations(child.id), [child.id], version)

  return (
    <>
      <PageHeader
        title="Immunizations"
        subtitle={`${child.fullName} · ${child.age} · Kenya KEPI schedule`}
        actions={
          <>
            <ChildSwitcher variant="chip" align="right" />
            <Button to="/family/card" icon={Download}>
              Vaccination card
            </Button>
          </>
        }
      />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load vaccines"
        skeleton={
          <div className="space-y-5" role="status" aria-label="Loading vaccines">
            <Skeleton className="h-[100px] rounded-2xl" />
            <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)]">
              <Skeleton className="h-[320px] rounded-2xl" />
              <Card className="p-6">
                <SkeletonTable rows={7} cols={5} />
              </Card>
            </div>
          </div>
        }
        isEmpty={(d) => d.counts.total === 0}
        empty={
          <Card>
            <EmptyState
              icon={Syringe}
              title="No vaccines on record yet"
              description={`Your clinic will add ${child.firstName}’s vaccines when they confirm the record at the next visit.`}
              action={<Button to="/family/visits/new">Request appointment</Button>}
            />
          </Card>
        }
      >
        {(data) => <ImmunizationContent data={data} />}
      </AsyncContent>
    </>
  )
}

function ImmunizationContent({ data }) {
  const { counts, given, upcoming, scheduleTo, child } = data
  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <p className="font-semibold text-ink">
              {counts.given} of {counts.total} doses given
            </p>
            {scheduleTo && <p className="text-slate-600">to {scheduleTo}</p>}
          </div>
          <ProgressBar value={counts.given} max={counts.total} label="Doses given" className="mt-3" />
        </div>
        <div className="flex gap-3">
          <StatTile value={counts.given} label="Given" tone="teal" />
          <StatTile value={counts.planned} label="Planned" tone="amber" />
          <StatTile value={counts.overdue} label="Overdue" tone="coral" />
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)]">
        <section aria-labelledby="planned-heading">
          <h2 id="planned-heading" className="mb-3 text-h2">
            Planned doses
          </h2>
          {upcoming.length ? (
            <ul className="space-y-3">
              {upcoming.map((dose) => (
                <li key={dose.id}>
                  <PlannedDoseCard dose={dose} />
                </li>
              ))}
            </ul>
          ) : (
            <Card>
              <EmptyState icon={ShieldCheck} title="Nothing planned" description={`${child.firstName} is up to date with the schedule for now.`} />
            </Card>
          )}
        </section>

        <Card className="overflow-hidden" aria-labelledby="administered-heading">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
            <h2 id="administered-heading" className="text-h2">
              Administered
            </h2>
            <Badge tone="given">{given.length} doses</Badge>
          </div>
          {given.length ? (
            <AdministeredTable doses={given} />
          ) : (
            <EmptyState icon={Syringe} title="No doses recorded yet" description="Doses appear here as soon as the clinic records them." />
          )}
        </Card>
      </div>
    </div>
  )
}

function PlannedDoseCard({ dose }) {
  const overdue = dose.status === 'Overdue'
  const appt = dose.appointment
  const rel = relativeDay(dose.dueOn)
  const extra = rel ? rel.toLowerCase() : dose.vaccine.numbered ? dose.ageLabel : null
  let apptText = null
  if (appt) {
    const sameYear = toDate(appt.start).getFullYear() === TODAY.getFullYear()
    const when = `${formatDate(appt.start, sameYear ? 'weekday' : 'weekdayYear')}, ${formatTime(appt.start)}`
    const soon = daysBetween(TODAY, appt.start) <= 7
    apptText = overdue ? `Catch-up at ${when} visit` : `${when}${soon && appt.clinician ? ` · ${appt.clinician.name}` : ''}`
  }
  return (
    <article className={cx('relative rounded-2xl p-4 shadow-card', overdue ? 'border border-coral-200 bg-coral-50' : 'bg-white')}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-ink">
          <Link to={`/family/vaccines/${dose.id}`} className="hover:underline">
            {dose.title}
          </Link>
        </h3>
        <StatusBadge status={dose.status} className={overdue ? 'bg-white' : undefined} />
      </div>
      {overdue ? (
        <p className="mt-1 text-[14px] font-medium text-coral-700">
          Was due {formatDate(dose.dueOn)} · {dose.daysLate} days late
        </p>
      ) : (
        <p className="mt-1 text-[14px] text-slate-600">
          Due {formatDate(dose.dueOn)}
          {extra && ` · ${extra}`}
        </p>
      )}
      {appt ? (
        <Link to={`/family/visits?visit=${appt.id}`} className="mt-1 inline-flex min-h-8 items-center gap-1 text-[13px] font-semibold text-teal-700 hover:underline">
          {apptText} <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className="mt-1 text-[13px] text-slate-600">No appointment yet — your clinic will book it</p>
      )}
    </article>
  )
}

/** Rows grouped as in the design (same-day doses share a row) with an expander to show every batch. */
function groupRows(doses) {
  const rows = []
  for (const dose of doses) {
    const prev = rows[rows.length - 1]
    if (dose.tableGroup && prev && prev.key === dose.tableGroup) prev.doses.push(dose)
    else rows.push({ key: dose.tableGroup ?? dose.id, doses: [dose] })
  }
  return rows
}

function AdministeredTable({ doses }) {
  const [expanded, setExpanded] = useState({})
  const rows = groupRows(doses)
  return (
    <Table caption="Administered doses" minWidth={760} className="max-h-[560px] overflow-y-auto px-5 pb-4">
      <thead className="sticky top-0 z-10">
        <tr>
          <Th>Date</Th>
          <Th>Vaccine</Th>
          <Th>Batch no.</Th>
          <Th>Given by</Th>
          <Th>Clinic</Th>
          <Th>
            <span className="sr-only">Visit</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const [first] = row.doses
          const grouped = row.doses.length > 1
          const open = expanded[row.key]
          return (
            <Fragment key={row.key}>
              <tr className="hover:bg-[#FAFAF8]">
                <Td className="whitespace-nowrap">{formatDate(first.givenOn)}</Td>
                <Td className="whitespace-nowrap font-semibold">
                  {grouped ? (
                    row.doses.map((d) => d.short).join(' · ')
                  ) : (
                    <Link to={`/family/vaccines/${first.id}`} className="hover:text-teal-700 hover:underline">
                      {first.name}
                    </Link>
                  )}
                </Td>
                <Td className="whitespace-nowrap font-mono text-[13px] text-slate-600">
                  {grouped ? (
                    <button
                      type="button"
                      aria-expanded={Boolean(open)}
                      onClick={() => setExpanded((e) => ({ ...e, [row.key]: !open }))}
                      className="-mx-2 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 hover:bg-teal-50 hover:text-teal-800"
                    >
                      {row.doses.length} batches
                      {open ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                    </button>
                  ) : (
                    first.batch
                  )}
                </Td>
                <Td className="whitespace-nowrap">{first.givenBy}</Td>
                <Td className="whitespace-nowrap">{first.facilityLabel}</Td>
                <Td>
                  {first.appointmentId ? (
                    <Link to={`/family/visits?visit=${first.appointmentId}`} className="font-semibold text-teal-700 hover:underline">
                      Visit<span className="sr-only"> on {formatDate(first.givenOn)}</span>
                    </Link>
                  ) : (
                    <span className="text-muted" aria-label="No linked visit">
                      —
                    </span>
                  )}
                </Td>
              </tr>
              {grouped &&
                open &&
                row.doses.map((d) => (
                  <tr key={d.id} className="bg-[#FAFAF8]">
                    <Td />
                    <Td className="pl-8">
                      <Link to={`/family/vaccines/${d.id}`} className="hover:text-teal-700 hover:underline">
                        {d.name}
                      </Link>
                    </Td>
                    <Td className="font-mono text-[13px] text-slate-600">{d.batch}</Td>
                    <Td>{d.givenBy}</Td>
                    <Td>{d.facilityLabel}</Td>
                    <Td />
                  </tr>
                ))}
            </Fragment>
          )
        })}
      </tbody>
    </Table>
  )
}
