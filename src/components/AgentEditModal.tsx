'use client'

import { useState, useEffect } from 'react'
import { Agent, getAgent } from '@/lib/agents'
import { ambilCustomFresh, simpanCustom, resetCustom } from '@/lib/agent-custom'

interface Props {
  agentId: string
  onClose: () => void
}

export default function AgentEditModal({ agentId, onClose }: Props) {
  const dasar: Agent | undefined = getAgent(agentId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [quickPrompts, setQuickPrompts] = useState<string[]>([])

  // Nilai FRESH dari server tiap modal dibuka — bukan cache — supaya form
  // terisi data terbaru meski diedit dari perangkat lain sebelumnya.
  useEffect(() => {
    if (!dasar) return
    let batal = false
    setLoading(true)
    ambilCustomFresh(agentId).then((custom) => {
      if (batal) return
      setName(custom.name ?? dasar.name)
      setEmoji(custom.emoji ?? dasar.emoji)
      setDescription(custom.description ?? dasar.description)
      setSystemPrompt(custom.systemPrompt ?? dasar.systemPrompt)
      setQuickPrompts(custom.quickPrompts ?? [])
      setLoading(false)
    })
    return () => { batal = true }
  }, [agentId, dasar])

  if (!dasar) return null

  async function simpan() {
    if (!dasar) return
    setSaving(true)
    try {
      // Kirim semua field — simpanCustom yang akan handle mana yang
      // benar-benar perlu disimpan vs default
      await simpanCustom(agentId, {
        name,
        emoji,
        description,
        systemPrompt,
        quickPrompts,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function kembalikanDefault() {
    if (!confirm('Kembalikan agent ini ke pengaturan bawaan?')) return
    setSaving(true)
    try {
      await resetCustom(agentId)
      onClose()
    } finally {
      setSaving(false)
    }
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

        {loading ? (
          <div className="py-8 text-center text-sm text-zinc-500">Memuat...</div>
        ) : (
          <>
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

            {/* Quick Prompts */}
            <div>
              <label className="text-xs text-zinc-400 block mb-1.5">
                Template chat (muncul sebagai chip saat chat kosong, maks 6)
              </label>
              <div className="space-y-2">
                {quickPrompts.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={p}
                      onChange={e => {
                        const baru = [...quickPrompts]
                        baru[i] = e.target.value
                        setQuickPrompts(baru)
                      }}
                      placeholder={`Template ${i + 1}`}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => setQuickPrompts(quickPrompts.filter((_, j) => j !== i))}
                      className="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none px-1"
                    >×</button>
                  </div>
                ))}
                {quickPrompts.length < 6 && (
                  <button
                    onClick={() => setQuickPrompts([...quickPrompts, ''])}
                    className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                  >
                    <span className="text-base">+</span> Tambah template
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={kembalikanDefault}
                disabled={saving}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                Kembalikan ke default
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={simpan}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Tersimpan di server — sinkron di semua browser/perangkat. Backend tiap agent
              (Ojamet → OpenClaw, Hermes → hermes-agent) tidak berubah dari sini.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
