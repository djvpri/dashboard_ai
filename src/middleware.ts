import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, AUTH_COOKIE } from '@/lib/auth-server'

// Routes that don't need auth
// /api/tools/* diakses secara internal dari server (tool injection di
// api/chat/route.ts) tanpa cookie session — harus publik tapi aman karena
// token Railway/GitHub ada di env var server, tidak diekspos ke client
const PUBLIC_ROUTES = ['/login', '/api/login', '/api/tools']

export async function middleware(request: NextRequest) {
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
  if (!cookie || !(await verifySessionToken(cookie))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
}
