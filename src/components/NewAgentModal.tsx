'use client'

import { useState } from 'react'
import { Agent, customAgentKeAgent } from '@/lib/agents'

interface Props {
  // kalau ada initialData -> mode edit; kalau null -> mode buat baru
  initialData?: {
    id: string
    name: string
    emoji: string
    description: string
    backend: string
    systemPrompt: string
    quickPrompts?: string[]
  } | null
  onSave: (agent: Agent) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

const BACKEND_OPTIONS = [
  { value: 'openclaw', label: '🦾 OpenClaw (Ojamet)', desc: 'Model 9router/OJAMET, cocok untuk chat umum' },
  { value: 'hermes', label: '⚡ Hermes Agent', desc: 'Model hermes-agent, cocok untuk coding & teknis' },
]

export default function NewAgentModal({ initialData, onSave, onDelete, onClose }: Props) {
  const isEdit = !!initialData
  const [name, setName] = useState(initialData?.name ?? '')
  const [emoji, setEmoji] = useState(initialData?.emoji ?? '🤖')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [backend, setBackend] = useState(initialData?.backend ?? 'openclaw')
  const [systemPrompt, setSystemPrompt] = useState(initialData?.systemPrompt ?? '')
  const [quickPrompts, setQuickPrompts] = useState<string[]>(initialData?.quickPrompts ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function simpan() {
    if (!name.trim()) { setError('Nama wajib diisi'); return }
    setSaving(true)
    setError('')
    try {
      const body = { name: name.trim(), emoji: emoji.trim() || '🤖', description: description.trim(), backend, systemPrompt: systemPrompt.trim(), quickPrompts: quickPrompts.filter(Boolean) }
      const res = await fetch(
        isEdit ? '/api/agents' : '/api/agents',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isEdit ? { id: initialData!.id, ...body } : body),
        }
      )
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Gagal menyimpan'); return }

      const id = isEdit ? initialData!.id : data.id
      onSave(customAgentKeAgent({ id, ...body }))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  async function hapus() {
    if (!initialData || !onDelete) return
    if (!confirm(`Hapus agent "${initialData.name}"? Riwayat chat-nya juga akan dihapus.`)) return
    setSaving(true)
    try {
      await fetch(`/api/agents?id=${initialData.id}`, { method: 'DELETE' })
      onDelete(initialData.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-700 p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{isEdit ? 'Edit Agent' : 'Buat Agent Baru'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Emoji + Nama */}
        <div className="flex gap-3">
          <div className="w-20">
            <label className="text-xs text-zinc-400 block mb-1">Emoji</label>
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-lg outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-1">Nama <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="mis. Asisten Zomet"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Deskripsi */}
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Spesialisasi (deskripsi singkat)</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="mis. Asisten khusus ekosistem Zomet"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        {/* Backend */}
        <div>
          <label className="text-xs text-zinc-400 block mb-2">Backend AI</label>
          <div className="flex flex-col gap-2">
            {BACKEND_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${backend === opt.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500'}`}>
                <input type="radio" name="backend" value={opt.value} checked={backend === opt.value} onChange={() => setBackend(opt.value)} className="mt-0.5 accent-indigo-500" />
                <div>
                  <div className="text-sm font-medium text-white">{opt.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-xs text-zinc-400 block mb-1">System prompt (kepribadian & keahlian)</label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            rows={5}
            placeholder="Kamu adalah [nama], asisten AI yang..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-y"
          />
        </div>

        {/* Quick Prompts */}
        <div>
          <label className="text-xs text-zinc-400 block mb-1.5">
            Template chat (chip di atas input saat chat baru, maks 6)
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

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Tombol */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {isEdit && onDelete ? (
            <button onClick={hapus} disabled={saving} className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50">
              Hapus agent ini
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50">
              Batal
            </button>
            <button onClick={simpan} disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50">
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Buat Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
