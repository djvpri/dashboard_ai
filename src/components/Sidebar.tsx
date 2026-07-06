'use client'

import { agents } from '@/lib/agents'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const activeId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null

  return (
    <aside className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-semibold text-white">Z-Dashboard</span>
        </Link>
      </div>

      {/* Agent List */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {agents.map((agent) => {
          const isActive = activeId === agent.id
          return (
            <Link
              key={agent.id}
              href={`/chat/${agent.id}`}
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
          )
        })}
      </nav>
    </aside>
  )
}
