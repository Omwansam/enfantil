import { formatAge, formatDate, TODAY } from '../utils/dates'
import { formatLocalPhone, initials } from '../utils/format'
import { currentStaffId } from '../../context.js'
import { notifyFamily, staffName } from '../../notify.js'
import { ApiError, notFound, request } from './client'
import { context, motherStatus, nowISO, primaryCaregiver } from './helpers'

function participant(db, ctx, c) {
  if (c.type === 'mother') {
    const m = ctx.mothersById[c.motherId]
    const status = motherStatus(m)
    return {
      name: `${m.firstName} ${m.lastName}`,
      initials: initials(`${m.firstName} ${m.lastName}`),
      tone: m.tone,
      subtitle: `Patient · ${status.label}`,
      phone: formatLocalPhone(m.phone),
      patientId: null,
      motherId: m.id,
      patientName: `${m.firstName} ${m.lastName}`,
      hasApp: m.hasApp,
    }
  }
  if (c.type === 'caregiver') {
    const p = ctx.patientsById[c.patientId]
    const carer = p.caregivers.find((x) => x.id === c.caregiverId)
    const child = `${p.firstName} ${p.lastName}`
    const relation = carer.relationship === 'Mother' || carer.relationship === 'Father' ? carer.relationship : carer.relationship
    return {
      name: carer.name,
      initials: initials(carer.name),
      tone: carer.tone ?? 'pink',
      subtitle: `${relation} of ${child}, ${formatAge(p.dob, TODAY, { short: true })}`,
      phone: formatLocalPhone(carer.phone),
      patientId: p.id,
      patientName: child,
      hasApp: carer.hasApp,
    }
  }
  if (c.staffId) {
    const s = db.staff.find((x) => x.id === c.staffId)
    return { name: s.name, initials: s.initials, tone: s.tone, subtitle: `${s.title} · Staff`, phone: '', patientId: null, patientName: '' }
  }
  return { name: c.staffName, initials: c.initials, tone: c.tone, subtitle: c.staffRole, phone: '', patientId: null, patientName: '' }
}

function summary(db, ctx, c) {
  const last = c.messages[c.messages.length - 1]
  return {
    id: c.id,
    type: c.type,
    ...participant(db, ctx, c),
    preview: last ? `${last.from === 'me' ? 'You: ' : ''}${last.body}` : 'No messages yet',
    lastAt: last?.sentAt ?? null,
    unread: c.unread,
  }
}

/** GET /api/conversations */
export function getConversations() {
  return request((db) => {
    const ctx = context(db)
    return (
      db.conversations
        // Stored in inbox order (frame 14); a thread moves to the top when you reply.
        .map((c) => summary(db, ctx, c))
    )
  })
}

/** GET /api/conversations/:id */
export function getConversation(id) {
  return request((db) => {
    const c = db.conversations.find((x) => x.id === id)
    if (!c) throw notFound('This conversation')
    const ctx = context(db)
    return { ...summary(db, ctx, c), messages: c.messages }
  })
}

/** POST /api/conversations/:id/read */
export function markConversationRead(id) {
  return request(
    (db) => {
      const c = db.conversations.find((x) => x.id === id)
      if (!c) throw notFound('This conversation')
      c.unread = 0
      return { id }
    },
    { mutates: true, delay: 150 },
  )
}

/** POST /api/conversations/:id/messages */
export function sendMessage(id, body) {
  return request(
    (db) => {
      const c = db.conversations.find((x) => x.id === id)
      if (!c) throw notFound('This conversation')
      const text = String(body ?? '').trim()
      if (!text) throw new ApiError('Write a message before sending.', { status: 422, field: 'body' })
      if (text.length > 1000) throw new ApiError('Keep messages to 1,000 characters.', { status: 422, field: 'body' })
      const message = { id: `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, from: 'me', sentAt: nowISO(), body: text, read: false }
      c.messages.push(message)
      c.unread = 0
      if (c.accountId) {
        const sender = staffName(db, c.ownerId ?? currentStaffId()) ?? 'The hospital'
        notifyFamily(db, {
          accountId: c.accountId,
          type: 'message',
          childId: c.type === 'mother' ? 'me' : c.patientId,
          title: `${sender} sent a message`,
          body: text.length > 120 ? `${text.slice(0, 117)}…` : text,
          target: { conversationId: c.id },
        })
      }
      db.conversations = [c, ...db.conversations.filter((x) => x !== c)]
      return message
    },
    { mutates: true, delay: 400 },
  )
}

/** POST /api/conversations — open (or reuse) the thread with a patient's primary caregiver. */
export function openConversationWithCaregiver(patientId) {
  return request(
    (db) => {
      const p = db.patients.find((x) => x.id === patientId)
      if (!p) throw notFound('This patient')
      const carer = primaryCaregiver(p)
      if (!carer) throw new ApiError('This patient has no caregiver on record.', { status: 409 })
      let c = db.conversations.find((x) => x.type === 'caregiver' && x.caregiverId === carer.id)
      if (!c) {
        const me = currentStaffId()
        const accountId = db.accounts.some((a) => a.id === carer.id) ? carer.id : null
        c = { id: `c-${me}-${carer.id}`, type: 'caregiver', ownerId: me, accountId, patientId: p.id, caregiverId: carer.id, unread: 0, messages: [] }
        db.conversations.unshift(c)
      }
      return { id: c.id, hasApp: carer.hasApp }
    },
    { mutates: true, delay: 250 },
  )
}

/** Day of a message, used for separators. */
export function messageDay(sentAt) {
  return formatDate(sentAt, 'medium')
}

/** POST /api/conversations — open (or reuse) the thread with a mother about her own care. */
export function openConversationWithMother(motherId) {
  return request(
    (db) => {
      const m = (db.mothers ?? []).find((x) => x.id === motherId)
      if (!m) throw notFound('This mother')
      let c = db.conversations.find((x) => x.type === 'mother' && x.motherId === motherId)
      if (!c) {
        const me = currentStaffId()
        const accountId = db.accounts.find((a) => a.motherId === motherId)?.id ?? null
        c = { id: `c-${me}-${motherId}`, type: 'mother', ownerId: me, accountId, motherId, unread: 0, messages: [] }
        db.conversations.unshift(c)
      }
      return { id: c.id, hasApp: m.hasApp }
    },
    { mutates: true, delay: 250 },
  )
}
