import { BellRing } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments } from '../api/appointments'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications'
import { getSettings } from '../api/settings'
import AsyncContent from '../components/AsyncContent'
import { StatusBadge } from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { UnreadDot } from '../components/CountPill'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import Skeleton, { SkeletonCard, SkeletonList } from '../components/Skeleton'
import Tabs, { TabPanel } from '../components/Tabs'
import { useChildren } from '../context/ChildContext'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { cx } from '../utils/cx'
import { formatDate, formatFeedTime, formatTime, relativeDay } from '../utils/dates'
import { formatLocalPhone, joinNames } from '../utils/format'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'me', label: 'My care' },
  { value: 'vaccines', label: 'Vaccines' },
  { value: 'visits', label: 'Visits' },
  { value: 'messages', label: 'Messages' },
]

const FILTERS = {
  all: () => true,
  unread: (n) => !n.read,
  me: (n) => n.childId === 'me',
  vaccines: (n) => ['vaccine', 'overdue', 'maternal-vaccine'].includes(n.type),
  visits: (n) => ['appointment', 'antenatal', 'postnatal'].includes(n.type) || n.type.startsWith('request-'),
  messages: (n) => n.type === 'message',
}

const TYPE_TILES = {
  message: { text: 'MSG', label: 'Message', className: 'bg-[#EEF2FF] text-[#3730A3]' },
  vaccine: { text: 'VAX', label: 'Vaccine', className: 'bg-teal-50 text-teal-700' },
  overdue: { text: '!', label: 'Overdue', className: 'bg-coral-50 text-coral-700' },
  appointment: { text: 'CAL', label: 'Visit', className: 'bg-upcoming-bg text-upcoming' },
  growth: { text: 'KG', label: 'Growth', className: 'bg-completed-bg text-completed' },
  antenatal: { text: 'ANC', label: 'Antenatal reminder', className: 'bg-[#FCE7F3] text-[#9D174D]' },
  postnatal: { text: 'PNC', label: 'Postnatal reminder', className: 'bg-[#FCE7F3] text-[#9D174D]' },
  'maternal-vaccine': { text: 'Td', label: 'Maternal vaccine', className: 'bg-teal-50 text-teal-700' },
  'request-confirmed': { text: 'OK', label: 'Request confirmed', className: 'bg-completed-bg text-completed' },
  'request-proposed': { text: 'NEW', label: 'New time proposed', className: 'bg-planned-bg text-planned' },
  'request-declined': { text: 'NO', label: 'Request declined', className: 'bg-cancelled-bg text-cancelled' },
  record: { text: 'REC', label: 'Record updated', className: 'bg-[#EEF2FF] text-[#3730A3]' },
}

function targetUrl(n) {
  const t = n.target ?? {}
  if (t.conversationId) return `/family/messages/${t.conversationId}`
  if (t.doseId) return `/family/vaccines/${t.doseId}`
  if (t.appointmentId) return `/family/visits?visit=${t.appointmentId}`
  if (t.page === 'health') return '/family/health'
  if (t.page) return `/family/${t.page}`
  return '/family'
}

export default function Notifications() {
  useDocumentTitle('Notifications')
  const version = useDataVersion()
  const { childList, selectChild } = useChildren()
  const [tab, setTab] = useState('all')
  const [marking, setMarking] = useState(false)
  const state = useAsync(getNotifications, [], version)
  const settings = useAsync(getSettings, [], version)
  const upcoming = useAsync(() => getAppointments({ when: 'upcoming' }), [], version)

  const unreadCount = state.data?.filter((n) => !n.read).length ?? 0
  const items = (state.data ?? []).filter(FILTERS[tab])

  const markAll = async () => {
    setMarking(true)
    try {
      await markAllNotificationsRead()
    } finally {
      setMarking(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`Reminders and updates for ${joinNames(['you', ...childList.map((c) => c.firstName)])}`}
        actions={
          <Button variant="secondary" onClick={markAll} loading={marking} disabled={!unreadCount}>
            Mark all as read
          </Button>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <Tabs tabs={TABS} value={tab} onChange={setTab} label="Filter notifications" idPrefix="notif" className="pt-1" />
          <TabPanel idPrefix="notif" value={tab}>
            <AsyncContent
              state={state}
              errorTitle="We couldn’t load notifications"
              skeleton={<SkeletonList rows={5} label="Loading notifications" />}
              isEmpty={() => items.length === 0}
              empty={
                <EmptyState
                  icon={BellRing}
                  title="You're all caught up"
                  description={tab === 'all' ? 'Reminders and updates from your care team will appear here.' : 'Nothing here right now. Check the other tabs for older updates.'}
                />
              }
            >
              {() => (
                <ul className="divide-y divide-line">
                  {items.map((n) => {
                    const tile = TYPE_TILES[n.type] ?? TYPE_TILES.vaccine
                    return (
                      <li key={n.id}>
                        <Link
                          to={targetUrl(n)}
                          onClick={() => {
                            if (n.childId) selectChild(n.childId)
                            if (!n.read) markNotificationRead(n.id).catch(() => {})
                          }}
                          className={cx('flex gap-4 px-5 py-4 transition-colors hover:bg-teal-50/50', n.read ? 'bg-[#FAFAF8]' : 'bg-white')}
                        >
                          <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold', tile.className)} aria-hidden="true">
                            {tile.text}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="sr-only">{tile.label}{n.read ? '' : ', unread'}: </span>
                            <span className={cx('block text-[15px] text-ink', n.read ? 'font-medium' : 'font-semibold')}>{n.title}</span>
                            <span className="mt-0.5 block text-[14px] text-slate-600">{n.body}</span>
                            <span className="mt-1 block text-small text-muted">
                              {n.child?.isMe ? 'You' : n.child?.firstName} · {formatFeedTime(n.createdAt)}
                            </span>
                          </span>
                          {!n.read && <UnreadDot className="mt-2" label="" />}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </AsyncContent>
          </TabPanel>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-h2">How you&apos;re reminded</h2>
            <AsyncContent state={settings} skeleton={<Skeleton className="mt-4 h-32" />}>
              {(s) => (
                <dl className="mt-3 space-y-3 text-[14px]">
                  {[
                    [`SMS to ${formatLocalPhone(s.phone)}`, s.reminders.sms],
                    ['App & web', s.reminders.push],
                    ['Weekly email', s.reminders.weeklyEmail],
                  ].map(([label, on]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="text-slate-600">{label}</dt>
                      <dd>
                        <StatusBadge status={on ? 'On' : 'Off'} />
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-600">Timing</dt>
                    <dd className="font-semibold text-ink">{s.reminders.timing}</dd>
                  </div>
                </dl>
              )}
            </AsyncContent>
            <Button to="/family/settings#reminders" variant="secondary" fullWidth className="mt-5">
              Change reminder settings
            </Button>
          </Card>

          <AsyncContent state={upcoming} skeleton={<SkeletonCard lines={2} />}>
            {(list) => {
              const next = list.find((a) => a.displayStatus === 'Upcoming')
              if (!next) return null
              const rel = relativeDay(next.start)
              return (
                <section className="rounded-2xl bg-teal-700 p-6 text-white shadow-card" aria-labelledby="next-visit-heading">
                  <h2 id="next-visit-heading" className="text-[20px] font-semibold">
                    {rel === 'Today' || rel === 'Tomorrow' ? rel : `Next visit · ${formatDate(next.start, 'weekday')}`}
                  </h2>
                  <p className="mt-1 text-[15px] leading-6 text-teal-50">
                    {next.child.isMe ? 'You' : next.child.firstName} · {next.title.replace(' + ', ' and ')} at {formatTime(next.start)}, {next.facility.name}.
                  </p>
                  <Button to={`/family/visits?visit=${next.id}`} variant="white" className="mt-4">
                    View visit
                  </Button>
                </section>
              )
            }}
          </AsyncContent>
        </div>
      </div>
    </>
  )
}
