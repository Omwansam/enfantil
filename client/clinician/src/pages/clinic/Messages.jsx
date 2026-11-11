import { ArrowLeft, MessagesSquare, Send } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getConversation, getConversations, markConversationRead, sendMessage } from '../../api/messages'
import AsyncContent from '../../components/AsyncContent'
import Avatar from '../../components/Avatar'
import Button from '../../components/Button'
import Card from '../../components/Card'
import ChatBubble from '../../components/ChatBubble'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SearchInput from '../../components/SearchInput'
import { SkeletonList } from '../../components/Skeleton'
import { useAsync } from '../../hooks/useAsync'
import { useDataVersion } from '../../hooks/useDataVersion'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { cx } from '../../utils/cx'
import { formatDaySeparator, formatListTime, formatTime } from '../../utils/dates'
import { searchable } from '../../utils/format'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'caregiver', label: 'Caregivers' },
  { value: 'staff', label: 'Staff' },
]

const QUICK_REPLIES = ['See you at your appointment.', 'Please come in today so we can check.', 'Thank you for letting us know.']

export default function Messages() {
  useDocumentTitle('Messages')
  const { conversationId } = useParams()
  const version = useDataVersion()
  const desktop = useMediaQuery('(min-width: 1024px)')
  const list = useAsync(() => getConversations(), [], version)

  // On wide screens the first conversation opens straight away (frame 14).
  if (desktop && !conversationId && list.data?.length) {
    return <Navigate to={`/clinic/messages/${list.data[0].id}`} replace />
  }

  const showList = desktop || !conversationId
  const showThread = desktop || Boolean(conversationId)

  return (
    <>
      <PageHeader title="Conversations" subtitle="Caregivers of your authorised patients and clinic staff" className={cx(!showList && 'hidden')} />
      <Card className={cx('flex overflow-hidden', desktop && 'h-[calc(100dvh-170px)] min-h-[560px]')}>
        {showList && (
          <div className={cx('flex min-w-0 flex-col', desktop ? 'w-[310px] shrink-0 border-r border-line' : 'w-full')}>
            <ConversationList state={list} activeId={conversationId} />
          </div>
        )}
        {showThread && (
          <div className="flex min-w-0 flex-1 flex-col">
            {conversationId ? (
              <Thread key={conversationId} id={conversationId} version={version} desktop={desktop} />
            ) : (
              <EmptyState icon={MessagesSquare} title="No conversation selected" description="Choose a conversation to read and reply." className="my-auto" />
            )}
          </div>
        )}
      </Card>
    </>
  )
}

function ConversationList({ state, activeId }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const items = useMemo(() => {
    const term = searchable(q)
    return (state.data ?? []).filter((c) => {
      if (filter === 'unread' && !c.unread) return false
      if ((filter === 'caregiver' || filter === 'staff') && c.type !== filter) return false
      if (term && !searchable(`${c.name} ${c.patientName} ${c.subtitle}`).includes(term)) return false
      return true
    })
  }, [state.data, q, filter])

  return (
    <>
      <div className="border-b border-line p-4">
        <SearchInput value={q} onChange={setQ} label="Search conversations" placeholder="Search name or patient" />
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Show conversations">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                'min-h-9 rounded-full px-3 text-[13px] font-semibold transition-colors',
                filter === f.value ? 'bg-teal-700 text-white' : 'bg-sand text-slate-600 hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <AsyncContent
          state={state}
          errorTitle="We couldn’t load your conversations"
          skeleton={<SkeletonList rows={6} label="Loading conversations" />}
          isEmpty={() => items.length === 0}
          empty={
            <EmptyState
              icon={MessagesSquare}
              title={q || filter !== 'all' ? 'No conversations match' : 'No conversations yet'}
              description={q || filter !== 'all' ? 'Try another name or filter.' : 'Messages from caregivers and staff appear here.'}
            />
          }
        >
          {() => (
            <ul aria-label="Conversations">
              {items.map((c) => {
                const active = c.id === activeId
                const unread = c.unread > 0 && !active
                return (
                  <li key={c.id} className="border-b border-line">
                    <Link
                      to={`/clinic/messages/${c.id}`}
                      aria-current={active ? 'page' : undefined}
                      className={cx('flex gap-3 px-4 py-3.5 transition-colors', active ? 'bg-teal-50' : 'hover:bg-[#FAF9F7]')}
                    >
                      <Avatar initials={c.initials} tone={c.tone} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[14px] font-semibold text-ink">{c.name}</span>
                          <span className={cx('shrink-0 text-[12px]', unread ? 'font-semibold text-teal-700' : 'text-slate-600')}>
                            {c.lastAt ? formatListTime(c.lastAt) : ''}
                          </span>
                        </span>
                        <span className="block truncate text-[12px] text-muted">{c.subtitle}</span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className={cx('truncate text-[13px]', unread ? 'font-semibold text-ink' : 'text-slate-600')}>{c.preview}</span>
                          {unread && (
                            <>
                              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-coral-500" />
                              <span className="sr-only">, unread</span>
                            </>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </AsyncContent>
      </div>
    </>
  )
}

function Thread({ id, version, desktop }) {
  const state = useAsync(() => getConversation(id), [id], version)
  const markedRef = useRef(false)
  const unread = state.data?.unread ?? 0

  useEffect(() => {
    if (unread > 0 && !markedRef.current) {
      markedRef.current = true
      markConversationRead(id).catch(() => {
        markedRef.current = false
      })
    }
  }, [id, unread])

  return (
    <AsyncContent state={state} errorTitle="We couldn’t open this conversation" skeleton={<SkeletonList rows={5} label="Loading messages" />}>
      {(c) => <ThreadView c={c} desktop={desktop} />}
    </AsyncContent>
  )
}

function ThreadView({ c, desktop }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const scroller = useRef(null)
  const input = useRef(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [c.messages.length])

  const send = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await sendMessage(c.id, text)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      input.current?.focus()
    }
  }

  const addQuickReply = (reply) => {
    setText((t) => (t.trim() ? `${t.trim()} ${reply}` : reply))
    input.current?.focus()
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        {!desktop && (
          <Link
            to="/clinic/messages"
            aria-label="Back to conversations"
            className="-ml-1 inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-[#F1F0EC]"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        )}
        <Avatar initials={c.initials} tone={c.tone} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-semibold text-ink">{c.name}</h2>
          <p className="truncate text-[13px] text-slate-600">
            {c.subtitle}
            {c.phone && ` · ${c.phone}`}
          </p>
        </div>
        {c.patientId && (
          <Button variant="secondary" size="sm" to={`/clinic/patients/${c.patientId}`}>
            View patient
          </Button>
        )}
      </div>

      <div
        ref={scroller}
        className="scrollbar-thin min-h-[320px] flex-1 space-y-3 overflow-y-auto bg-[#FAFAF8] px-4 py-5 sm:px-5"
        aria-live="polite"
        aria-label={`Messages with ${c.name}`}
        role="log"
      >
        {c.messages.length === 0 && <p className="py-10 text-center text-[14px] text-slate-600">No messages yet. Write the first one below.</p>}
        {c.messages.map((m, i) => {
          const separator = i === 0 || c.messages[i - 1].sentAt.slice(0, 10) !== m.sentAt.slice(0, 10)
          return (
            <Fragment key={m.id}>
              {separator && <p className="pb-1 pt-2 text-center text-[13px] font-semibold text-slate-600">{formatDaySeparator(m.sentAt)}</p>}
              <ChatBubble
                mine={m.from === 'me'}
                body={m.body}
                time={formatTime(m.sentAt, { twelveHour: true })}
                senderLabel={m.from === 'me' ? 'You' : c.name}
              />
            </Fragment>
          )
        })}
      </div>

      <form onSubmit={send} className="border-t border-line px-4 py-3 sm:px-5">
        {c.type === 'caregiver' && (
          <div className="mb-3 flex flex-wrap gap-2" aria-label="Quick replies" role="group">
            {QUICK_REPLIES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => addQuickReply(r)}
                className="min-h-9 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink hover:border-teal-700 hover:bg-teal-50"
              >
                {r}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3">
          <label htmlFor="reply" className="sr-only">
            Reply to {c.name}
          </label>
          <textarea
            id="reply"
            ref={input}
            rows={2}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e)
            }}
            placeholder="Write a reply..."
            className="block min-h-[60px] w-full flex-1 resize-none rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] leading-[22px] text-ink placeholder:text-[#6B7480] hover:border-[#D3CFC7]"
          />
          <Button type="submit" icon={Send} loading={sending} disabled={!text.trim()} className="min-h-12 px-5">
            Send
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-small text-coral-700">
            {error} Your message is still in the box.
          </p>
        )}
        {c.type === 'caregiver' && !c.hasApp && (
          <p className="mt-2 text-[12px] text-muted">{c.name} doesn’t use the family app yet, so replies are sent by SMS.</p>
        )}
      </form>
    </>
  )
}
