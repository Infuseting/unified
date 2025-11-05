type UserAttrs = {
  displayName?: string
  givenName?: string
  familyName?: string
  mail?: string
  roles?: string[]
}

export type Session = {
  id: string
  ticket?: string
  user: UserAttrs
  authDate?: string | number
  clientIp?: string | null
  uaHash?: string | null
  createdAt: number
}

const sessions = new Map<string, Session>()
const ticketIndex = new Map<string, string>()

export function createSession(data: Omit<Session, 'id' | 'createdAt'>) {
  const id = (globalThis as any).crypto?.randomUUID?.() || generateFallbackUUID()
  const session: Session = { ...data, id, createdAt: Date.now() }
  sessions.set(id, session)
  if (data.ticket) ticketIndex.set(data.ticket, id)
  return session
}

function generateFallbackUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getSession(id: string) {
  return sessions.get(id) || null
}

export function deleteSessionById(id: string) {
  const s = sessions.get(id)
  if (!s) return false
  sessions.delete(id)
  if (s.ticket) ticketIndex.delete(s.ticket)
  return true
}

export function deleteSessionByTicket(ticket: string) {
  const id = ticketIndex.get(ticket)
  if (!id) return false
  sessions.delete(id)
  ticketIndex.delete(ticket)
  return true
}

export function findSessionIdByTicket(ticket: string) {
  return ticketIndex.get(ticket) || null
}

export function clearAllSessions() {
  sessions.clear()
  ticketIndex.clear()
}
