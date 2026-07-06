import { SignJWT, jwtVerify } from 'jose'

export const AUTH_COOKIE = 'zd_session'
const MAX_AGE_DETIK = 60 * 60 * 24 * 3 // 3 hari, sama seperti sebelumnya

// Tidak ada fallback hardcode — kalau env belum di-set, lempar error yang
// jelas saat dipakai (fail-closed), bukan diam-diam terlindungi password
// tebakan umum seperti 'admin123'.
function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} belum di-set di environment.`)
  return v
}

export function getAuthPassword(): string {
  return required('DASHBOARD_PASSWORD')
}

// Secret KHUSUS untuk menandatangani session token — terpisah dari
// password login, supaya kebocoran satu tidak otomatis membuka yang lain.
function sessionSecretBytes(): Uint8Array {
  return new TextEncoder().encode(required('SESSION_SECRET'))
}

export function verifyPassword(password: string): boolean {
  try {
    return password === getAuthPassword()
  } catch {
    return false // password belum dikonfigurasi -> tolak semua login
  }
}

// Token acak sungguhan per-login (JWT bertanda tangan), BUKAN hash
// deterministik dari password seperti sebelumnya — dua login dengan
// password yang sama akan menghasilkan token BERBEDA tiap kali (karena
// timestamp masuk ke signature yang diverifikasi kriptografis, bukan
// cuma disertakan mentah di payload yang bisa dipalsukan).
export async function generateSessionToken(): Promise<string> {
  return await new SignJWT({ auth: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DETIK}s`)
    .sign(sessionSecretBytes())
}

export function sessionCookieHeader(token: string): string {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_DETIK}`
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, sessionSecretBytes())
    return true
  } catch {
    return false
  }
}
