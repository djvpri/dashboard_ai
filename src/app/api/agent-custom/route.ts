import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const runtime = 'nodejs'

interface CustomRow {
  agent_id: string
  name: string | null
  emoji: string | null
  description: string | null
  system_prompt: string | null
}

function keCamel(row: CustomRow) {
  return {
    agentId: row.agent_id,
    name: row.name ?? undefined,
    emoji: row.emoji ?? undefined,
    description: row.description ?? undefined,
    systemPrompt: row.system_prompt ?? undefined,
  }
}

// GET tanpa query -> semua kustomisasi (dipakai Sidebar, sekali fetch utk semua agent)
// GET ?agentId=x -> kustomisasi satu agent saja
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!sql) return NextResponse.json({ items: [] })

  try {
    const rows = agentId
      ? await sql<CustomRow[]>`SELECT * FROM agent_custom WHERE agent_id = ${agentId}`
      : await sql<CustomRow[]>`SELECT * FROM agent_custom`
    return NextResponse.json({ items: rows.map(keCamel) })
  } catch {
    return NextResponse.json({ items: [] })
  }
}

export async function POST(req: NextRequest) {
  const { agentId, name, emoji, description, systemPrompt } = await req.json()
  if (!agentId) return NextResponse.json({ error: 'agentId wajib diisi' }, { status: 400 })
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })

  try {
    await sql`
      INSERT INTO agent_custom (agent_id, name, emoji, description, system_prompt, updated_at)
      VALUES (${agentId}, ${name ?? null}, ${emoji ?? null}, ${description ?? null}, ${systemPrompt ?? null}, now())
      ON CONFLICT (agent_id) DO UPDATE SET
        name = EXCLUDED.name,
        emoji = EXCLUDED.emoji,
        description = EXCLUDED.description,
        system_prompt = EXCLUDED.system_prompt,
        updated_at = now()
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId wajib diisi' }, { status: 400 })
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })

  try {
    await sql`DELETE FROM agent_custom WHERE agent_id = ${agentId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: detail }, { status: 500 })
  }
}
