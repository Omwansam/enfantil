import { CalendarDays, Pill, Printer, Ruler, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments } from '../api/appointments'
import { getHealthProfile } from '../api/children'
import { getMeasurements } from '../api/growth'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card, { CardHeader } from '../components/Card'
import ChildSwitcher from '../components/ChildSwitcher'
import EmptyState from '../components/EmptyState'
import GrowthChart from '../components/GrowthChart'
import PageHeader from '../components/PageHeader'
import RequireChild from '../components/RequireChild'
import SegmentedControl from '../components/SegmentedControl'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton'
import Table, { Td, Th } from '../components/Table'
import { linkClass } from '../components/fieldStyles'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDate } from '../utils/dates'
import { possessive } from '../utils/format'

export default function HealthProfile() {
  useDocumentTitle('Health profile')
  return <RequireChild>{(child) => <Profile child={child} />}</RequireChild>
}

function Profile({ child }) {
  const version = useDataVersion()
  const profile = useAsync(() => getHealthProfile(child.id), [child.id], version)
  const growth = useAsync(() => getMeasurements(child.id), [child.id], version)
  const visits = useAsync(() => getAppointments({ when: 'past', childId: child.id }), [child.id], version)

  return (
    <>
      <PageHeader
        leading={<Avatar initials={child.initials} tone={child.tone} size="lg" />}
        title={child.fullName}
        subtitle={`${child.sexLabel} · ${child.age} · Born ${formatDate(child.dob)}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <ChildSwitcher variant="button" align="right" />
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print summary
            </Button>
          </div>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] print:grid-cols-[minmax(0,1fr)_260px]">
        <Card className="print-card p-5 sm:p-6">
          <AsyncContent
            state={growth}
            errorTitle="We couldn’t load growth measurements"
            skeleton={<SkeletonTable rows={6} cols={5} label="Loading growth" />}
            isEmpty={(list) => list.length === 0}
            empty={
              <EmptyState
                icon={Ruler}
                title="No measurements yet"
                description={`${possessive(child.firstName)} weight and height will appear here after the clinic records them.`}
              />
            }
          >
            {(list) => <GrowthSection measurements={list} />}
          </AsyncContent>
        </Card>

        <div className="space-y-5">
          <AsyncContent state={profile} errorTitle="We couldn’t load the profile" skeleton={<SkeletonCard lines={4} />}>
            {(p) => <ProfileCards profile={p} />}
          </AsyncContent>
        </div>
      </div>

      <Card className="print-card mt-5 p-5 sm:p-6">
        <CardHeader
          title="Visit history"
          action={
            <Link to="/family/visits?tab=past" className={`${linkClass} text-[14px] print:hidden`}>
              All visits
            </Link>
          }
        />
        <div className="mt-4">
          <AsyncContent
            state={visits}
            errorTitle="We couldn’t load visits"
            skeleton={<SkeletonTable rows={4} cols={5} label="Loading visits" />}
            isEmpty={(list) => list.length === 0}
            empty={<EmptyState icon={CalendarDays} title="No past visits yet" description="Completed and cancelled visits will be listed here." />}
          >
            {(list) => (
              <Table caption={`${possessive(child.firstName)} visit history`} minWidth={640}>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Visit</Th>
                    <Th>Clinician</Th>
                    <Th>Clinic</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((v) => (
                    <tr key={v.id} className="hover:bg-[#FAFAF8]">
                      <Td className="whitespace-nowrap">{formatDate(v.start)}</Td>
                      <Td className="font-semibold">
                        <Link to={`/family/visits?visit=${v.id}`} className="hover:text-teal-700 hover:underline">
                          {v.title}
                        </Link>
                      </Td>
                      <Td>{v.clinician?.name ?? 'Any available'}</Td>
                      <Td>{v.facility?.shortName}</Td>
                      <Td>
                        <StatusBadge status={v.displayStatus} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </AsyncContent>
        </div>
      </Card>
    </>
  )
}

function GrowthSection({ measurements }) {
  const [metric, setMetric] = useState('weight')
  const [latest, previous] = measurements
  const unit = metric === 'weight' ? 'kg' : 'cm'
  const value = (m) => (metric === 'weight' ? m.weightKg : m.heightCm)
  const change = previous ? value(latest) - value(previous) : null
  const ascending = [...measurements].reverse()

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h2">Growth</h2>
          <p className="text-small text-muted">
            Last measured {formatDate(latest.date)}
            {latest.facility ? ` at ${latest.facility.name}` : ''}
          </p>
        </div>
        <SegmentedControl
          label="Chart measurement"
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'weight', label: 'Weight' },
            { value: 'height', label: 'Height' },
          ]}
          className="print:hidden"
        />
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3" aria-live="polite">
        <span className="text-[32px] font-bold leading-10 text-ink">
          {value(latest).toFixed(1)} {unit}
        </span>
        {change !== null && (
          <span className={`text-[14px] font-semibold ${change >= 0 ? 'text-teal-700' : 'text-coral-700'}`}>
            {change >= 0 ? '+' : '−'}
            {Math.abs(change).toFixed(1)} {unit} since {formatDate(previous.date, 'short')}
          </span>
        )}
      </p>

      <div className="mt-3">{ascending.length > 1 ? <GrowthChart points={ascending} metric={metric} /> : <p className="py-8 text-center text-[14px] text-muted">The chart appears after a second measurement.</p>}</div>

      <Table caption="Growth measurements" minWidth={560} className="mt-4">
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Age</Th>
            <Th>Weight</Th>
            <Th>Height</Th>
            <Th>Measured by</Th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m, i) => (
            <tr key={m.id}>
              <Td className="whitespace-nowrap">{formatDate(m.date)}</Td>
              <Td>{m.ageLabel}</Td>
              <Td className={i === 0 ? 'font-semibold' : undefined}>{m.weightKg.toFixed(1)} kg</Td>
              <Td className={i === 0 ? 'font-semibold' : undefined}>{m.heightCm.toFixed(1)} cm</Td>
              <Td>{m.measuredBy}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  )
}

function ProfileCards({ profile }) {
  const rows = [
    ['Patient ID', profile.patientId ?? 'Waiting for clinic', 'font-mono'],
    ['Birth weight', profile.birthWeightKg ? `${profile.birthWeightKg.toFixed(1)} kg` : 'Not recorded'],
    ['Born at', profile.bornAt || 'Not recorded'],
    ['Main clinician', profile.mainClinician?.name ?? 'Not assigned yet'],
  ]
  return (
    <>
      <Card className="print-card p-5">
        <h2 className="text-h2">About {profile.firstName}</h2>
        <dl className="mt-2 divide-y divide-line border-t border-line">
          {rows.map(([label, value, extra]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px]">
              <dt className="text-slate-600">{label}</dt>
              <dd className={`text-right font-semibold text-ink ${extra ?? ''}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="print-card p-5">
        <h2 className="text-h2">Allergies</h2>
        {profile.allergies.length ? (
          <ul className="mt-3 space-y-2">
            {profile.allergies.map((a) => (
              <li key={a.id} className="flex gap-3 rounded-xl bg-coral-50 px-4 py-3">
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-coral-700" aria-hidden="true" />
                <div className="text-[14px]">
                  <p className="text-ink">
                    <strong className="font-semibold text-coral-700">{a.substance}</strong> — {a.reaction}
                  </p>
                  <p className="text-small text-slate-600">Recorded {formatDate(a.recordedOn)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-slate-600">No known allergies recorded.</p>
        )}
      </Card>

      <Card className="print-card p-5">
        <h2 className="text-h2">Current medicines</h2>
        {profile.medicines.length ? (
          <ul className="mt-3 space-y-3">
            {profile.medicines.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <Pill className="size-5" aria-hidden="true" />
                </span>
                <div className="text-[14px]">
                  <p className="font-semibold text-ink">{m.name}</p>
                  <p className="text-small text-slate-600">
                    {m.directions} · since {formatDate(m.since)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-slate-600">No current medicines.</p>
        )}
      </Card>
    </>
  )
}
