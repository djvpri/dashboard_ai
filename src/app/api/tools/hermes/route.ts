import { NextRequest, NextResponse } from 'next/server'
import { requireInternal } from '@/lib/internal-auth'

export const runtime = 'nodejs'

// Cek status hermes-agent lewat API server-nya (OpenAI-compatible).
// Tidak menjalankan shell — hanya HTTP GET ke endpoint status/health.
const HERMES_API_URL = (process.env.HERMES_API_URL || '').trim().replace(/\/+$/, '')
const HERMES_API_KEY = (process.env.HERMES_API_KEY || '').trim()

export async function GET(req: NextRequest) {
  const denied = requireInternal(req)
  if (denied) return denied

  if (!HERMES_API_URL || !HERMES_API_KEY) {
    return NextResponse.json({
      ok: true, online: false,
      error: 'HERMES_API_URL / HERMES_API_KEY belum diset di dashboard_ai',
    })
  }

  const headers = { Authorization: `Bearer ${HERMES_API_KEY}` }
  // Kandidat endpoint status (health umum + OpenAI-compatible /v1/models)
  const candidates = ['/health', '/healthz', '/status', '/v1/models']

  for (const path of candidates) {
    try {
      const res = await fetch(`${HERMES_API_URL}${path}`, {
        headers,
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const text = await res.text()
        let data: unknown = text.slice(0, 1500)
        try { data = JSON.parse(text) } catch { /* biarkan string */ }
        return NextResponse.json({ ok: true, online: true, endpoint: path, httpStatus: res.status, data })
      }
    } catch {
      // coba kandidat berikutnya
    }
  }

  return NextResponse.json({
    ok: true, online: false,
    url: HERMES_API_URL,
    error: 'hermes-agent tidak merespons di endpoint status manapun (mungkin down, atau API_SERVER belum aktif)',
  })
}
