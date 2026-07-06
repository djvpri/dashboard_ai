import { NextRequest } from 'next/server'
import { getAgent } from '@/lib/agents'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:18789'
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || ''

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId') || 'main'
    const { messages, stream } = await req.json()

    const agent = getAgent(agentId)
    const systemPrompt = agent?.systemPrompt

    // Inject system prompt as first message
    const msgs = systemPrompt
      ? [{ role: 'system', content: systemPrompt } as const, ...(messages || [])]
      : (messages || [])

    const gwRes = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
        'x-openclaw-agent-id': agentId,
      },
      body: JSON.stringify({
        model: 'openclaw',
        stream: !!stream,
        messages: msgs,
      }),
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
  } catch (err: any) {
    const detail = err?.cause?.message || err?.cause?.code || String(err?.cause || '')
    return new Response(JSON.stringify({ error: err.message, detail, gatewayUrl: GATEWAY_URL }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
