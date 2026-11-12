import { ApiError, nextId, notFound, request, write } from './client'
import { findClinician, profileSummary } from './helpers'
import { now, toDate, toISODateTime } from '../utils/dates'
import { notifyStaff } from '../../notify.js'

const unreadCount = (conversation) => conversation.messages.filter((m) => m.from === 'clinician' && !m.read).length

function summarize(db, conversation) {
  const last = conversation.messages[conversation.messages.length - 1]
  return {
    id: conversation.id,
    clinician: findClinician(db, conversation.clinicianId),
    child: profileSummary(db, conversation.childId),
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

/** Finds (or starts) the conversation with a clinician about a child or about you. Used by "Message Dr. Otieno". */
export function openConversationWith({ clinicianId, childId }) {
  return write((state, account, view) => {
    const db = view()
    const mine = state.conversations.filter((c) => c.accountId === account.id && c.ownerId === clinicianId)
    const forThis = (c) => (childId === 'me' ? c.type === 'mother' : c.patientId === childId)
    let conversation = mine.find(forThis) ?? mine[0]
    if (!conversation) {
      if (!db.clinicians.some((c) => c.id === clinicianId)) throw notFound('This clinician')
      if (childId !== 'me' && !db.children.some((c) => c.id === childId)) throw notFound('This child')
      if (childId === 'me' && !account.motherId) throw new ApiError('Choose which child the message is about.', { field: 'childId' })
      conversation = {
        id: nextId('conv'),
        type: childId === 'me' ? 'mother' : 'caregiver',
        ownerId: clinicianId,
        accountId: account.id,
        ...(childId === 'me' ? { motherId: account.motherId } : { patientId: childId, caregiverId: account.id }),
        unread: 0,
        messages: [],
      }
      state.conversations.unshift(conversation)
    }
    return { id: conversation.id }
  })
}

export function markConversationRead(id) {
  return write((state, account) => {
    const conversation = state.conversations.find((c) => c.id === id && c.accountId === account.id)
    if (!conversation) return { ok: false }
    conversation.messages.forEach((m) => {
      if (m.from === 'me') m.read = true
    })
    state.familyNotifications.forEach((n) => {
      if (n.accountId === account.id && n.target?.conversationId === id) n.read = true
    })
    return { ok: true }
  })
}

let clock = 0
export function sendMessage(id, { body, attachmentName } = {}) {
  return write((state, account) => {
    const text = String(body ?? '').trim()
    if (!text && !attachmentName) throw new ApiError('Write a message first.', { field: 'body' })
    if (text.length > 2000) throw new ApiError('Messages can be up to 2,000 characters.', { field: 'body' })
    const conversation = state.conversations.find((c) => c.id === id && c.accountId === account.id)
    if (!conversation) throw notFound('This conversation')
    const message = {
      id: nextId('m'),
      from: 'them',
      sentAt: toISODateTime(now()),
      body: text,
      read: true,
      ...(attachmentName ? { attachmentName } : {}),
    }
    conversation.messages.push(message)
    conversation.unread = (conversation.unread ?? 0) + 1
    // The thread moves to the top of the doctor's inbox.
    state.conversations = [conversation, ...state.conversations.filter((c) => c !== conversation)]
    notifyStaff(state, {
      to: [conversation.ownerId],
      type: 'message',
      title: `${account.fullName} sent a message`,
      body: text.length > 90 ? `${text.slice(0, 87)}…` : text || `Attachment: ${attachmentName}`,
      link: `/clinic/messages/${conversation.id}`,
    })
    return { id: message.id, from: 'caregiver', sentAt: message.sentAt, body: text, attachmentName: attachmentName || null, read: true }
  })
}
