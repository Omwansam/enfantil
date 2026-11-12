import { ChevronRight, Download, Plus, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { exportPatients, listPatients } from '../../api/patients'
import Avatar from '../../components/Avatar'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import DataTable, { TableMessage, Td, Th } from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import SearchInput from '../../components/SearchInput'
import Skeleton from '../../components/Skeleton'
import Tabs, { TabPanel } from '../../components/Tabs'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatDayOrDate, TODAY_ISO } from '../../utils/dates'
import { downloadCsv } from '../../utils/format'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due', label: 'Due this week' },
  { value: 'uptodate', label: 'Up to date' },
]

const GROUPS = [
  { value: 'all', label: 'All' },
  { value: 'mothers', label: 'Mothers' },
  { value: 'infants', label: 'Infants' },
]

function profileUrl(r) {
  return r.kind === 'mother' ? `/clinic/mothers/${r.id}` : `/clinic/patients/${r.id}`
}

export default function Patients() {
  useDocumentTitle('Patients')
  const { facility } = useAuth()
  const navigate = useNavigate()
  const version = useDataVersion()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'all'
  const group = GROUPS.some((g) => g.value === params.get('group')) ? params.get('group') : 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const q = useDebouncedValue(query, 250)
  const [exporting, setExporting] = useState(false)

  // Keep the URL in step with the search box (so Back and shared links work).
  useEffect(() => {
    const current = params.get('q') ?? ''
    if (q === current) return
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    next.delete('page')
    setParams(next, { replace: true })
  }, [q, params, setParams])

  const state = useAsync(() => listPatients({ q, tab, group, page }), [q, tab, group, page], version)
  const data = state.data

  const setParam = (key, value, { resetPage = true } = {}) => {
    const next = new URLSearchParams(params)
    if (value && value !== 'all' && !(key === 'page' && value === 1)) next.set(key, String(value))
    else next.delete(key)
    if (resetPage && key !== 'page') next.delete('page')
    setParams(next)
  }

  const onExport = async () => {
    setExporting(true)
    try {
      const rows = await exportPatients({ q, tab, group })
      downloadCsv(`enfantil-patients-${TODAY_ISO}.csv`, [
        ['Type', 'Name', 'Patient ID', 'Age or status', 'Mother / caregiver', 'Phone', 'Last visit', 'Next', 'Next date', 'Status'],
        ...rows.map((r) => [
          r.kind === 'mother' ? 'Mother' : 'Infant',
          r.fullName,
          r.patientId,
          r.kind === 'mother' ? r.statusLabel : r.age,
          r.kind === 'mother' ? r.children.map((c) => c.name).join('; ') : r.caregiver?.name,
          r.kind === 'mother' ? r.phoneLabel : r.caregiver?.phoneLabel,
          r.lastVisitOn ?? '',
          r.nextDueText,
          r.nextOn ?? '',
          r.status,
        ]),
      ])
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={
          data
            ? `${data.groupCounts.mothers} mothers and ${data.groupCounts.infants} infants registered at ${facility?.name}`
            : `Patients registered at ${facility?.name}`
        }
        actions={
          <>
            <Button variant="neutral" icon={Download} onClick={onExport} loading={exporting} disabled={!data}>
              Export
            </Button>
            <Button icon={Plus} to="/clinic/patients/new">
              Register child
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 pb-2 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            label="Search patients"
            placeholder="Search mothers and infants by name, phone or patient ID"
            className="w-full sm:max-w-[420px]"
          />
          <p className="text-small text-slate-600">Sorted by next due date</p>
        </div>

        <Tabs
          idPrefix="patients"
          label="Mothers or infants"
          value={group}
          onChange={(v) => setParam('group', v)}
          className="px-3"
          tabs={GROUPS.map((g) => ({
            value: g.value,
            label: (
              <span className="inline-flex items-center gap-2">
                {g.label}
                <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-slate-600">{data ? data.groupCounts[g.value] : '·'}</span>
              </span>
            ),
          }))}
        />
        <div className="flex flex-wrap gap-2 px-5 py-3" role="group" aria-label="Filter by status">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tab === t.value}
              onClick={() => setParam('tab', t.value)}
              className={cx(
                'inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold',
                tab === t.value ? 'bg-teal-700 text-white' : 'bg-sand text-slate-600 hover:text-ink',
              )}
            >
              {t.label}
              <span className={cx('rounded-full px-1.5 text-[11px]', tab === t.value ? 'bg-white/20' : 'bg-white')}>{data ? data.counts[t.value] : '·'}</span>
            </button>
          ))}
        </div>

        <TabPanel idPrefix="patients" value={group}>
          <DataTable caption="Authorised patients" minWidth={940}>
            <thead>
              <tr>
                <Th>Patient</Th>
                <Th>{group === 'mothers' ? 'Children' : group === 'infants' ? 'Mother / caregiver' : 'Linked to'}</Th>
                <Th>Last visit</Th>
                <Th>Next</Th>
                <Th>Status</Th>
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {state.error && !data ? (
                <TableMessage colSpan={6}>
                  <ErrorState title="We couldn’t load your patients" error={state.error} onRetry={state.reload} />
                </TableMessage>
              ) : !data ? (
                Array.from({ length: 8 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Skeleton className="h-3.5 w-36" />
                    </Td>
                    <Td>
                      <Skeleton className="h-3.5 w-14" />
                    </Td>
                    <Td>
                      <Skeleton className="h-3.5 w-40" />
                    </Td>
                    <Td>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </Td>
                    <Td />
                  </tr>
                ))
              ) : data.rows.length === 0 ? (
                <TableMessage colSpan={6}>
                  <EmptyState
                    icon={SearchX}
                    title={q ? `No patients match “${q}”` : 'No patients in this list'}
                    description={
                      q
                        ? 'Check the spelling, try the caregiver’s phone number or the patient ID, or register the child if they are new to the clinic.'
                        : 'Children appear here when their status matches this tab.'
                    }
                    action={
                      <div className="flex flex-wrap justify-center gap-3">
                        {q && (
                          <Button variant="neutral" onClick={() => setQuery('')}>
                            Clear search
                          </Button>
                        )}
                        <Button icon={Plus} to="/clinic/patients/new">
                          Register child
                        </Button>
                      </div>
                    }
                  />
                </TableMessage>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id} onClick={() => navigate(profileUrl(r))} className="cursor-pointer transition-colors hover:bg-[#FAF9F7]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar initials={r.initials} tone={r.tone} size="sm" />
                        <div className="min-w-0">
                          <Link to={profileUrl(r)} onClick={(e) => e.stopPropagation()} className="block text-[14px] font-semibold text-ink hover:underline">
                            {r.fullName}
                          </Link>
                          <span className="whitespace-nowrap text-[12px] text-muted">
                            {r.kind === 'mother' ? <span className="font-semibold text-[#9D174D]">{r.statusLabel}</span> : r.ageShort} ·{' '}
                            <span className="font-mono text-[11.5px]">{r.patientId}</span>
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {r.kind === 'mother' ? (
                        <>
                          <span className="block text-[14px] text-ink">
                            {r.children.length ? r.children.map((c) => `${c.name} (${c.age})`).join(', ') : 'No children yet'}
                          </span>
                          <span className="text-[13px] text-slate-600">{r.phoneLabel}</span>
                        </>
                      ) : r.caregiver ? (
                        <>
                          <span className="block whitespace-nowrap text-[14px] text-ink">
                            {r.mother ? (
                              <Link to={`/clinic/mothers/${r.mother.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                {r.mother.name} (mother)
                              </Link>
                            ) : (
                              `${r.caregiver.name} (${r.caregiver.relationship.toLowerCase()})`
                            )}
                          </span>
                          <span className="text-[13px] text-slate-600">{r.caregiver.phoneLabel}</span>
                        </>
                      ) : (
                        <span className="text-slate-600">No caregiver on record</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-600">{formatDayOrDate(r.lastVisitOn)}</Td>
                    <Td className={cx('whitespace-nowrap', r.status === 'Overdue' ? 'font-semibold text-coral-700' : 'text-ink')}>
                      {r.nextDueText}
                      {r.status === 'Overdue' && <span className="sr-only">, {r.daysLate} days late</span>}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} className="min-w-[88px] justify-center" />
                    </Td>
                    <Td className="w-8 pl-0">
                      <ChevronRight className="size-5 text-slate-600" aria-hidden="true" />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </TabPanel>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-slate-600" aria-live="polite">
            {data ? `Showing ${data.rows.length} of ${data.total}` : 'Loading patients…'}
            {data && q && <span className="sr-only"> matching “{q}”</span>}
          </p>
          {data && (
            <Pagination page={data.page} pageCount={data.pageCount} onChange={(p) => setParam('page', p, { resetPage: false })} label="Patient list pages" />
          )}
        </div>
      </Card>
    </>
  )
}
