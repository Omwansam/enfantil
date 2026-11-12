/** Professional conversations with families and colleagues (frame 14). */
import { get, post, seg } from './client'
import { formatDate } from '../utils/dates'

/** Day of a message, used for separators. */
export function messageDay(sentAt) {
  return formatDate(sentAt, 'medium')
}

export function getConversations() {
  return get('/conversations')
}

export function getConversation(id) {
  return get(`/conversations/${seg(id)}`)
}

export function markConversationRead(id) {
  return post(`/conversations/${seg(id)}/read`)
}

export function sendMessage(id, body) {
  return post(`/conversations/${seg(id)}/messages`, { body })
}

/** Open (or reuse) the thread with a patient's primary caregiver. */
export function openConversationWithCaregiver(patientId) {
  return post('/conversations', { patientId })
}

/** Open (or reuse) the thread with a mother about her own care. */
export function openConversationWithMother(motherId) {
  return post('/conversations', { motherId })
}
