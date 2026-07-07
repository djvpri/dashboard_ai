'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { sendMessage, ChatMessage, ContentPart } from '@/lib/gateway'
import { Agent } from '@/lib/agents'
import { useAgentTampil, ambilCustomCache } from '@/lib/agent-custom'

interface ChatWindowProps {
  agent: Agent
}

/** Extract first text + all images from a content (string or ContentPart[]) */
function extractContent(
  content: string | ContentPart[]
): { text: string; images: string[] } {
  if (typeof content === 'string') return { text: content, images: [] }
  const text = content.find((p) => p.type === 'text')?.text || ''
  const images = content
    .filter((p): p is { type: 'image_url'; image_url: { url: string } } => p.type === 'image_url')
    .map((p) => p.image_url.url)
  return { text, images }
}

function pesanSapaan(nama: string): ChatMessage {
  return { role: 'assistant', content: `Halo! Aku **${nama}**. Ada yang bisa dibantu?` }
}

export default function ChatWindow({ agent: agentDasar }: ChatWindowProps) {
  // Tampilan (nama/emoji/deskripsi) memakai versi kustom dari server;
  // agentDasar.id tetap dipakai untuk riwayat & routing backend.
  const agent: Agent = useAgentTampil(agentDasar.id) ?? agentDasar
  const [messages, setMessages] = useState<ChatMessage[]>(() => [pesanSapaan(agentDasar.name)])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [pastedImages, setPastedImages] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Riwayat sekarang disimpan di server (Postgres), tersinkron lintas
  // browser/perangkat — bukan lagi localStorage per-browser.
  useEffect(() => {
    let batal = false
    setHistoryLoaded(false)
    fetch(`/api/history?agentId=${agentDasar.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (batal) return
        setMessages(data.messages?.length > 0 ? data.messages : [pesanSapaan(agentDasar.name)])
        setHistoryLoaded(true)
      })
      .catch(() => { if (!batal) setHistoryLoaded(true) })
    return () => { batal = true }
  }, [agentDasar.id, agentDasar.name])

  // Simpan ke server tiap kali riwayat berubah — TAPI hanya setelah fetch
  // awal selesai (historyLoaded), supaya sapaan sementara di render
  // pertama tidak keburu menimpa riwayat asli sebelum sempat dimuat.
  useEffect(() => {
    if (!historyLoaded) return
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agentDasar.id, messages }),
    }).catch(() => {})
  }, [agentDasar.id, messages, historyLoaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    inputRef.current?.focus()
  }, [agentDasar.id])

  /** Read a File (image) → base64 data URL */
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /** Handle paste from clipboard */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) imageFiles.push(f)
      }
    }

    if (imageFiles.length === 0) return

    e.preventDefault()
    const urls = await Promise.all(imageFiles.map(fileToDataURL))
    setPastedImages((prev) => [...prev, ...urls])
  }, [])

  /** Handle file upload button */
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const urls = await Promise.all(imageFiles.map(fileToDataURL))
    setPastedImages((prev) => [...prev, ...urls])
    // Reset so same file can be re-selected
    e.target.value = ''
  }, [])

  const removeImage = useCallback((idx: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if ((!text && pastedImages.length === 0) || loading) return

    // Build user message content
    const hasImages = pastedImages.length > 0
    const userContent: string | ContentPart[] = hasImages
      ? [
          { type: 'text', text },
          ...pastedImages.map((img) => ({ type: 'image_url' as const, image_url: { url: img } })),
        ]
      : text

    const userMsg: ChatMessage = { role: 'user', content: userContent as ChatMessage['content'] }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setPastedImages([])
    setLoading(true)
    setStreamingContent('')

    try {
      let full = ''
      const custom = ambilCustomCache(agentDasar.id)
      await sendMessage(
        agentDasar.id,
        updated,
        (chunk) => {
          full += chunk
          setStreamingContent(full)
        },
        custom.systemPrompt,
        hasImages ? pastedImages : undefined,
        agentDasar.backend // undefined untuk agent bawaan, 'openclaw'/'hermes' untuk agent kustom
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: full }])
      setStreamingContent('')
    } catch (err) {
      const pesan = err instanceof Error ? err.message : String(err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${pesan}` },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, agentDasar.id, pastedImages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearHistory = () => {
    const sapaan = [pesanSapaan(agent.name)]
    setMessages(sapaan)
    // historyLoaded sudah true di titik ini (tombol cuma tampil setelah
    // chat termuat), jadi effect persist di atas otomatis menyimpan ini.
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-2xl">{agent.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{agent.name}</div>
          <div className="text-xs text-zinc-500 truncate">{agent.description}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-zinc-500 hidden sm:inline">Online</span>
          <button
            onClick={clearHistory}
            className="p-2 text-zinc-500 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
            title="Hapus riwayat chat"
            aria-label="Hapus riwayat chat"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {messages.map((msg, i) => {
          const { text, images } = extractContent(msg.content)
          return (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                }`}
              >
                {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {images.map((img, j) => (
                      <img
                        key={j}
                        src={img}
                        alt={`Gambar ${j + 1}`}
                        className="max-w-[280px] max-h-[280px] rounded-lg object-cover border border-zinc-700"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-2.5 bg-zinc-800 text-zinc-200 rounded-bl-md">
              <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
            </div>
          </div>
        )}

        {loading && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image preview strip */}
      {pastedImages.length > 0 && (
        <div className="px-4 pt-2 bg-zinc-900 border-t border-zinc-800">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {pastedImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <img
                  src={img}
                  alt={`Preview ${i + 1}`}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg border border-zinc-700"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-400"
                  aria-label={`Hapus gambar ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-zinc-800 bg-zinc-900 safe-area-inset-bottom">
        <div className="flex gap-2">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-shrink-0 p-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-400 rounded-xl text-sm transition-colors min-w-[44px]"
            title="Upload gambar"
            aria-label="Upload gambar"
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={`Chat dengan ${agent.name}...`}
            disabled={loading}
            className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-h-[44px]"
          />
          <button
            onClick={handleSend}
            disabled={loading || (!input.trim() && pastedImages.length === 0)}
            className="flex-shrink-0 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-xl transition-colors min-w-[44px]"
          >
            {loading ? '...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  )
}
