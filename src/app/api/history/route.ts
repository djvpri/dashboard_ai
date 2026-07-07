import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId wajib diisi' }, { status: 400 })
  if (!sql) return NextResponse.json({ messages: [] })

  try {
    const [row] = await sql`SELECT messages FROM chat_history WHERE agent_id = ${agentId}`
    const raw = row?.messages
    if (!raw) return NextResponse.json({ messages: [] })
    const messages = typeof raw === 'string' ? JSON.parse(raw) : raw
    return NextResponse.json({ messages })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

export async function POST(req: NextRequest) {
  const { agentId, messages } = await req.json()
  if (!agentId) return NextResponse.json({ error: 'agentId wajib diisi' }, { status: 400 })
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })

  try {
    await sql`
      INSERT INTO chat_history (agent_id, messages, updated_at)
      VALUES (${agentId}, ${JSON.stringify(messages ?? [])}::jsonb, now())
      ON CONFLICT (agent_id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }
}