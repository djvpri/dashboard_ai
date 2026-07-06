import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionCookie } from '@/lib/auth-server'

const AUTH_COOKIE = 'zd_session'

// Routes that don't need auth
const PUBLIC_ROUTES = ['/login', '/api/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes + static files
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Check session cookie
  const cookie = request.cookies.get(AUTH_COOKIE)?.value
  if (!cookie || !verifySessionCookie(cookie)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
}
