import { ApiError, nextId, notFound, request } from './client'
import { childSummary, findClinician } from './helpers'
import { toDate, toISODateTime, TODAY } from '../utils/dates'

const unreadCount = (conversation) => conversation.messages.filter((m) => m.from === 'clinician' && !m.read).length

function summarize(db, conversation) {
  const last = conversation.messages[conversation.messages.length - 1]
  return {
    id: conversation.id,
    clinician: findClinician(db, conversation.clinicianId),
    child: childSummary(db, conversation.childId),
    lastMessage: last ?? null,
    unread: unreadCount(conversation),
  }
}

const latestFirst = (a, b) => toDate(b.lastMessage?.sentAt ?? 0) - toDate(a.lastMessage?.sentAt ?? 0)

export function getConversations() {
  return request((db) => db.conversations.map((c) => summarize(db, c)).sort(latestFirst))
}

export function getConversation(id) {
  return request((db) => {
    const conversation = db.conversations.find((c) => c.id === id)
    if (!conversation) throw notFound('This conversation')
    return { ...summarize(db, conversation), messages: conversation.messages }
  })
}

/** Finds (or starts) the conversation with a clinician about a child. Used by "Message Dr. Otieno". */
export function openConversationWith({ clinicianId, childId }) {
  return request(
    (db) => {
      let conversation =
        db.conversations.find((c) => c.clinicianId === clinicianId && c.childId === childId) ??
        db.conversations.find((c) => c.clinicianId === clinicianId)
      if (!conversation) {
        if (!db.clinicians.some((c) => c.id === clinicianId)) throw notFound('This clinician')
        conversation = { id: nextId('conv'), clinicianId, childId, messages: [] }
        db.conversations.push(conversation)
      }
      return { id: conversation.id }
    },
    { mutates: true, delay: 150 },
  )
}

export function markConversationRead(id) {
  return request(
    (db) => {
      const conversation = db.conversations.find((c) => c.id === id)
      if (!conversation) return { ok: false }
      conversation.messages.forEach((m) => {
        m.read = true
      })
      db.notifications.forEach((n) => {
        if (n.target?.conversationId === id) n.read = true
      })
      return { ok: true }
    },
    { mutates: true, delay: 120 },
  )
}

let clock = 0
export function sendMessage(id, { body, attachmentName }) {
  return request(
    (db) => {
      const text = body.trim()
      if (!text && !attachmentName) throw new ApiError('Write a message first.', { field: 'body' })
      if (text.length > 2000) throw new ApiError('Messages can be up to 2,000 characters.', { field: 'body' })
      const conversation = db.conversations.find((c) => c.id === id)
      if (!conversation) throw notFound('This conversation')
      clock += 1
      const message = {
        id: nextId('m'),
        from: 'caregiver',
        sentAt: toISODateTime(new Date(TODAY.getTime() + clock * 60_000)),
        body: text,
        attachmentName: attachmentName || null,
        read: true,
      }
      conversation.messages.push(message)
      return message
    },
    { mutates: true, delay: 380 },
  )
}
