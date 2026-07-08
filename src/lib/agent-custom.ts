'use client'

// Kustomisasi agent (nama, emoji, deskripsi/spesialisasi, system prompt)
// disimpan di server (Postgres, lewat /api/agent-custom) — tersinkron
// lintas browser/perangkat, bukan lagi per-browser seperti versi
// localStorage sebelumnya.
//
// Yang SENGAJA tidak bisa dikustomisasi: routing backend (id 'main' ->
// OpenClaw, id 'hermes' -> hermes-agent) — itu infrastruktur di sisi
// server (api/chat/route.ts), bukan kosmetik.

import { useState, useEffect } from 'react'
import { Agent, agents, getAgent } from './agents'

export interface AgentCustom {
  name?: string
  emoji?: string
  description?: string
  systemPrompt?: string
  quickPrompts?: string[]
}

const EVENT = 'zd-agent-custom-changed'

// Cache dua lapis: localStorage (sinkron, langsung tersedia saat mount) +
// server (async, diperbarui setelah fetch). Pola ini menghilangkan
// "kedipan" nama default yang muncul sebentar sebelum fetch server selesai.
const LS_KEY = 'zd_agent_custom_cache'

function bacaCacheLS(): Map<string, AgentCustom> {
  const map = new Map<string, AgentCustom>()
  if (typeof window === 'undefined') return map
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, AgentCustom>
      for (const [k, v] of Object.entries(obj)) map.set(k, v)
    }
  } catch {}
  return map
}

function tulisCacheLS(map: Map<string, AgentCustom>) {
  try {
    const obj: Record<string, AgentCustom> = {}
    for (const [k, v] of map.entries()) obj[k] = v
    localStorage.setItem(LS_KEY, JSON.stringify(obj))
  } catch {}
}

// Inisialisasi cache: kosong dulu (aman untuk SSR), diisi dari localStorage
// hanya setelah dipastikan berjalan di browser (typeof window !== 'undefined').
// Tidak bisa langsung panggil bacaCacheLS() di level modul karena modul ini
// dieksekusi di server saat SSR/hydration — localStorage tidak ada di sana.
const cache: Map<string, AgentCustom> = new Map()
let cacheInited = false
let sudahFetchSemua = false

function initCacheKalauBelum() {
  if (cacheInited || typeof window === 'undefined') return
  cacheInited = true
  // Baca dari localStorage ke cache in-memory
  for (const [k, v] of bacaCacheLS().entries()) cache.set(k, v)
}

function dariItem(item: {
  name?: string; emoji?: string; description?: string; systemPrompt?: string; quickPrompts?: string[]
}): AgentCustom {
  return {
    name: item.name || undefined,
    emoji: item.emoji || undefined,
    description: item.description || undefined,
    systemPrompt: item.systemPrompt || undefined,
    quickPrompts: Array.isArray(item.quickPrompts) ? item.quickPrompts : undefined,
  }
}

async function fetchSatu(agentId: string): Promise<AgentCustom> {
  try {
    const res = await fetch(`/api/agent-custom?agentId=${agentId}`)
    const data = await res.json()
    const custom = data.items?.[0] ? dariItem(data.items[0]) : {}
    cache.set(agentId, custom)
    return custom
  } catch {
    return cache.get(agentId) ?? {}
  }
}

async function fetchSemua(): Promise<void> {
  if (sudahFetchSemua) return
  try {
    const res = await fetch('/api/agent-custom')
    const data = await res.json()
    for (const item of data.items ?? []) {
      cache.set(item.agentId, dariItem(item))
    }
    // Simpan ke localStorage supaya render berikutnya tidak perlu tunggu
    // fetch server lagi — nama kustom langsung tersedia saat mount.
    tulisCacheLS(cache)
    sudahFetchSemua = true
  } catch {
    // Biarkan sudahFetchSemua tetap false -> percobaan berikutnya coba lagi.
  }
}

function umumkanPerubahan() {
  window.dispatchEvent(new Event(EVENT))
}

export async function simpanCustom(agentId: string, data: AgentCustom): Promise<void> {
  const bersih: AgentCustom = {}
  if (data.name?.trim()) bersih.name = data.name.trim()
  if (data.emoji?.trim()) bersih.emoji = data.emoji.trim()
  if (data.description?.trim()) bersih.description = data.description.trim()
  if (data.systemPrompt?.trim()) bersih.systemPrompt = data.systemPrompt.trim()
  // quickPrompts selalu disertakan (termasuk array kosong []) supaya
  // ON CONFLICT DO UPDATE tidak melewatkan kolom ini
  bersih.quickPrompts = Array.isArray(data.quickPrompts)
    ? data.quickPrompts.map(p => p.trim()).filter(Boolean)
    : []

  const res = await fetch('/api/agent-custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, ...bersih }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) {
    console.error('[simpanCustom] gagal:', json)
  }
  cache.set(agentId, bersih)
  tulisCacheLS(cache)
  umumkanPerubahan()
}

export async function resetCustom(agentId: string): Promise<void> {
  await fetch(`/api/agent-custom?agentId=${agentId}`, { method: 'DELETE' })
  cache.delete(agentId)
  tulisCacheLS(cache)
  umumkanPerubahan()
}

export function gabungkanAgent(dasar: Agent, custom: AgentCustom): Agent {
  return { ...dasar, ...custom }
}

// Hook: agent tunggal dengan kustomisasi diterapkan.
// useEffect+useState di sini SESUAI (bukan pelanggaran pola) — ini benar-
// benar async data fetching dari server, beda dengan versi localStorage
// sebelumnya yang synchronous (di situ useSyncExternalStore yang tepat).
export function useAgentTampil(agentId: string): Agent | undefined {
  const dasar = getAgent(agentId)
  const [custom, setCustom] = useState<AgentCustom>(() => {
    initCacheKalauBelum()
    return cache.get(agentId) ?? {}
  })

  useEffect(() => {
    let batal = false
    fetchSatu(agentId).then((c) => { if (!batal) setCustom(c) })
    const perbarui = () => setCustom(cache.get(agentId) ?? {})
    window.addEventListener(EVENT, perbarui)
    return () => {
      batal = true
      window.removeEventListener(EVENT, perbarui)
    }
  }, [agentId])

  if (!dasar) return undefined
  return gabungkanAgent(dasar, custom)
}

// Hook: semua agent dengan kustomisasi diterapkan (dipakai Sidebar).
export function useSemuaAgentTampil(): Agent[] {
  // initCacheKalauBelum() dipanggil di useState initializer supaya berjalan
  // sinkron sebelum render pertama — setState di render tidak boleh, tapi
  // membaca/mengisi cache (side effect ringan tanpa setState) aman di sini.
  const [, setTick] = useState(() => { initCacheKalauBelum(); return 0 })

  useEffect(() => {
    let batal = false
    fetchSemua().then(() => { if (!batal) setTick((t) => t + 1) })
    const perbarui = () => setTick((t) => t + 1)
    window.addEventListener(EVENT, perbarui)
    return () => {
      batal = true
      window.removeEventListener(EVENT, perbarui)
    }
  }, [])

  return agents.map((a) => gabungkanAgent(a, cache.get(a.id) ?? {}))
}

// Nilai FRESH langsung dari server (bukan cache) — dipakai AgentEditModal
// saat dibuka, supaya form terisi data terbaru meski diedit dari
// perangkat lain sebelumnya.
export async function ambilCustomFresh(agentId: string): Promise<AgentCustom> {
  return fetchSatu(agentId)
}

// Ambil dari cache saja (sinkron) — dipakai ChatWindow saat kirim pesan,
// tidak perlu fetch ulang tiap kirim karena useAgentTampil di komponen yang
// sama sudah pasti mengisi cache lebih dulu.
export function ambilCustomCache(agentId: string): AgentCustom {
  return cache.get(agentId) ?? {}
}
