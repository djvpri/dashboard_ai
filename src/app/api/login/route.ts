import { verifyPassword, generateSessionToken, sessionCookieHeader, getAuthPassword } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    try {
      getAuthPassword()
    } catch {
      return NextResponse.json({ error: 'Login belum dikonfigurasi (DASHBOARD_PASSWORD)' }, { status: 503 })
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    const token = await generateSessionToken()
    const res = NextResponse.json({ ok: true })
    res.headers.set('Set-Cookie', sessionCookieHeader(token))
    return res
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
