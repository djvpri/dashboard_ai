'use client'

import Sidebar from '@/components/Sidebar'
import { agents } from '@/lib/agents'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Z-Dashboard</h1>
          <p className="text-zinc-400">Pilih AI agent untuk mulai chatting</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/chat/${agent.id}`}
              className="flex items-center gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <span className="text-4xl">{agent.emoji}</span>
              <div>
                <div className="font-semibold text-lg text-white group-hover:text-indigo-400 transition-colors">
                  {agent.name}
                </div>
                <div className="text-sm text-zinc-500">{agent.description}</div>
                <div className="text-xs text-zinc-600 mt-1">{agent.model}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
