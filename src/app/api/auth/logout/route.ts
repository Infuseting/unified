import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { deleteSessionById } from '@/lib/sessionStore'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const redirectTo = url.searchParams.get('redirect') || '/'

  try {
    const casCookie = request.cookies.get('cas_user')
    if (casCookie) {
      const [sid] = casCookie.value.split('.')
      if (sid) deleteSessionById(sid)
    }
  } catch (e) {
    // ignore
  }

  const res = NextResponse.redirect(redirectTo)
  // clear cookie
  res.cookies.set({
    name: 'cas_user',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
