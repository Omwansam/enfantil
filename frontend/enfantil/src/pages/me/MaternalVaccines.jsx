import { ShieldCheck, Syringe } from 'lucide-react'
import { getMaternalVaccines } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import ProgressBar from '../../components/ProgressBar'
import RequireMe from '../../components/RequireMe'
import Skeleton from '../../components/Skeleton'
import StatTile from '../../components/StatTile'
import Table, { Td, Th } from '../../components/Table'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate } from '../../utils/dates'

/** M8 — tetanus-diphtheria (Td) doses, planned vs given. */
export default function MaternalVaccines() {
  useDocumentTitle('My vaccines')
  return <RequireMe>{() => <Vaccines />}</RequireMe>
}

function Vaccines() {
  const version = useDataVersion()
  const state = useAsync(getMaternalVaccines, [], version)
  return (
    <>
      <PageHeader title="My vaccines" subtitle="Tetanus-diphtheria (Td) · protects you and your newborn" />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your vaccines"
        skeleton={
          <div className="space-y-5" role="status" aria-label="Loading vaccines">
            <Skeleton className="h-[100px] rounded-2xl" />
            <Skeleton className="h-[260px] rounded-2xl" />
          </div>
        }
        isEmpty={(d) => d.doses.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={Syringe}
              title="No vaccines on record yet"
              description="Your Td vaccine is planned at your first antenatal visit. Doses you had before can be added by the hospital from your MCH handbook."
              action={<Button to="/family/visits/new?for=me">Book appointment</Button>}
            />
          </Card>
        }
      >
        {(d) => {
          const given = d.doses.filter((x) => x.status === 'Given')
          const planned = d.doses.filter((x) => x.status !== 'Given')
          return (
            <div className="space-y-5">
              <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3 text-[14px]">
                    <p className="font-semibold text-ink">{given.length} of 5 Td doses given</p>
                    <p className="text-slate-600">5 doses = lifelong protection</p>
                  </div>
                  <ProgressBar value={given.length} max={5} label="Td doses given" className="mt-3" />
                </div>
                <div className="flex gap-3">
                  <StatTile value={given.length} label="Given" tone="teal" />
                  <StatTile value={planned.filter((x) => x.status === 'Planned').length} label="Planned" tone="amber" />
                  <StatTile value={planned.filter((x) => x.status === 'Overdue').length} label="Overdue" tone="coral" />
                </div>
              </Card>

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,9fr)]">
                <section aria-labelledby="planned-heading">
                  <h2 id="planned-heading" className="mb-3 text-h2">
                    Planned
                  </h2>
                  {planned.length ? (
                    <ul className="space-y-3">
                      {planned.map((dose) => (
                        <li key={dose.id}>
                          <article className={cx('rounded-2xl p-4 shadow-card', dose.status === 'Overdue' ? 'border border-coral-200 bg-coral-50' : 'bg-white')}>
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-[16px] font-semibold text-ink">{dose.title}</h3>
                              <StatusBadge status={dose.status} className={dose.status === 'Overdue' ? 'bg-white' : undefined} />
                            </div>
                            <p className={cx('mt-1 text-[14px]', dose.status === 'Overdue' ? 'font-medium text-coral-700' : 'text-slate-600')}>
                              {dose.dueOn ? `Due ${formatDate(dose.dueOn, 'weekdayYear')}` : dose.canGiveNow ? 'Can be given now' : `From ${formatDate(dose.earliestOn)}`}
                              {dose.latestOn && ` · before ${formatDate(dose.latestOn, 'short')}`}
                            </p>
                            <p className="mt-1 text-[13px] text-slate-600">{dose.note}</p>
                          </article>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Card>
                      <EmptyState icon={ShieldCheck} title="Nothing planned" description="You are up to date with Td." />
                    </Card>
                  )}
                  <Card className="mt-5 p-5">
                    <h2 className="text-h2">About Td</h2>
                    <p className="mt-2 text-[14px] leading-6 text-slate-600">
                      Protects {d.info.protects}. {d.info.how}
                    </p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[14px] text-slate-600">
                      {d.info.schedule.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </Card>
                </section>

                <Card className="overflow-hidden" aria-labelledby="given-heading">
                  <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
                    <h2 id="given-heading" className="text-h2">
                      Given
                    </h2>
                    <Badge tone="given">{given.length} doses</Badge>
                  </div>
                  {given.length ? (
                    <Table caption="Td doses given" minWidth={520} className="px-5 pb-4">
                      <thead>
                        <tr>
                          <Th>Date</Th>
                          <Th>Dose</Th>
                          <Th>Batch no.</Th>
                          <Th>Given by</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...given].reverse().map((dose) => (
                          <tr key={dose.id}>
                            <Td className="whitespace-nowrap">{formatDate(dose.givenOn)}</Td>
                            <Td className="whitespace-nowrap font-semibold">{dose.name}</Td>
                            <Td className="whitespace-nowrap font-mono text-[13px] text-slate-600">{dose.batch}</Td>
                            <Td className="whitespace-nowrap">{dose.givenBy}</Td>
                            <Td>
                              <StatusBadge status="Given" />
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <EmptyState icon={Syringe} title="No doses recorded yet" description="Doses appear here when the hospital records them." />
                  )}
                </Card>
              </div>
            </div>
          )
        }}
      </AsyncContent>
    </>
  )
}
