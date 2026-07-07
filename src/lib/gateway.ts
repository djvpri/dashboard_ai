export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Multimodal types
export interface TextPart {
  type: 'text'
  text: string
}

export interface ImagePart {
  type: 'image_url'
  image_url: { url: string }
}

export type ContentPart = TextPart | ImagePart

export interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finish_reason: string | null
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatCompletionChoice[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const GATEWAY_URL = (process.env.GATEWAY_URL || 'http://localhost:18789').trim().replace(/\/+$/, '')
const GATEWAY_TOKEN = (process.env.GATEWAY_TOKEN || '').trim()

/**
 * Proxy chat request through Next.js API (token stays server-side)
 *
 * systemPrompt opsional: override dari kustomisasi agent (localStorage) —
 * kalau tidak dikirim, server pakai default dari lib/agents.ts.
 */
export async function sendMessage(
  agentId: string,
  messages: ChatMessage[],
  onStream?: (chunk: string) => void,
  systemPrompt?: string,
  images?: string[] // base64 data URLs
): Promise<string> {
  // Build content: if images present, use ContentPart[] array
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  let bodyMessages = messages
  if (images && images.length > 0 && lastUserMsg) {
    const parts: ContentPart[] = [
      { type: 'text', text: lastUserMsg.content },
      ...images.map(img => ({ type: 'image_url' as const, image_url: { url: img } })),
    ]
    bodyMessages = messages.map(m =>
      m === lastUserMsg ? { ...m, content: parts } as unknown as ChatMessage : m
    )
  }

  const res = await fetch(`/api/chat?agentId=${agentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: bodyMessages, stream: !!onStream, systemPrompt }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Chat error (${res.status}): ${err}`)
  }

  // Streaming
  if (onStream && res.body) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content || ''
          if (content) {
            full += content
            onStream(content)
          }
        } catch { /* skip malformed */ }
      }
    }
    return full
  }

  // Non-streaming
  const data: ChatCompletionResponse = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Direct call to Gateway (used by API route)
 *
 * NOTE: saat ini tidak dipanggil dari mana pun di codebase (api/chat/route.ts
 * punya implementasi fetch sendiri) — dipertahankan untuk kompatibilitas ke
 * depan. GATEWAY_TOKEN harus sama dengan OPENCLAW_GATEWAY_TOKEN di sisi
 * clawdbot-railway-template (jalur /v1/* punya auth Bearer sendiri,
 * terpisah dari Basic Auth dashboard-nya).
 */
export async function directChat(
  agentId: string,
  messages: ChatMessage[],
  stream: boolean
): Promise<Response> {
  const token = process.env.GATEWAY_TOKEN || ''

  return fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openclaw',
      stream,
      messages,
    }),
  })
}
