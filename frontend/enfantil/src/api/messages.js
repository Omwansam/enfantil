/** Conversations with the care team. */
import { get, post, seg } from './client'

export function getConversations() {
  return get('/conversations')
}

export function getConversation(id) {
  return get(`/conversations/${seg(id)}`)
}

/** Finds (or starts) the conversation with a clinician about a child or about you. */
export function openConversationWith({ clinicianId, childId }) {
  return post('/conversations', { clinicianId, childId })
}

export function markConversationRead(id) {
  return post(`/conversations/${seg(id)}/read`)
}

export function sendMessage(id, { body, attachmentName }) {
  return post(`/conversations/${seg(id)}/messages`, { body, attachmentName })
}
