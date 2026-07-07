'use client'

import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import { Agent } from '@/lib/agents'

interface ChatPageClientProps {
  agent: Agent
}

export default function ChatPageClient({ agent }: ChatPageClientProps) {

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 lg:flex-1">
        <ChatWindow key={agent.id} agent={agent} />
      </main>
    </div>
  )
}