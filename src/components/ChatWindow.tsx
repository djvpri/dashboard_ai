'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { sendMessage, ChatMessage } from '@/lib/gateway'
import { Agent } from '@/lib/agents'

const STORAGE_KEY = 'zd_chat_'

function loadHistory(agentId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + agentId)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveHistory(agentId: string, msgs: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY + agentId, JSON.stringify(msgs))
  } catch {}
}

interface ChatWindowProps {
  agent: Agent
}

export default function ChatWindow({ agent }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadHistory(agent.id)
    if (saved.length > 0) return saved
    return [{ role: 'assistant', content: `Halo! Aku **${agent.name}**. Ada yang bisa dibantu?` }]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Persist on change
  useEffect(() => {
    saveHistory(agent.id, messages)
  }, [agent.id, messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    inputRef.current?.focus()
  }, [agent.id])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    setStreamingContent('')

    try {
      let full = ''
      await sendMessage(
        agent.id,
        updated,
        (chunk) => {
          full += chunk
          setStreamingContent(full)
        }
      )
      setMessages((prev) => [...prev, { role: 'assistant', content: full }])
      setStreamingContent('')
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ Error: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, agent.id])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY + agent.id)
    setMessages([{ role: 'assistant', content: `Halo! Aku **${agent.name}**. Ada yang bisa dibantu?` }])
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <span className="text-2xl">{agent.emoji}</span>
        <div>
          <div className="font-semibold text-white">{agent.name}</div>
          <div className="text-xs text-zinc-500">{agent.description}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-zinc-500">Online</span>
          <button
            onClick={clearHistory}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors ml-2"
            title="Hapus riwayat chat"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-zinc-800 text-zinc-200 rounded-bl-md">
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

      <div className="p-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Chat dengan ${agent.name}...`}
            disabled={loading}
            className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-xl px-4 py-2.5 transition-colors"
          >
            {loading ? '...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  )
}
