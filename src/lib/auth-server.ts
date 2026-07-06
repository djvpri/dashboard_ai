const AUTH_COOKIE = 'zd_session'
const AUTH_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123'

export function verifyPassword(password: string): boolean {
  return password === AUTH_PASSWORD
}

export function generateSessionCookie(): string {
  const payload = Buffer.from(`${Date.now()}:${hash(AUTH_PASSWORD)}`).toString('base64')
  return `${AUTH_COOKIE}=${payload}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 3}`
}

export function verifySessionCookie(cookieValue: string): boolean {
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8')
    const [ts, h] = decoded.split(':')
    const expectedHash = hash(AUTH_PASSWORD)
    if (h !== expectedHash) return false
    const age = Date.now() - parseInt(ts)
    return age < 3 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h = h & h
  }
  return h.toString(36)
}
