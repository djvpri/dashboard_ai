'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSemuaAgentTampil } from '@/lib/agent-custom'
import AgentEditModal from './AgentEditModal'

export default function Sidebar() {
  const pathname = usePathname()
  const activeId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null
  const agents = useSemuaAgentTampil()
  const [editId, setEditId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - fixed on desktop, drawer on mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <span className="font-semibold text-white">Z-Dashboard</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
            aria-label="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* Agent List */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {agents.map((agent) => {
            const isActive = activeId === agent.id
            return (
              <div key={agent.id} className="relative group">
                <Link
                  href={`/chat/${agent.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span className="text-lg">{agent.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{agent.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{agent.description}</div>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setEditId(agent.id)
                  }}
                  title={`Edit ${agent.name}`}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity lg:opacity-100"
                >
                  ✏️
                </button>
              </div>
            )
          })}
        </nav>

        {editId && <AgentEditModal agentId={editId} onClose={() => setEditId(null)} />}
      </aside>
    </>
  )
}
