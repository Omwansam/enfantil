import { LineChart as LineIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMaternalProgress } from '../../api/maternal'
import AsyncContent from '../../components/AsyncContent'
import Card, { CardHeader } from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { BloodPressureChart, WeightChart } from '../../components/MaternalCharts'
import PageHeader from '../../components/PageHeader'
import RequireMe from '../../components/RequireMe'
import { SkeletonCard } from '../../components/Skeleton'
import Table, { Td, Th } from '../../components/Table'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDate } from '../../utils/dates'
import { isHighBp } from '../../utils/pregnancy'

/** M7 — weight gain and blood pressure across antenatal visits. */
export default function MaternalProgress() {
  useDocumentTitle('My progress')
  return <RequireMe>{() => <Progress />}</RequireMe>
}

function Progress() {
  const version = useDataVersion()
  const state = useAsync(getMaternalProgress, [], version)
  return (
    <>
      <PageHeader title="My progress" subtitle="Weight and blood pressure at each antenatal visit" />
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load your progress"
        skeleton={
          <div className="grid gap-5 lg:grid-cols-2">
            <SkeletonCard lines={6} />
            <SkeletonCard lines={6} />
          </div>
        }
        isEmpty={(d) => d.rows.length === 0}
        empty={
          <Card>
            <EmptyState icon={LineIcon} title="No antenatal visits yet" description="After your first antenatal visit, your weight and blood pressure appear here as charts." />
          </Card>
        }
      >
        {(d) => {
          const last = d.rows[d.rows.length - 1]
          return (
            <div className="space-y-5">
              {!d.pregnant && <p className="rounded-xl bg-teal-50 px-4 py-3 text-[14px] text-teal-800">These are the readings from your last pregnancy.</p>}
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <Card className="p-5 sm:p-6">
                  <CardHeader title="Weight" subtitle={`${last.weightKg} kg now · +${last.gain} kg since your first visit (${d.booking} kg)`} />
                  <div className="mt-4">
                    <WeightChart rows={d.rows} />
                  </div>
                  <p className="mt-2 text-small text-slate-600">Most mothers gain 10–15 kg in total. Your midwife checks your gain at every visit.</p>
                </Card>
                <Card className="p-5 sm:p-6">
                  <CardHeader title="Blood pressure" subtitle={`Latest ${last.systolic}/${last.diastolic} mmHg · normal is below 140/90`} />
                  <div className="mt-4">
                    <BloodPressureChart rows={d.rows} />
                  </div>
                  <p className="mt-2 text-small text-slate-600">
                    The shaded bands are the normal range. A reading of 140/90 or more needs a check the same day.
                  </p>
                </Card>
              </div>
              <Card className="overflow-hidden">
                <div className="px-5 pb-3 pt-5 sm:px-6">
                  <h2 className="text-h2">All readings</h2>
                </div>
                <Table caption="Weight and blood pressure readings" minWidth={560} className="px-5 pb-4 sm:px-6">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Weeks</Th>
                      <Th>Weight</Th>
                      <Th>Gain</Th>
                      <Th>Blood pressure</Th>
                      <Th>
                        <span className="sr-only">Visit</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...d.rows].reverse().map((r) => {
                      const high = isHighBp(r.systolic, r.diastolic)
                      return (
                        <tr key={r.id}>
                          <Td>{formatDate(r.date)}</Td>
                          <Td>{r.ga}</Td>
                          <Td className="font-semibold">{r.weightKg} kg</Td>
                          <Td>{r.gain > 0 ? `+${r.gain} kg` : '—'}</Td>
                          <Td className={cx('font-semibold', high ? 'text-coral-700' : 'text-ink')}>
                            {r.systolic}/{r.diastolic}
                            {high && ' · high'}
                          </Td>
                          <Td>
                            <Link to={`/family/me/antenatal/${r.id}`} className="font-semibold text-teal-700 hover:underline">
                              Visit<span className="sr-only"> on {formatDate(r.date)}</span>
                            </Link>
                          </Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </Card>
            </div>
          )
        }}
      </AsyncContent>
    </>
  )
}
