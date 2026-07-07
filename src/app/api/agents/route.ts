import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export const runtime = 'nodejs'

interface AgentRow {
  id: string
  name: string
  emoji: string
  description: string
  backend: string
  system_prompt: string
  sort_order: number
  created_at: string
}

function keAgent(row: AgentRow) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    description: row.description,
    backend: row.backend,
    systemPrompt: row.system_prompt,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

function buatId(): string {
  // Slug pendek yang aman sebagai React key & URL query param
  return 'agent_' + Math.random().toString(36).slice(2, 9)
}

// GET — ambil semua agent kustom, urut by sort_order lalu created_at
export async function GET() {
  if (!sql) return NextResponse.json({ agents: [] })
  try {
    const rows = await sql<AgentRow[]>`
      SELECT * FROM custom_agents ORDER BY sort_order ASC, created_at ASC
    `
    return NextResponse.json({ agents: rows.map(keAgent) })
  } catch {
    return NextResponse.json({ agents: [] })
  }
}

// POST — buat agent baru
export async function POST(req: NextRequest) {
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })
  const { name, emoji, description, backend, systemPrompt } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  const id = buatId()
  try {
    await sql`
      INSERT INTO custom_agents (id, name, emoji, description, backend, system_prompt, sort_order)
      VALUES (
        ${id},
        ${name.trim()},
        ${(emoji || '🤖').trim()},
        ${(description || '').trim()},
        ${backend === 'hermes' ? 'hermes' : 'openclaw'},
        ${(systemPrompt || '').trim()},
        (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM custom_agents)
      )
    `
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// PUT — update agent kustom (nama, emoji, deskripsi, backend, system prompt)
export async function PUT(req: NextRequest) {
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })
  const { id, name, emoji, description, backend, systemPrompt } = await req.json()
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })

  try {
    const result = await sql`
      UPDATE custom_agents SET
        name = ${name.trim()},
        emoji = ${(emoji || '🤖').trim()},
        description = ${(description || '').trim()},
        backend = ${backend === 'hermes' ? 'hermes' : 'openclaw'},
        system_prompt = ${(systemPrompt || '').trim()},
        updated_at = now()
      WHERE id = ${id}
    `
    if (result.count === 0) return NextResponse.json({ ok: false, error: 'Agent tidak ditemukan' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// DELETE — hapus agent kustom (beserta riwayat chatnya)
export async function DELETE(req: NextRequest) {
  if (!sql) return NextResponse.json({ ok: false, error: 'Database belum dikonfigurasi' }, { status: 503 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  try {
    // Hapus riwayat chat sekalian supaya tidak ada orphan rows
    await sql`DELETE FROM chat_history WHERE agent_id = ${id}`
    await sql`DELETE FROM custom_agents WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
