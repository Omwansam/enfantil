import { Check, CircleCheck, Download, Phone, Send, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getCoverage, getDefaulters } from '../../api/coverage'
import { sendReminder, sendReminders } from '../../api/reminders'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Badge from '../../components/Badge'
import Banner from '../../components/Banner'
import BarChart from '../../components/BarChart'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DataTable, { TableMessage, Td, Th } from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import { FilterSelect } from '../../components/FilterBar'
import Skeleton, { SkeletonCard } from '../../components/Skeleton'
import StatCard from '../../components/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { TODAY_ISO } from '../../utils/dates'
import { downloadCsv, pluralize, telHref } from '../../utils/format'

export default function Coverage() {
  useDocumentTitle('Coverage')
  const { facility } = useAuth()
  const version = useDataVersion()
  const [period, setPeriod] = useState('2026-10')
  const report = useAsync(() => getCoverage(period), [period], version)
  const defaulters = useAsync(() => getDefaulters(), [], version)
  const [flash, setFlash] = useState('')
  const [remindingAll, setRemindingAll] = useState(false)
  const [rowSending, setRowSending] = useState({})
  const [actionError, setActionError] = useState('')

  const remind = async (child) => {
    setRowSending((s) => ({ ...s, [child.id]: true }))
    setActionError('')
    try {
      await sendReminder(child.id)
      setFlash(`Reminder sent to ${child.caregiver?.name ?? 'the caregiver'} by SMS${child.caregiver?.hasApp ? ' and in the app' : ''}.`)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setRowSending((s) => ({ ...s, [child.id]: false }))
    }
  }

  const remindAll = async () => {
    setRemindingAll(true)
    setActionError('')
    try {
      const { sent } = await sendReminders(defaulters.data.map((d) => d.id))
      setFlash(sent ? `${pluralize(sent, 'reminder')} sent by SMS and in the app.` : 'Everyone on this list was already reminded today.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setRemindingAll(false)
    }
  }

  const exportReport = () => {
    const r = report.data
    const d = defaulters.data ?? []
    downloadCsv(`enfantil-coverage-${r.id}.csv`, [
      [`Coverage report · ${facility?.name} · ${r.label}`],
      [],
      ['Measure', 'Value'],
      ['Registered under 2', r.registeredUnder2],
      ['Authorised patients', r.authorised],
      ['Fully immunized at 12 months (%)', r.fullyImmunized12m],
      ['Children with overdue doses', r.overdueChildren],
      [],
      ['Dose', 'Coverage (%)', `Target ${r.target}%`],
      ...r.doses.map((x) => [x.name, x.value, x.value >= r.target ? 'At or above target' : 'Below target']),
      [],
      ['Defaulters to follow up', `as of ${TODAY_ISO}`],
      ['Child', 'Patient ID', 'Age', 'Overdue dose', 'Days late', 'Caregiver', 'Phone', 'Last contact'],
      ...d.map((x) => [x.fullName, x.patientId, x.age, x.overdueLabel, x.daysLate, x.caregiver?.name, x.caregiver?.phoneLabel, x.lastContact.text]),
    ])
  }

  const pending = (defaulters.data ?? []).filter((d) => !d.remindedToday).length

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1 text-ink">Coverage &amp; defaulter tracing</h1>
          <p className="mt-0.5 text-[15px] text-slate-600">Children under 2 registered at {facility?.name} · sample data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Report period"
            value={period}
            onChange={setPeriod}
            options={(report.data?.periods ?? [{ id: period, label: 'October 2026' }]).map((p) => ({ value: p.id, label: p.label }))}
            className="min-w-[180px] [&_select]:min-h-11 [&_select]:rounded-xl"
          />
          <Button variant="neutral" icon={Download} onClick={exportReport} disabled={!report.data}>
            Export report
          </Button>
        </div>
      </div>

      {flash && (
        <Banner tone="success" icon={CircleCheck} role="status" className="mb-5" onDismiss={() => setFlash('')}>
          {flash}
        </Banner>
      )}

      <AsyncContent
        state={report}
        errorTitle="We couldn’t load the coverage report"
        skeleton={
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[112px] rounded-2xl" />
              ))}
            </div>
            <SkeletonCard lines={6} />
          </div>
        }
      >
        {(r) => <Report r={r} />}
      </AsyncContent>

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <h2 className="text-h2">Defaulters to follow up</h2>
          {defaulters.data && defaulters.data.length > 0 && (
            <Button icon={pending ? Send : Check} onClick={remindAll} loading={remindingAll} disabled={!pending}>
              {pending ? `Remind all (${pending})` : 'Everyone reminded today'}
            </Button>
          )}
        </div>
        {actionError && (
          <p role="alert" className="mx-5 mb-3 rounded-xl bg-coral-50 px-3.5 py-2.5 text-[14px] text-coral-700">
            {actionError}
          </p>
        )}
        <DataTable caption="Defaulters to follow up" minWidth={940}>
          <thead>
            <tr>
              <Th>Child</Th>
              <Th>Overdue dose</Th>
              <Th>Days late</Th>
              <Th>Caregiver · Last contact</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {defaulters.error && !defaulters.data ? (
              <TableMessage colSpan={5}>
                <ErrorState title="We couldn’t load the defaulter list" error={defaulters.error} onRetry={defaulters.reload} />
              </TableMessage>
            ) : !defaulters.data ? (
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  {[150, 160, 70, 200, 190].map((w, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" style={{ width: w }} />
                    </Td>
                  ))}
                </tr>
              ))
            ) : defaulters.data.length === 0 ? (
              <TableMessage colSpan={5}>
                <EmptyState icon={UserCheck} title="No children are overdue" description="Every authorised child is up to date with the KEPI schedule." />
              </TableMessage>
            ) : (
              defaulters.data.map((d) => (
                <tr key={d.id} className="hover:bg-[#FAF9F7]">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={d.initials} tone={d.tone} size="sm" />
                      <div className="min-w-0">
                        <Link to={`/clinic/patients/${d.id}`} className="block text-[14px] font-semibold text-ink hover:underline">
                          {d.fullName}
                        </Link>
                        <span className="text-[12px] text-muted">{d.age}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="max-w-[200px] text-slate-600">{d.overdueLabel}</Td>
                  <Td>
                    <Badge tone={d.daysLate > 30 ? 'overdue' : 'planned'} className="min-w-[76px] justify-center">
                      {d.daysLate} days
                    </Badge>
                  </Td>
                  <Td>
                    <span className="block text-[14px] text-ink">
                      {d.caregiver?.name} · {d.caregiver?.phoneLabel}
                    </span>
                    <span
                      className={cx(
                        'text-[12px]',
                        d.lastContact.tone === 'alert' ? 'text-coral-700' : d.lastContact.tone === 'success' ? 'font-medium text-completed' : 'text-slate-600',
                      )}
                    >
                      {d.lastContact.text}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      {d.remindedToday ? (
                        <span className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] bg-completed-bg px-3 text-[13px] font-semibold text-completed">
                          <Check className="size-4" aria-hidden="true" />
                          Sent
                        </span>
                      ) : (
                        <Button
                          variant="outlineNeutral"
                          size="xs"
                          icon={Send}
                          onClick={() => remind(d)}
                          loading={rowSending[d.id]}
                          aria-label={`Send SMS reminder to ${d.caregiver?.name}`}
                        >
                          SMS reminder
                        </Button>
                      )}
                      {d.caregiver && (
                        <a
                          href={telHref(d.caregiver.phone)}
                          aria-label={`Call ${d.caregiver.name}`}
                          title={`Call ${d.caregiver.name}`}
                          className="inline-flex size-10 items-center justify-center rounded-[10px] border border-line text-ink hover:bg-[#F7F6F3]"
                        >
                          <Phone className="size-4" aria-hidden="true" />
                        </a>
                      )}
                      <Button
                        variant="outlineNeutral"
                        size="xs"
                        to={`/clinic/appointments/new?patient=${d.id}&date=${TODAY_ISO}`}
                        aria-label={`Book a visit for ${d.fullName}`}
                      >
                        Book
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </>
  )
}

function Report({ r }) {
  const change = r.previous ? r.fullyImmunized12m - r.previous.fullyImmunized12m : null
  const prevMonth = r.previous?.label.split(' ')[0]
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Registered under 2" value={r.registeredUnder2} note={`of ${r.authorised} authorised patients`} />
        <StatCard
          label="Fully immunized at 12 mo"
          value={`${r.fullyImmunized12m}%`}
          note={
            change === null
              ? 'No earlier month to compare'
              : change === 0
                ? `Same as ${prevMonth}`
                : `${change > 0 ? 'Up' : 'Down'} ${pluralize(Math.abs(change), 'point')} from ${prevMonth}`
          }
          noteTone={change > 0 ? 'success' : change < 0 ? 'alert' : 'muted'}
        />
        <StatCard label="Children with overdue doses" value={r.overdueChildren} valueTone="alert" note={`${r.overdueOver30} more than 30 days late`} />
        <StatCard label="Reminders sent this week" value={r.remindersThisWeek} note="SMS and in-app" />
      </div>

      <Card className="mt-5 p-5">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-h2">Coverage by dose</h2>
          <p className="text-small text-slate-600">Share of eligible children who received the dose · target {r.target}%</p>
        </div>
        <BarChart data={r.doses} target={r.target} caption={`Coverage by dose, ${r.label}`} />
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-slate-600" aria-hidden="true">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-teal-700" />
            At or above target
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-coral-500" />
            Below target
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-0.5 bg-slate-600" />
            {r.target}% target
          </li>
        </ul>
      </Card>
    </>
  )
}
