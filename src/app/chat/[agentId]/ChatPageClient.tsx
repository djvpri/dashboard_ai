'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import { Agent } from '@/lib/agents'

interface ChatPageClientProps {
  agent: Agent
}

export default function ChatPageClient({ agent }: ChatPageClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

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