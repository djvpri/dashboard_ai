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

    const agent = getAgent(agentId)
    const systemPrompt =
      typeof promptKustom === 'string' && promptKustom.trim()
        ? promptKustom.trim().slice(0, 8000)
        : agent?.systemPrompt

    // Tool injection untuk Hermes — fetch data DevOps ZPOS sebelum dikirim
    // ke Hermes sebagai konteks. Hermes berjalan di container Railway terpisah
    // dan tidak bisa langsung akses endpoint /api/tools/devops.
    let injectedMsgs = messages || []
    let injectedSystemPrompt: string | undefined
    if (injectedMsgs.length > 0) {
      const lastMsg = injectedMsgs[injectedMsgs.length - 1]
      const teks = (typeof lastMsg?.content === 'string' ? lastMsg.content : '').toLowerCase()
      const BASE = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')
      console.log('[tool-injection] BASE:', BASE, '| teks:', teks.slice(0, 80))

      async function fetchTool(body: Record<string, unknown>): Promise<Record<string, unknown>> {
        const r = await fetch(`${BASE}/api/tools/devops`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        return r.json()
      }

      function inject(konteks: string) {
        // Inject ke system prompt supaya Hermes memprioritaskan data ini
        // sebagai konteks resmi, bukan pesan user biasa yang bisa diabaikan
        injectedSystemPrompt = (injectedSystemPrompt || systemPrompt || '') +
          `\n\n=== DATA REAL-TIME (SUDAH DIAMBIL OTOMATIS) ===\n${konteks}\n=== ANALISIS DATA DI ATAS DAN JAWAB PERTANYAAN USER ===`
      }

      try {
        // Deteksi UUID deployment di pesan — fetch log langsung kalau ada UUID
        const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi
        const uuids = (typeof lastMsg.content === 'string' ? lastMsg.content : '').match(uuidRegex) || []
        const depId = uuids[0]

        if (depId && (teks.includes('log') || teks.includes('ambil') || teks.includes('error') || teks.includes('cek'))) {
          console.log('[tool-injection] action: logs by deploymentId', depId)
          const BASE2 = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '')
          const r = await fetch(`${BASE2}/api/tools/railway?action=logs&deploymentId=${depId}`)
          const d = await r.json() as Record<string, unknown>
          if (d.error) {
            inject(`[LOG ERROR] Gagal ambil log deployment ${depId.slice(0,8)}: ${d.error}`)
          } else {
            const errors = d.errors as string[] || []
            inject(`[LOG DEPLOYMENT ${depId.slice(0,8)}...]\nTotal lines: ${d.totalLines}\nError count: ${d.errorCount}\n\n${errors.length > 0 ? `ERRORS:\n${errors.slice(0,20).join('\n')}\n\n` : 'Tidak ada error.\n\n'}LOG TERBARU:\n${d.recentLogs || '(kosong)'}`)
          }
        } else if (teks.includes('semua project') || teks.includes('semua app') ||
            teks.includes('scan railway') || teks.includes('status semua') ||
            teks.includes('cek semua') || teks.includes('all project') ||
            teks.includes('railway status') || teks.includes('project railway') ||
            (teks.includes('railway') && teks.includes('status')) ||
            (teks.includes('railway') && teks.includes('semua'))) {
          console.log('[tool-injection] action: projects')
          const d = await fetchTool({ action: 'projects' })
          const failed = (d.projects as any[] || []).flatMap((p: any) =>
            p.services.filter((s: any) => s.status === 'FAILED').map((s: any) =>
              `❌ ${p.name} / ${s.name} (deploy: ${s.deployedAt?.slice(0,10)})`
            )
          )
          const success = (d.projects as any[] || []).flatMap((p: any) =>
            p.services.filter((s: any) => s.status === 'SUCCESS').map((s: any) =>
              `✅ ${p.name} / ${s.name}`
            )
          )
          inject(`[STATUS SEMUA PROJECT RAILWAY]\n\nFAILED (${failed.length}):\n${failed.join('\n') || 'tidak ada'}\n\nSUCCESS (${success.length}):\n${success.join('\n')}`)
        } else if (teks.includes('cek error') || teks.includes('error terbaru') || teks.includes('log zpos') || teks.includes('check error')) {
          console.log('[tool-injection] action: check_errors')
          const d = await fetchTool({ action: 'check_errors', lines: 300 })
          console.log('[tool-injection] result keys:', Object.keys(d), '| errorCount:', d.errorCount)
          inject(`[DATA RAILWAY ZPOS]\nStatus: ${d.deploymentStatus}\nError count: ${d.errorCount}\nErrors:\n${(d.errors as string[] || []).join('\n')}\n\nLog terbaru:\n${d.recentLogs}`)
        } else if (teks.includes('deployment') || teks.includes('deploy terakhir')) {
          console.log('[tool-injection] action: get_deployments')
          const d = await fetchTool({ action: 'get_deployments' })
          inject(`[DEPLOYMENT ZPOS]\n${JSON.stringify(d.deployments, null, 2)}`)
        } else if (teks.includes('commit') || teks.includes('perubahan terakhir')) {
          console.log('[tool-injection] action: get_commits')
          const d = await fetchTool({ action: 'get_commits' })
          inject(`[COMMIT TERAKHIR ZPOS]\n${(d.commits as { sha: string; date: string; author: string; message: string }[] || []).map(c => `${c.sha} | ${c.date?.slice(0, 10)} | ${c.author} | ${c.message}`).join('\n')}`)
        } else if (teks.includes('redeploy') || teks.includes('deploy ulang')) {
          // Deteksi service ID dari pesan (UUID) atau nama app
          const PROJECT_MAP: Record<string, { serviceId: string; environmentId?: string }> = {
            zgym: { serviceId: '794b65a8-e57d-4c46-bf56-591e1ac4ed4d' },
            zbengkel: { serviceId: '54e596fe-2661-41ea-ba37-a60576e0febd' },
            zresto: { serviceId: 'cba1d12b-9d7b-4639-90f6-193481f985b9' },
            zpos: { serviceId: 'f026c44d-60cd-4bb8-a277-a3cd9dec70a7', environmentId: 'eea0eae9-23a7-4611-845f-9cb6176cceaa' },
            ztransport: { serviceId: 'f6d82f7e-95df-4dc3-9557-eada4fd91d01' },
            zbarber: { serviceId: 'a1421b59-15d6-4e14-ac47-0fe86c11f680' },
          }
          const appKey = Object.keys(PROJECT_MAP).find(k => teks.includes(k))
          const uuidMatch = (lastMsg.content as string).match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
          const serviceId = uuidMatch?.[1] || (appKey ? PROJECT_MAP[appKey].serviceId : null)
          const environmentId = appKey ? PROJECT_MAP[appKey].environmentId : undefined

          if (serviceId) {
            console.log('[tool-injection] action: redeploy', serviceId)
            const d = await fetchTool({ action: 'redeploy', serviceId, environmentId })
            inject(`[REDEPLOY RAILWAY]\n${d.ok ? `✅ ${d.message}` : `❌ Gagal: ${d.error}`}`)
          } else {
            inject(`[REDEPLOY] Tidak dapat mendeteksi service mana yang mau di-redeploy. Sebutkan nama app (zgym, zbengkel, dll) atau service ID-nya.`)
          }
        } else {
          console.log('[tool-injection] tidak ada kata kunci cocok')
        }
      } catch (e) {
        console.error('[tool-injection] gagal:', e instanceof Error ? e.message : e)
      }
    }

    // Inject system prompt — pakai versi yang sudah ditambah data real-time kalau ada
    const finalSystemPrompt = injectedSystemPrompt || systemPrompt
    const finalMsgs = finalSystemPrompt
      ? [{ role: 'system', content: finalSystemPrompt } as const, ...injectedMsgs]
      : injectedMsgs

    const body: Record<string, unknown> = {
      model: backend.model,
      stream: !!stream,
      messages: finalMsgs,
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
