'use client'

// Kustomisasi agent (nama, emoji, deskripsi/spesialisasi, system prompt)
// disimpan di localStorage — konsisten dengan pola riwayat chat yang sudah
// ada di app ini, tanpa perlu database. Konsekuensinya sama dengan riwayat:
// per-browser (ganti perangkat = kembali default), tapi untuk dashboard
// pribadi satu pengguna itu trade-off yang wajar.
//
// Yang SENGAJA tidak bisa dikustomisasi: routing backend (id 'main' ->
// OpenClaw, id 'hermes' -> hermes-agent) — itu infrastruktur di sisi
// server (api/chat/route.ts), bukan kosmetik.

import { useSyncExternalStore } from 'react'
import { Agent, agents, getAgent } from './agents'

const CUSTOM_KEY = 'zd_agent_custom_'

export interface AgentCustom {
  name?: string
  emoji?: string
  description?: string
  systemPrompt?: string
}

// ===== penyimpanan =====

function bacaCustom(agentId: string): AgentCustom {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CUSTOM_KEY + agentId)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function simpanCustom(agentId: string, data: AgentCustom) {
  const bersih: AgentCustom = {}
  if (data.name?.trim()) bersih.name = data.name.trim()
  if (data.emoji?.trim()) bersih.emoji = data.emoji.trim()
  if (data.description?.trim()) bersih.description = data.description.trim()
  if (data.systemPrompt?.trim()) bersih.systemPrompt = data.systemPrompt.trim()

  try {
    if (Object.keys(bersih).length === 0) {
      localStorage.removeItem(CUSTOM_KEY + agentId)
    } else {
      localStorage.setItem(CUSTOM_KEY + agentId, JSON.stringify(bersih))
    }
  } catch {}
  umumkanPerubahan()
}

export function resetCustom(agentId: string) {
  try {
    localStorage.removeItem(CUSTOM_KEY + agentId)
  } catch {}
  umumkanPerubahan()
}

// ===== reaktivitas (supaya Sidebar & ChatWindow ikut berubah seketika) =====

const EVENT = 'zd-agent-custom-changed'

function umumkanPerubahan() {
  window.dispatchEvent(new Event(EVENT))
}

// ===== gabungan default + kustom =====

export function gabungkanAgent(dasar: Agent): Agent {
  const custom = bacaCustom(dasar.id)
  return { ...dasar, ...custom }
}

// ===== store untuk useSyncExternalStore =====
// Snapshot HARUS mengembalikan referensi yang stabil di antara perubahan
// (kalau tidak, React re-render tanpa henti) — makanya hasil gabungan
// di-cache dan cache dibatalkan saat ada perubahan.
//
// Hydration-safe: saat hydration React memakai snapshot SERVER (default
// murni, sama dengan HTML server) lalu setelah mount otomatis membaca
// snapshot client (dengan kustomisasi) dan re-render kalau berbeda —
// tidak ada hydration mismatch, tanpa perlu setState manual di effect.

let cacheSemua: Agent[] | null = null
const cacheSatu = new Map<string, Agent>()

function batalkanCache() {
  cacheSemua = null
  cacheSatu.clear()
}

function subscribe(cb: () => void) {
  const wrapper = () => {
    batalkanCache()
    cb()
  }
  window.addEventListener(EVENT, wrapper)
  // storage event menangkap perubahan dari tab lain
  window.addEventListener('storage', wrapper)
  return () => {
    window.removeEventListener(EVENT, wrapper)
    window.removeEventListener('storage', wrapper)
  }
}

function snapshotSemua(): Agent[] {
  if (!cacheSemua) cacheSemua = agents.map(gabungkanAgent)
  return cacheSemua
}

function snapshotSemuaServer(): Agent[] {
  return agents // konstanta modul — referensi stabil
}

function snapshotSatu(agentId: string): Agent | undefined {
  const dasar = getAgent(agentId)
  if (!dasar) return undefined
  let hasil = cacheSatu.get(agentId)
  if (!hasil) {
    hasil = gabungkanAgent(dasar)
    cacheSatu.set(agentId, hasil)
  }
  return hasil
}

// Hook: agent tunggal dengan kustomisasi diterapkan, reaktif terhadap
// perubahan (dari modal edit maupun tab lain via storage event).
export function useAgentTampil(agentId: string): Agent | undefined {
  return useSyncExternalStore(
    subscribe,
    () => snapshotSatu(agentId),
    () => getAgent(agentId)
  )
}

// Hook: semua agent dengan kustomisasi diterapkan.
export function useSemuaAgentTampil(): Agent[] {
  return useSyncExternalStore(subscribe, snapshotSemua, snapshotSemuaServer)
}

// Ambil kustomisasi mentah (untuk isi awal form edit).
export function ambilCustom(agentId: string): AgentCustom {
  return bacaCustom(agentId)
}
