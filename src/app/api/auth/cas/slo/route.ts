import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as sessionStore from '@/lib/sessionStore'

export async function POST(request: NextRequest) {
  const body = await request.text() 
  const match = body.match(/<SessionIndex>([^<]+)<\/SessionIndex>/i)
  if (!match) {
    return NextResponse.json({ error: 'no SessionIndex' }, { status: 400 })
  }
  const ticket = match[1]

  try {
    const removed = sessionStore.deleteSessionByTicket(ticket)
    return NextResponse.json({ ok: true, removed })
  } catch (err) {
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'CAS SLO endpoint' })
}
