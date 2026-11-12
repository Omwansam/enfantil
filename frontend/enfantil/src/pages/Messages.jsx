import { ArrowLeft, MessageCircle, Paperclip, Search, SendHorizontal, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getConversation, getConversations, markConversationRead, sendMessage } from '../api/messages'
import AsyncContent from '../components/AsyncContent'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import ChatBubble from '../components/ChatBubble'
import { UnreadDot } from '../components/CountPill'
import EmptyState from '../components/EmptyState'
import IconButton from '../components/IconButton'
import PageHeader from '../components/PageHeader'
import Skeleton, { SkeletonList } from '../components/Skeleton'
import { fieldClass } from '../components/fieldStyles'
import { useAsync } from '../hooks/useAsync'
import { useDataVersion } from '../hooks/useDataVersion'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { cx } from '../utils/cx'
import { formatDaySeparator, formatListTime, formatTime, isSameDay } from '../utils/dates'

export default function Messages() {
  useDocumentTitle('Messages')
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const version = useDataVersion()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const list = useAsync(getConversations, [], version)
  const [query, setQuery] = useState('')

  const firstId = list.data?.[0]?.id
  useEffect(() => {
    if (!conversationId && isDesktop && firstId) navigate(`/family/messages/${firstId}`, { replace: true })
  }, [conversationId, isDesktop, firstId, navigate])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!list.data || !q) return list.data ?? []
    return list.data.filter((c) =>
      [c.clinician.name, c.clinician.subtitle, c.child?.firstName, c.lastMessage?.body].some((text) => text?.toLowerCase().includes(q)),
    )
  }, [list.data, query])

  const showList = isDesktop || !conversationId
  const showThread = Boolean(conversationId)

  return (
    <>
      <PageHeader title="Messages" subtitle="Your children's care team · replies during clinic hours" />
      <Card className="grid min-h-[560px] overflow-hidden lg:h-[calc(100dvh-196px)] lg:grid-cols-[290px_minmax(0,1fr)]">
        {showList && (
          <section aria-label="Conversations" className="flex min-h-0 flex-col border-line lg:border-r">
            <div className="border-b border-line p-3">
              <label htmlFor="message-search" className="sr-only">
                Search messages
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id="message-search"
                  type="search"
                  placeholder="Search messages"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={fieldClass(false, 'min-h-11 pl-10')}
                />
              </div>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              <AsyncContent
                state={list}
                errorTitle="We couldn’t load conversations"
                skeleton={<SkeletonList rows={4} label="Loading conversations" />}
                isEmpty={() => filtered.length === 0}
                empty={
                  query ? (
                    <EmptyState icon={Search} title="No conversations match" description={`Nothing found for “${query}”.`} action={<Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>} />
                  ) : (
                    <EmptyState icon={MessageCircle} title="No messages yet" description="Your children’s care team will appear here once you message a clinic." />
                  )
                }
              >
                {() => (
                  <ul className="divide-y divide-line">
                    {filtered.map((c) => {
                      const active = c.id === conversationId
                      const unread = c.unread > 0
                      return (
                        <li key={c.id}>
                          <Link
                            to={`/family/messages/${c.id}`}
                            aria-current={active ? 'page' : undefined}
                            className={cx('flex gap-3 px-4 py-3.5 transition-colors', active ? 'bg-teal-50' : 'hover:bg-[#FAFAF8]')}
                          >
                            <Avatar initials={c.clinician.initials} tone={c.clinician.tone} size="md" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[14px] font-semibold text-ink">{c.clinician.name}</span>
                                <span className={cx('shrink-0 text-[12px]', unread ? 'font-semibold text-teal-700' : 'text-muted')}>
                                  {c.lastMessage && formatListTime(c.lastMessage.sentAt)}
                                </span>
                              </span>
                              <span className="block text-[12px] text-muted">{c.clinician.subtitle}</span>
                              <span className="mt-0.5 flex items-center gap-2">
                                <span className={cx('min-w-0 flex-1 truncate text-[13px]', unread ? 'font-semibold text-ink' : 'text-slate-600')}>
                                  {c.lastMessage ? `${c.lastMessage.from === 'caregiver' ? 'You: ' : ''}${c.lastMessage.body || c.lastMessage.attachmentName}` : 'No messages yet'}
                                </span>
                                {unread && <UnreadDot label={`${c.unread} unread`} />}
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
          </section>
        )}

        {showThread ? (
          <Thread key={conversationId} id={conversationId} showBack={!isDesktop} />
        ) : (
          isDesktop && (
            <div className="flex items-center justify-center">
              <EmptyState icon={MessageCircle} title="Choose a conversation" description="Pick someone from your children’s care team to read and reply." />
            </div>
          )
        )}
      </Card>
    </>
  )
}

function Thread({ id, showBack }) {
  const navigate = useNavigate()
  const version = useDataVersion()
  const state = useAsync(() => getConversation(id), [id], version)
  const bottomRef = useRef(null)
  const unread = state.data?.unread ?? 0
  const count = state.data?.messages.length ?? 0

  useEffect(() => {
    if (unread > 0) markConversationRead(id).catch(() => {})
  }, [id, unread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [count])

  return (
    <section aria-label="Conversation" className="flex min-h-0 flex-col">
      <AsyncContent
        state={state}
        errorTitle="We couldn’t load this conversation"
        skeleton={
          <div className="space-y-4 p-6" role="status" aria-label="Loading conversation">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-20 w-3/5" />
            <Skeleton className="ml-auto h-14 w-2/5" />
            <Skeleton className="h-20 w-3/5" />
          </div>
        }
      >
        {(conv) => (
          <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
              {showBack && (
                <IconButton icon={ArrowLeft} label="Back to conversations" onClick={() => navigate('/family/messages')} className="-ml-2" />
              )}
              <Avatar initials={conv.clinician.initials} tone={conv.clinician.tone} size="md" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[16px] font-semibold text-ink">{conv.clinician.name}</h2>
                <p className="truncate text-small text-slate-600">{conv.clinician.subtitle}</p>
              </div>
              {conv.child && (
                <span className="hidden shrink-0 rounded-full bg-teal-50 px-3 py-1 text-[13px] font-semibold text-teal-800 sm:inline-flex">
                  {conv.child.isMe ? 'About your own care' : `About ${conv.child.firstName}`}
                </span>
              )}
            </header>

            <div role="log" aria-label={`Messages with ${conv.clinician.name}`} className="scrollbar-thin min-h-[320px] flex-1 space-y-3 overflow-y-auto bg-[#FAFAF8] px-4 py-5 sm:px-6">
              {conv.messages.length === 0 && (
                <EmptyState icon={MessageCircle} title="Start the conversation" description={`Write to ${conv.clinician.name} below. Replies come during clinic hours.`} />
              )}
              {conv.messages.map((m, i) => {
                const prev = conv.messages[i - 1]
                const newDay = !prev || !isSameDay(prev.sentAt, m.sentAt)
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <p className="py-1 text-center text-[13px] font-semibold text-slate-600">
                        <span className="sr-only">Messages from </span>
                        {formatDaySeparator(m.sentAt)}
                      </p>
                    )}
                    <ChatBubble
                      mine={m.from === 'caregiver'}
                      senderLabel={m.from === 'caregiver' ? 'You' : conv.clinician.name}
                      body={m.body}
                      attachmentName={m.attachmentName}
                      time={formatTime(m.sentAt, { twelveHour: true })}
                    />
                  </Fragment>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <Composer conversationId={id} clinicianName={conv.clinician.name} />
          </>
        )}
      </AsyncContent>
    </section>
  )
}

function Composer({ conversationId, clinicianName }) {
  const [body, setBody] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const canSend = (body.trim() || attachment) && !sending

  const submit = async (event) => {
    event?.preventDefault()
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      await sendMessage(conversationId, { body, attachmentName: attachment?.name })
      setBody('')
      setAttachment(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-white px-4 py-3 sm:px-5">
      {attachment && (
        <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-[#F4F3F0] py-1 pl-3 pr-1 text-[13px] font-medium text-ink">
          <Paperclip className="size-4" aria-hidden="true" />
          {attachment.name}
          <IconButton icon={X} label={`Remove ${attachment.name}`} onClick={() => setAttachment(null)} className="size-8" />
        </p>
      )}
      <div className="flex items-end gap-2 sm:gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            setAttachment(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
        <IconButton icon={Paperclip} label="Attach a photo or PDF" variant="outline" onClick={() => fileRef.current?.click()} />
        <div className="min-w-0 flex-1">
          <label htmlFor="message-body" className="sr-only">
            Message to {clinicianName}
          </label>
          <textarea
            id="message-body"
            rows={2}
            maxLength={2000}
            placeholder="Write a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            aria-describedby="composer-hint"
            className={fieldClass(Boolean(error), 'max-h-40 min-h-12 resize-none py-2.5 leading-6')}
          />
        </div>
        <Button type="submit" icon={SendHorizontal} disabled={!canSend} loading={sending} className="min-h-12">
          Send
        </Button>
      </div>
      <p id="composer-hint" className="mt-1.5 hidden text-[12px] text-muted sm:block">
        Enter to send · Shift + Enter for a new line. For emergencies, go to the nearest hospital.
      </p>
      {error && (
        <p role="alert" className="mt-1.5 text-small text-coral-700">
          {error} Your message has been kept so you can try again.
        </p>
      )}
    </form>
  )
}
