'use client'

import Sidebar from '@/components/Sidebar'
import { agents } from '@/lib/agents'
import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white shadow-lg"
        aria-label="Buka sidebar"
      >
        ☰
      </button>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 safe-area-inset-bottom safe-area-inset-top">
        <div className="text-center mb-8 w-full">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Z-Dashboard</h1>
          <p className="text-zinc-400">Pilih AI agent untuk mulai chatting</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/chat/${agent.id}`}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-4 p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group min-h-[80px]"
            >
              <span className="text-3xl sm:text-4xl flex-shrink-0">{agent.emoji}</span>
              <div className="min-w-0">
                <div className="font-semibold text-base sm:text-lg text-white group-hover:text-indigo-400 transition-colors truncate">
                  {agent.name}
                </div>
                <div className="text-sm text-zinc-500 truncate">{agent.description}</div>
                <div className="text-xs text-zinc-600 mt-1">{agent.model}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
