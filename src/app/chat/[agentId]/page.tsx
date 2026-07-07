'use client'

import { notFound } from 'next/navigation'
import { getAgent } from '@/lib/agents'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default async function ChatPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params
  const agent = getAgent(agentId)
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!agent) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-zinc-400">Agent "{agentId}" tidak ditemukan</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      {/* Mobile hamburger button - only visible on mobile */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white shadow-lg"
        aria-label="Buka sidebar"
      >
        ☰
      </button>

      <main className="flex-1 lg:flex-1">
        <ChatWindow key={agent.id} agent={agent} />
      </main>
    </div>
  )
}
