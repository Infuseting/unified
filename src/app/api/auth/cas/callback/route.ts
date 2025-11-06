import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import { createSession } from '@/lib/sessionStore'

function extractTag(xml: string, tag: string) {
  const re = new RegExp(`<cas:${tag}>([\s\S]*?)<\\/cas:${tag}>`, 'i')
  const m = xml.match(re)
  return m ? m[1] : undefined
}

function sign(value: string) {
  const key = process.env.CAS_SIGNING_KEY || 'dev-secret-change-me'
  return crypto.createHmac('sha256', key).update(value).digest('hex')
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const ticket = url.searchParams.get('ticket')
  const redirectTo = url.searchParams.get('redirect') || '/'

  const origin = request.nextUrl.origin
  const service = `${origin}/api/auth/cas/callback?redirect=${encodeURIComponent(redirectTo)}`

  if (!ticket) {
    return NextResponse.redirect(redirectTo)
  }

  const validateUrl = `https://cas.unicaen.fr/cas/p3/serviceValidate?service=${encodeURIComponent(service)}&ticket=${encodeURIComponent(ticket)}`

  let text: string
  try {
    const res = await fetch(validateUrl)
    text = await res.text()
  } catch (err) {
    console.error('CAS validation fetch error', err)
    return NextResponse.redirect(redirectTo)
  }

  if (!/authenticationSuccess/.test(text)) {
    console.error('CAS authentication failed or no authenticationSuccess in response')
    return NextResponse.redirect(redirectTo)
  }
  const givenName = extractTag(text, 'givenName')
  const sn = extractTag(text, 'sn') || extractTag(text, 'familyName')
  const displayName = extractTag(text, 'displayName') || `${givenName || ''} ${sn || ''}`.trim()
  const mail = extractTag(text, 'mail') || extractTag(text, 'email')
  const rolesRaw = extractTag(text, 'roles') || extractTag(text, 'memberOf') || extractTag(text, 'groups')
  const roles = rolesRaw ? rolesRaw.split(/[;,\s]+/).filter(Boolean) : []
  const authDate = extractTag(text, 'authenticationDate')
  const clientIpAddress = extractTag(text, 'clientIpAddress')

  const user = {
    displayName: displayName || undefined,
    givenName: givenName || undefined,
    familyName: sn || undefined,
    mail: mail || undefined,
    roles,
  }

  const ua = request.headers.get('user-agent') || ''
  const uaHash = crypto.createHmac('sha256', process.env.CAS_SIGNING_KEY || 'dev-secret-change-me').update(ua).digest('hex')

  const session = createSession({ ticket: ticket || undefined, user, authDate: authDate || Date.now(), clientIp: clientIpAddress || null, uaHash })

  const sig = sign(session.id)
  const cookieValue = `${session.id}.${sig}`

  const res = NextResponse.redirect(redirectTo)
  res.cookies.set({
    name: 'cas_user',
    value: cookieValue,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  })  
  return res
}
