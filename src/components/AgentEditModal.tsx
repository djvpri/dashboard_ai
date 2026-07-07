'use client'

import { useState } from 'react'
import { Agent, getAgent } from '@/lib/agents'
import { ambilCustom, simpanCustom, resetCustom } from '@/lib/agent-custom'

interface Props {
  agentId: string
  onClose: () => void
}

export default function AgentEditModal({ agentId, onClose }: Props) {
  const dasar: Agent | undefined = getAgent(agentId)
  // Lazy initializer (bukan useEffect): modal ini selalu di-mount baru
  // setiap kali dibuka (dirender kondisional oleh Sidebar), jadi nilai
  // awal form cukup dibaca sekali saat mount.
  const [name, setName] = useState(() => ambilCustom(agentId).name ?? dasar?.name ?? '')
  const [emoji, setEmoji] = useState(() => ambilCustom(agentId).emoji ?? dasar?.emoji ?? '')
  const [description, setDescription] = useState(
    () => ambilCustom(agentId).description ?? dasar?.description ?? ''
  )
  const [systemPrompt, setSystemPrompt] = useState(
    () => ambilCustom(agentId).systemPrompt ?? dasar?.systemPrompt ?? ''
  )

  if (!dasar) return null

  function simpan() {
    if (!dasar) return
    // Nilai yang sama dengan default tidak perlu disimpan sebagai kustom —
    // biar reset default resmi (kalau nanti diubah di kode) tetap mengalir.
    simpanCustom(agentId, {
      name: name !== dasar.name ? name : undefined,
      emoji: emoji !== dasar.emoji ? emoji : undefined,
      description: description !== dasar.description ? description : undefined,
      systemPrompt: systemPrompt !== dasar.systemPrompt ? systemPrompt : undefined,
    })
    onClose()
  }

  function kembalikanDefault() {
    if (!confirm('Kembalikan agent ini ke pengaturan bawaan?')) return
    resetCustom(agentId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-700 p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Edit Agent</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex gap-3">
          <div className="w-20">
            <label className="text-xs text-zinc-400 block mb-1">Emoji</label>
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-lg outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-1">Nama</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Spesialisasi (deskripsi singkat)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="mis. Coding & eksperimen"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">
            System prompt (kepribadian & keahlian — dikirim setiap chat)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-y"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={kembalikanDefault}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            Kembalikan ke default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={simpan}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          Tersimpan di browser ini saja (seperti riwayat chat). Backend tiap agent
          (Ojamet → OpenClaw, Hermes → hermes-agent) tidak berubah dari sini.
        </p>
      </div>
    </div>
  )
}
