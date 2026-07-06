import { verifyPassword, generateSessionCookie } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    const cookie = generateSessionCookie()
    const [name, ...rest] = cookie.split('=')
    res.headers.set('Set-Cookie', cookie)
    return res
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
