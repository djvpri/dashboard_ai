import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'

// Backend OpenClaw (agent Ojamet):
// clawdbot-railway-template memberi /v1/* jalur auth SENDIRI (Bearer +
// OPENCLAW_GATEWAY_TOKEN, BUKAN SETUP_PASSWORD).
const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:18789').trim().replace(/\/+$/, '')
const GATEWAY_TOKEN = (process.env.GATEWAY_TOKEN || '').trim()

// Backend hermes-agent (agent Hermes):
// API server OpenAI-compatible bawaan hermes-agent (API_SERVER_ENABLED=true,
// port default 8642) — auth Bearer dengan nilai API_SERVER_KEY di sisi hermes.
const HERMES_API_URL = (process.env.HERMES_API_URL || '').trim().replace(/\/+$/, '')
const HERMES_API_KEY = (process.env.HERMES_API_KEY || '').trim()

interface BackendTarget {
  url: string
  token: string
  model: string
  label: string
}

// Tiap agent diarahkan ke backend-nya sendiri — sebelumnya SEMUA agent
// (termasuk 'Hermes') dijawab gateway OpenClaw yang sama dengan model
// 9router/OJAMET; 'Hermes' cuma beda system prompt, bukan hermes-agent
// sungguhan.
function pilihBackend(agentId: string, backendHint?: string): BackendTarget | { error: string } {
  // Agent kustom dari UI bisa kasih backend hint ('openclaw' atau 'hermes')
  // lewat header x-agent-backend dari ChatWindow
  const backend = backendHint || (agentId === 'hermes' ? 'hermes' : 'openclaw')

  if (backend === 'hermes') {
    if (!HERMES_API_URL || !HERMES_API_KEY) {
      return {
        error:
          'Agent Hermes belum dikonfigurasi — isi env HERMES_API_URL & HERMES_API_KEY ' +
          '(API server hermes-agent, aktifkan dengan API_SERVER_ENABLED=true + API_SERVER_KEY di service hermes-agent).',
      }
    }
    return { url: HERMES_API_URL, token: HERMES_API_KEY, model: 'hermes-agent', label: 'hermes' }
  }
  return { url: GATEWAY_URL, token: GATEWAY_TOKEN, model: 'openclaw', label: 'openclaw' }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId') || 'main'
  const backendHint = req.headers.get('x-agent-backend') || undefined
  const backend = pilihBackend(agentId, backendHint)

  if ('error' in backend) {
    return new Response(JSON.stringify({ error: backend.error }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { messages, stream, systemPrompt: promptKustom } = await req.json()

    // Override system prompt dari kustomisasi agent di sisi client
    // (localStorage) — aman untuk dashboard pribadi satu pengguna yang
    // sudah di belakang login; dibatasi panjangnya supaya tidak bisa
    // dipakai membanjiri context backend secara tidak sengaja.
    const agent = getAgent(agentId)
    const systemPrompt =
      typeof promptKustom === 'string' && promptKustom.trim()
        ? promptKustom.trim().slice(0, 8000)
        : agent?.systemPrompt

    // Inject system prompt as first message
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt } as const, ...(messages || [])]
      : (messages || [])

    const body: Record<string, unknown> = {
      model: backend.model,
      stream: !!stream,
      messages: msgs,
    }
    if (agent?.toolsets) body.toolsets = agent.toolsets

    const gwRes = await fetch(`${backend.url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${backend.token}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      },
      body: JSON.stringify(body),
    })

    if (!gwRes.ok) {
      const errText = await gwRes.text()
      return new Response(errText, { status: gwRes.status })
    }

    if (stream) {
      return new Response(gwRes.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    const data = await gwRes.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const e = err as Error & { cause?: { message?: string; code?: string } }
    const detail = e?.cause?.message || e?.cause?.code || String(e?.cause || '')
    return new Response(JSON.stringify({ error: e.message, detail, backend: backend.label, url: backend.url }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
