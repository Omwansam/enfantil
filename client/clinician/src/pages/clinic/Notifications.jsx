import { BellRing, CalendarClock, CheckCheck, FileWarning, HeartPulse, MessageCircle, NotebookPen, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStaffNotifications, markAllStaffNotificationsRead, markStaffNotificationRead } from '../../api/notifications'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import PageHeader from '../../components/PageHeader'
import { SkeletonList } from '../../components/Skeleton'
import Tabs, { TabPanel } from '../../components/Tabs'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cx } from '../../utils/cx'
import { formatListTime } from '../../utils/dates'

const TYPES = {
  request: { icon: CalendarClock, label: 'Request', tile: 'bg-amber-50 text-amber-700' },
  message: { icon: MessageCircle, label: 'Message', tile: 'bg-[#EEF2FF] text-[#3730A3]' },
  overdue: { icon: TriangleAlert, label: 'Overdue', tile: 'bg-coral-50 text-coral-700' },
  abnormal: { icon: HeartPulse, label: 'Abnormal reading', tile: 'bg-coral-50 text-coral-700' },
  note: { icon: FileWarning, label: 'Unfinished note', tile: 'bg-amber-50 text-amber-700' },
  record: { icon: NotebookPen, label: 'Record update', tile: 'bg-teal-50 text-teal-700' },
}

const FILTERS = [
  { value: 'all', label: 'All', test: () => true },
  { value: 'unread', label: 'Unread', test: (n) => !n.read },
  { value: 'request', label: 'Requests', test: (n) => n.type === 'request' },
  { value: 'message', label: 'Messages', test: (n) => n.type === 'message' },
  { value: 'overdue', label: 'Overdue', test: (n) => n.type === 'overdue' },
  { value: 'abnormal', label: 'Abnormal readings', test: (n) => n.type === 'abnormal' },
  { value: 'note', label: 'Notes', test: (n) => n.type === 'note' },
]

/** D8 — the clinician's notifications. */
export default function Notifications() {
  useDocumentTitle('Notifications')
  const { user } = useAuth()
  const version = useDataVersion()
  const navigate = useNavigate()
  const state = useAsync(() => getStaffNotifications(user.id), [user.id], version)
  const [tab, setTab] = useState('all')
  const [marking, setMarking] = useState(false)
  const all = state.data ?? []
  const unread = all.filter((n) => !n.read).length
  const items = all.filter(FILTERS.find((f) => f.value === tab).test)

  const open = async (n) => {
    if (!n.read) markStaffNotificationRead(n.id).catch(() => {})
    navigate(n.link)
  }

  const markAll = async () => {
    setMarking(true)
    try {
      await markAllStaffNotificationsRead(user.id)
    } finally {
      setMarking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={state.data ? (unread ? `${unread} unread` : 'All caught up') : 'Requests, messages and alerts about your patients'}
        actions={
          <Button variant="neutral" icon={CheckCheck} onClick={markAll} loading={marking} disabled={!unread}>
            Mark all as read
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Tabs
          idPrefix="sn"
          label="Filter notifications"
          value={tab}
          onChange={setTab}
          className="px-3"
          tabs={FILTERS.map((f) => ({
            value: f.value,
            label: (
              <span className="inline-flex items-center gap-2">
                {f.label}
                {state.data && <span className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-slate-600">{all.filter(f.test).length}</span>}
              </span>
            ),
          }))}
        />
        <TabPanel idPrefix="sn" value={tab}>
          {state.error && !state.data ? (
            <ErrorState title="We couldn’t load notifications" error={state.error} onRetry={state.reload} />
          ) : !state.data ? (
            <SkeletonList rows={5} label="Loading notifications" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="Nothing here"
              description={tab === 'unread' ? 'You have read everything.' : 'Notifications of this kind will appear here.'}
            />
          ) : (
            <ul className="divide-y divide-line">
              {items.map((n) => {
                const t = TYPES[n.type] ?? TYPES.record
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={cx('flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FAF9F7]', !n.read && 'bg-teal-50/40')}
                    >
                      <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', t.tile)}>
                        <t.icon className="size-5" aria-hidden="true" />
                        <span className="sr-only">{t.label}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className={cx('text-[15px] text-ink', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
                          <span className="shrink-0 text-[12px] text-muted">{formatListTime(n.at)}</span>
                        </span>
                        <span className="mt-0.5 block text-[14px] text-slate-600">{n.body}</span>
                      </span>
                      {!n.read && (
                        <>
                          <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full bg-coral-500" />
                          <span className="sr-only">Unread</span>
                        </>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </TabPanel>
      </Card>
    </>
  )
}
