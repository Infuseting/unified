import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession, deleteSessionById } from '@/lib/sessionStore'

export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  return NextResponse.next()

  const pathname = nextUrl.pathname
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }
  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
  console.log('[CAS middleware] incoming', { url: request.url, pathname, forwardedFor, referer: request.headers.get('referer') })

  const casCookie = request.cookies.get('cas_user')
  if (casCookie) {
    try {
      const val = casCookie.value
      const [sid, sig] = val.split('.')
      if (!sid || !sig) throw new Error('invalid-cookie')

      const key = process.env.CAS_SIGNING_KEY || 'dev-secret-change-me'
      const expected = await hmacHex(key, sid)
      const sigMatches = sig === expected
      console.log('[CAS middleware] cookie sig', { sid: sid.slice(0, 8) + '...' + sid.slice(-6), sigMatches })
      if (!sigMatches) throw new Error('bad-signature')

      const session = getSession(sid)
      if (!session) {
        console.log('[CAS middleware] session-not-found', { sid })
        throw new Error('session-not-found')
      }

      const ua = request.headers.get('user-agent') || ''
      const uaHash = await hmacHex(key, ua)
      if (session.uaHash && session.uaHash !== uaHash) {
        console.error('[CAS middleware] ua-mismatch — deleting session', { sid, storedUaHash: session.uaHash })
        deleteSessionById(sid)
        throw new Error('ua-mismatch')
      }
      console.log('[CAS middleware] session valid', { sid: sid.slice(0, 8), user: session.user?.displayName || session.user?.mail || null })
      return NextResponse.next()
    } catch (err: any) {
      console.error('[CAS middleware] validation failed:', err?.message || err, { url: request.url, pathname })
    }
  }

  const origin = request.nextUrl.origin
  const service = `${origin}/api/auth/cas/callback?redirect=${encodeURIComponent(request.nextUrl.href)}`
  const casLogin = `https://cas.unicaen.fr/login?service=${encodeURIComponent(service)}`

  return NextResponse.redirect(casLogin)
}

export const config = {
  matcher: ['/', '/((?!api|_next|static).*)'],
}


async function hmacHex(key: string, data: string) {
  const enc = new TextEncoder()
  const keyData = enc.encode(key)
  const subtle = (globalThis as any).crypto?.subtle
  if (!subtle) {
    const fake = Array.from(enc.encode(data)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return fake
  }
  const cryptoKey = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await subtle.sign('HMAC', cryptoKey, enc.encode(data))
  const arr = Array.from(new Uint8Array(sig))
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('')
}
