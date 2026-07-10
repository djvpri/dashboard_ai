import { NextResponse } from 'next/server'

// Guard bersama untuk endpoint /api/tools/* yang ditandai publik di middleware
// tapi hanya boleh dipanggil server internal (dari api/chat / devops).
// Kontrol: header x-internal-secret harus == env INTERNAL_SECRET.
// FAIL-CLOSED: kalau INTERNAL_SECRET belum diset, semua ditolak.

/** Kembalikan 401 kalau request bukan panggilan internal yang sah; null kalau OK. */
export function requireInternal(req: Request): NextResponse | null {
  const secret = process.env.INTERNAL_SECRET || ''
  if (!secret || req.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** Header untuk dipakai saat memanggil endpoint tool internal dari server. */
export function internalHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_SECRET || ''
  return secret ? { 'x-internal-secret': secret } : {}
}
